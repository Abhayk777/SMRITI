import type { SupabaseClient } from '@supabase/supabase-js';

import { optionsResponse } from '../_shared/cors.ts';
import { mod1440, minutesOfDayInTz } from '../_shared/escalation.ts';
import {
  errorResponse,
  handleError,
  jsonResponse,
  methodNotAllowedResponse,
} from '../_shared/http.ts';
import { secretsEqual } from '../_shared/signatures.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import {
  type ProviderDispatchResult,
  sendSmsWithResult,
} from '../_shared/twilio.ts';
import { watchdogBodySchema } from '../_shared/types.ts';

const GRACE_MIN = 45;
const MAX_OVERDUE_MIN = 240;
const REMINDER_TOLERANCE_MS = 5 * 60_000;

const WEEKDAY_NUMBER: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

type PatientRow = {
  id: string;
  display_name: string;
  timezone: string;
  device_last_seen_at: string | null;
};

type MedicationRow = {
  id: string;
  patient_id: string;
  chosen_time_min: number;
  days_of_week: string;
};

type ReminderRow = {
  patient_id: string;
  medication_id: string;
  scheduled_at: number;
};

type EscalationConfigRow = {
  patient_id: string;
  primary_phone: string;
  secondary_phone: string | null;
};

type OfflineFlagRow = {
  id: string;
  patient_id: string;
  severity: 'info' | 'moderate' | 'high';
};

type MissedMedication = {
  id: string;
  patient_id: string;
  medication_id: string;
  scheduled_date: string;
  scheduled_at: number;
  slot: number;
};

type NotificationResult = {
  contact: 'primary' | 'secondary';
  result: ProviderDispatchResult;
};

type DeviceHealthResult = {
  patient_id: string;
  hours_offline: number;
  action: 'flagged' | 'escalated' | 'already_flagged' | 'race_lost';
  severity: 'moderate' | 'high';
  notifications: NotificationResult[];
};

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function zonedParts(epochMs: number, timezone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(epochMs));
  const numberPart = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = Number(parts.find((part) => part.type === type)?.value);
    if (!Number.isInteger(value)) {
      throw new Error(`Could not determine ${type} for ${timezone}`);
    }
    return value;
  };
  return {
    year: numberPart('year'),
    month: numberPart('month'),
    day: numberPart('day'),
    hour: numberPart('hour'),
    minute: numberPart('minute'),
    second: numberPart('second'),
  };
}

function dateInTz(epochMs: number, timezone: string): string {
  const { year, month, day } = zonedParts(epochMs, timezone);
  const yyyy = String(year).padStart(4, '0');
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function dayOfWeekInTz(epochMs: number, timezone: string): number {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  }).format(new Date(epochMs));
  const number = WEEKDAY_NUMBER[weekday];
  if (!number) throw new Error(`Could not determine weekday for ${timezone}`);
  return number;
}

function epochForTz(timezone: string, date: string, minuteOfDay: number): number {
  const [year, month, day] = date.split('-').map(Number);
  const normalizedMinute = mod1440(minuteOfDay);
  const hour = Math.floor(normalizedMinute / 60);
  const minute = normalizedMinute % 60;
  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute);
  let guess = targetAsUtc;

  // Convert the desired wall-clock fields to an epoch without relying on a
  // server timezone. Re-evaluating the offset also handles DST boundaries.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const rendered = zonedParts(guess, timezone);
    const renderedAsUtc = Date.UTC(
      rendered.year,
      rendered.month - 1,
      rendered.day,
      rendered.hour,
      rendered.minute,
      rendered.second,
    );
    const offset = renderedAsUtc - Math.floor(guess / 1000) * 1000;
    const next = targetAsUtc - offset;
    if (Math.abs(next - guess) < 1000) return next;
    guess = next;
  }
  return guess;
}

function scheduledDays(value: string): Set<number> {
  return new Set(value.split(',')
    .map((day) => Number(day.trim()))
    .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7));
}

function hasMatchingReminder(
  candidate: MissedMedication,
  reminders: ReminderRow[],
): boolean {
  return reminders.some((reminder) => (
    reminder.patient_id === candidate.patient_id
    && reminder.medication_id === candidate.medication_id
    && Math.abs(reminder.scheduled_at - candidate.scheduled_at) <= REMINDER_TOLERANCE_MS
  ));
}

function missedMedicationsForPatient(
  patient: PatientRow,
  medications: MedicationRow[],
  reminders: ReminderRow[],
  nowMs: number,
): MissedMedication[] {
  const nowMin = minutesOfDayInTz(nowMs, patient.timezone);
  const nowMinuteMs = Math.floor(nowMs / 60_000) * 60_000;

  return medications.flatMap((medication) => {
    // The subtraction is deliberately normalized before comparison so a
    // 23:30 dose is correctly recognized as overdue at 01:00.
    const overdueBy = mod1440(nowMin - medication.chosen_time_min);
    if (overdueBy < GRACE_MIN || overdueBy > MAX_OVERDUE_MIN) return [];

    const scheduledReference = nowMinuteMs - overdueBy * 60_000;
    const scheduledDate = dateInTz(scheduledReference, patient.timezone);
    const scheduledAt = epochForTz(
      patient.timezone,
      scheduledDate,
      medication.chosen_time_min,
    );
    const scheduledDow = dayOfWeekInTz(scheduledAt, patient.timezone);
    if (!scheduledDays(medication.days_of_week).has(scheduledDow)) return [];

    const candidate = {
      id: `wd_${patient.id}_${scheduledDate}_${medication.chosen_time_min}`,
      patient_id: patient.id,
      medication_id: medication.id,
      scheduled_date: scheduledDate,
      scheduled_at: scheduledAt,
      slot: medication.chosen_time_min,
    };
    return hasMatchingReminder(candidate, reminders) ? [] : [candidate];
  });
}

async function queueMissedMedicationEscalations(
  admin: SupabaseClient,
  patients: PatientRow[],
  medications: MedicationRow[],
  reminders: ReminderRow[],
  nowMs: number,
): Promise<{
  candidates: number;
  queued_ids: string[];
  timezone_errors: string[];
}> {
  const medicationByPatient = new Map<string, MedicationRow[]>();
  for (const medication of medications) {
    const current = medicationByPatient.get(medication.patient_id) ?? [];
    current.push(medication);
    medicationByPatient.set(medication.patient_id, current);
  }

  const timezoneErrors: string[] = [];
  const candidates = patients.flatMap((patient) => {
    try {
      return missedMedicationsForPatient(
        patient,
        medicationByPatient.get(patient.id) ?? [],
        reminders,
        nowMs,
      );
    } catch (error) {
      console.error('Watchdog timezone calculation failed', {
        patientId: patient.id,
        timezone: patient.timezone,
        error,
      });
      timezoneErrors.push(patient.id);
      return [];
    }
  });

  // One row per patient/date/slot is intentional. All candidates are inserted
  // in one statement so the escalation worker can atomically claim every due
  // row for a patient and make one bundled call, never one call per medicine.
  const uniqueCandidates = [...new Map(
    candidates.map((candidate) => [candidate.id, candidate]),
  ).values()];
  if (uniqueCandidates.length === 0) {
    return { candidates: candidates.length, queued_ids: [], timezone_errors: timezoneErrors };
  }

  const { data, error } = await admin.from('escalations').upsert(
    uniqueCandidates.map((candidate) => ({
      id: candidate.id,
      patient_id: candidate.patient_id,
      reminder_event_id: null,
      medication_id: candidate.medication_id,
      step: 2,
      status: 'requested',
      reason: null,
      requested_at: nowMs,
      not_before: new Date(nowMs).toISOString(),
      source: 'watchdog',
    })),
    { onConflict: 'id', ignoreDuplicates: true },
  ).select('id');
  if (error) {
    console.error('Watchdog escalation insert failed', error);
    throw new Error('could not queue watchdog escalations');
  }
  return {
    candidates: candidates.length,
    queued_ids: (data ?? []).map((row) => row.id),
    timezone_errors: timezoneErrors,
  };
}

async function deterministicOfflineFlagId(patient: PatientRow): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`device_offline:${patient.id}:${patient.device_last_seen_at}`),
  ));
  digest[6] = (digest[6] & 0x0f) | 0x80; // UUIDv8: application-defined hash UUID.
  digest[8] = (digest[8] & 0x3f) | 0x80;
  const hex = [...digest.slice(0, 16)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  const first = hex.slice(0, 8);
  const second = hex.slice(8, 12);
  const third = hex.slice(12, 16);
  const fourth = hex.slice(16, 20);
  const fifth = hex.slice(20, 32);
  return `${first}-${second}-${third}-${fourth}-${fifth}`;
}

async function insertOfflineFlag(
  admin: SupabaseClient,
  patient: PatientRow,
  severity: 'moderate' | 'high',
): Promise<boolean> {
  const id = await deterministicOfflineFlagId(patient);
  const { data, error } = await admin.from('flags').insert({
    id,
    patient_id: patient.id,
    type: 'device_offline',
    severity,
    status: 'active',
  }).select('id').maybeSingle();
  if (error?.code === '23505') return false;
  if (error) {
    console.error('Device-offline flag insert failed', { patientId: patient.id, error });
    throw new Error('could not create device-offline flag');
  }
  return data !== null;
}

async function promoteOfflineFlag(
  admin: SupabaseClient,
  flag: OfflineFlagRow,
): Promise<boolean> {
  const { data, error } = await admin.from('flags')
    .update({ severity: 'high' })
    .eq('id', flag.id)
    .eq('status', 'active')
    .neq('severity', 'high')
    .select('id')
    .maybeSingle();
  if (error) {
    console.error('Device-offline flag promotion failed', { flagId: flag.id, error });
    throw new Error('could not escalate device-offline flag');
  }
  return data !== null;
}

async function notifyContacts(
  patient: PatientRow,
  config: EscalationConfigRow | undefined,
  hours: number,
  contacts: Array<'primary' | 'secondary'>,
): Promise<NotificationResult[]> {
  const body = `${patient.display_name}'s tablet hasn't connected in ${Math.floor(hours)} hours.`;
  const settled = await Promise.allSettled(contacts.map(async (contact) => {
    const phone = contact === 'primary'
      ? config?.primary_phone ?? null
      : config?.secondary_phone ?? null;
    return {
      contact,
      result: await sendSmsWithResult(phone, body),
    } as NotificationResult;
  }));
  return settled.map((result, index) => (
    result.status === 'fulfilled'
      ? result.value
      : {
        contact: contacts[index],
        result: { ok: false, reason: 'provider_error' },
      }
  ));
}

async function processDeviceHealth(
  admin: SupabaseClient,
  patient: PatientRow,
  config: EscalationConfigRow | undefined,
  activeFlag: OfflineFlagRow | undefined,
  nowMs: number,
): Promise<DeviceHealthResult | null> {
  if (!patient.device_last_seen_at) return null;
  const lastSeenMs = Date.parse(patient.device_last_seen_at);
  if (!Number.isFinite(lastSeenMs)) {
    console.error('Invalid device_last_seen_at', { patientId: patient.id });
    return null;
  }
  const hours = (nowMs - lastSeenMs) / 3_600_000;
  if (hours < 24) return null;

  if (hours >= 72) {
    if (activeFlag?.severity === 'high') {
      return {
        patient_id: patient.id,
        hours_offline: hours,
        action: 'already_flagged',
        severity: 'high',
        notifications: [],
      };
    }
    const claimed = activeFlag
      ? await promoteOfflineFlag(admin, activeFlag)
      : await insertOfflineFlag(admin, patient, 'high');
    if (!claimed) {
      return {
        patient_id: patient.id,
        hours_offline: hours,
        action: 'race_lost',
        severity: 'high',
        notifications: [],
      };
    }
    return {
      patient_id: patient.id,
      hours_offline: hours,
      action: activeFlag ? 'escalated' : 'flagged',
      severity: 'high',
      notifications: await notifyContacts(
        patient,
        config,
        hours,
        activeFlag ? ['secondary'] : ['primary', 'secondary'],
      ),
    };
  }

  if (activeFlag) {
    return {
      patient_id: patient.id,
      hours_offline: hours,
      action: 'already_flagged',
      severity: 'moderate',
      notifications: [],
    };
  }
  const claimed = await insertOfflineFlag(admin, patient, 'moderate');
  return {
    patient_id: patient.id,
    hours_offline: hours,
    action: claimed ? 'flagged' : 'race_lost',
    severity: 'moderate',
    notifications: claimed
      ? await notifyContacts(patient, config, hours, ['primary'])
      : [],
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') return methodNotAllowedResponse();

  try {
    const expectedSecret = requiredEnv('INTERNAL_CRON_SECRET');
    if (!await secretsEqual(expectedSecret, req.headers.get('x-internal-secret'))) {
      return errorResponse(403, 'forbidden');
    }

    const parsed = watchdogBodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return errorResponse(400, 'invalid request body');

    const admin = createAdminClient();
    const nowMs = Date.now();
    const { data: patientData, error: patientError } = await admin.from('patients')
      .select('id, display_name, timezone, device_last_seen_at')
      .is('archived_at', null);
    if (patientError) {
      console.error('Watchdog patient lookup failed', patientError);
      throw new Error('could not load active patients');
    }
    const patients = (patientData ?? []) as PatientRow[];
    if (patients.length === 0) {
      return jsonResponse({ success: true, medication_safety: {}, device_health: [] });
    }
    const patientIds = patients.map((patient) => patient.id);

    const [medicationQuery, reminderQuery, configQuery, flagQuery] = await Promise.all([
      admin.from('medications')
        .select('id, patient_id, chosen_time_min, days_of_week')
        .in('patient_id', patientIds)
        .eq('active', true),
      admin.from('reminder_events')
        .select('patient_id, medication_id, scheduled_at')
        .in('patient_id', patientIds)
        .gte('scheduled_at', nowMs - (MAX_OVERDUE_MIN + 10) * 60_000)
        .lte('scheduled_at', nowMs + REMINDER_TOLERANCE_MS),
      admin.from('escalation_config')
        .select('patient_id, primary_phone, secondary_phone')
        .in('patient_id', patientIds),
      admin.from('flags')
        .select('id, patient_id, severity')
        .in('patient_id', patientIds)
        .eq('type', 'device_offline')
        .eq('status', 'active'),
    ]);
    const contextError = medicationQuery.error
      ?? reminderQuery.error
      ?? configQuery.error
      ?? flagQuery.error;
    if (contextError) {
      console.error('Watchdog context lookup failed', contextError);
      throw new Error('could not load watchdog context');
    }

    const medicationSafety = await queueMissedMedicationEscalations(
      admin,
      patients,
      (medicationQuery.data ?? []) as MedicationRow[],
      (reminderQuery.data ?? []) as ReminderRow[],
      nowMs,
    );
    const configs = new Map(
      ((configQuery.data ?? []) as EscalationConfigRow[])
        .map((config) => [config.patient_id, config]),
    );
    const flags = new Map<string, OfflineFlagRow>();
    for (const flag of (flagQuery.data ?? []) as OfflineFlagRow[]) {
      const existing = flags.get(flag.patient_id);
      if (!existing || flag.severity === 'high') flags.set(flag.patient_id, flag);
    }

    // Device health is independent from missed-dose reconstruction. One
    // patient's provider failure must not block checks for every other patient.
    const settledHealth = await Promise.allSettled(patients.map((patient) => (
      processDeviceHealth(
        admin,
        patient,
        configs.get(patient.id),
        flags.get(patient.id),
        nowMs,
      )
    )));
    const deviceHealth = settledHealth.flatMap((result, index) => {
      if (result.status === 'fulfilled') return result.value ? [result.value] : [];
      console.error('Device health processing failed', {
        patientId: patients[index].id,
        error: result.reason,
      });
      return [];
    });
    return jsonResponse({
      success: medicationSafety.timezone_errors.length === 0
        && settledHealth.every((result) => result.status === 'fulfilled'),
      grace_min: GRACE_MIN,
      medication_safety: medicationSafety,
      device_health: deviceHealth,
    });
  } catch (error) {
    return handleError(error);
  }
});
