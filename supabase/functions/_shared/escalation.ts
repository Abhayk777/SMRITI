import type { SupabaseClient } from '@supabase/supabase-js';

export type PatientForEscalation = {
  id: string;
  display_name: string;
  lang_code: string;
  timezone: string;
};

export type DueMedication = {
  id: string;
  name: string;
  dose: string;
  voice_path: string | null;
  chosen_time_min: number;
  scheduled_at: number;
};

export type TriggeringEscalation = {
  reminder_event_id: string | null;
  medication_id: string | null;
  requested_at: number;
};

type MedicationRow = Omit<DueMedication, 'scheduled_at'> & {
  days_of_week: string;
};

const CONFIRMATION_TOLERANCE_MS = 5 * 60 * 1000;
const WINDOW_BEFORE_MIN = 15;
const WINDOW_AFTER_MIN = 30;

const WEEKDAY_NUMBER: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

export function mod1440(value: number): number {
  return ((value % 1440) + 1440) % 1440;
}

export function inWindow(t: number, lo: number, hi: number): boolean {
  const normalizedLo = mod1440(lo);
  const normalizedHi = mod1440(hi);
  return normalizedLo <= normalizedHi
    ? t >= normalizedLo && t <= normalizedHi
    : t >= normalizedLo || t <= normalizedHi;
}

export function minutesOfDayInTz(epochMs: number, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(epochMs));
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    throw new Error(`Could not determine local time for ${timezone}`);
  }
  return mod1440(hour * 60 + minute);
}

function weekdayInTz(epochMs: number, timezone: string): number {
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  }).format(new Date(epochMs));
  const number = WEEKDAY_NUMBER[weekday];
  if (!number) throw new Error(`Could not determine weekday for ${timezone}`);
  return number;
}

function scheduledDeltaMinutes(chosenTime: number, nowMin: number): number | null {
  if (!inWindow(chosenTime, nowMin - WINDOW_BEFORE_MIN, nowMin + WINDOW_AFTER_MIN)) {
    return null;
  }
  const direct = chosenTime - nowMin;
  return [direct, direct - 1440, direct + 1440]
    .find((delta) => delta >= -WINDOW_BEFORE_MIN && delta <= WINDOW_AFTER_MIN)
    ?? null;
}

function nearestScheduledEpoch(
  chosenTime: number,
  referenceMs: number,
  timezone: string,
): number {
  const referenceMin = minutesOfDayInTz(referenceMs, timezone);
  const direct = chosenTime - referenceMin;
  const delta = [direct, direct - 1440, direct + 1440]
    .sort((left, right) => Math.abs(left) - Math.abs(right))[0];
  return Math.floor(referenceMs / 60_000) * 60_000 + delta * 60_000;
}

function isScheduledToday(medication: MedicationRow, epochMs: number, timezone: string): boolean {
  const configuredDays = medication.days_of_week
    .split(',')
    .map((day) => Number(day.trim()))
    .filter(Number.isInteger);
  return configuredDays.includes(weekdayInTz(epochMs, timezone));
}

export async function unconfirmedMedsInWindow(
  admin: SupabaseClient,
  patient: PatientForEscalation,
  nowMs = Date.now(),
): Promise<DueMedication[]> {
  const { data: medicationRows, error: medicationError } = await admin
    .from('medications')
    .select('id, name, dose, voice_path, chosen_time_min, days_of_week')
    .eq('patient_id', patient.id)
    .eq('active', true);
  if (medicationError) {
    console.error('Due medication lookup failed', medicationError);
    throw new Error('could not load medications');
  }

  const nowMin = minutesOfDayInTz(nowMs, patient.timezone);
  const minuteStartMs = Math.floor(nowMs / 60_000) * 60_000;
  const scheduled = (medicationRows as MedicationRow[] ?? []).flatMap((medication) => {
    const delta = scheduledDeltaMinutes(medication.chosen_time_min, nowMin);
    if (delta === null) return [];
    const scheduledAt = minuteStartMs + delta * 60_000;
    if (!isScheduledToday(medication, scheduledAt, patient.timezone)) return [];
    return [{ ...medication, scheduled_at: scheduledAt }];
  });
  if (scheduled.length === 0) return [];

  const earliest = Math.min(...scheduled.map((medication) => medication.scheduled_at));
  const latest = Math.max(...scheduled.map((medication) => medication.scheduled_at));
  const { data: confirmations, error: confirmationError } = await admin
    .from('reminder_events')
    .select('medication_id, scheduled_at')
    .eq('patient_id', patient.id)
    .eq('outcome', 'confirmed')
    .in('medication_id', scheduled.map((medication) => medication.id))
    .gte('scheduled_at', earliest - CONFIRMATION_TOLERANCE_MS)
    .lte('scheduled_at', latest + CONFIRMATION_TOLERANCE_MS);
  if (confirmationError) {
    console.error('Reminder confirmation lookup failed', confirmationError);
    throw new Error('could not check medication confirmations');
  }

  return scheduled.filter((medication) => !(confirmations ?? []).some((confirmation) => (
    confirmation.medication_id === medication.id
    && Math.abs(confirmation.scheduled_at - medication.scheduled_at)
      <= CONFIRMATION_TOLERANCE_MS
  )));
}

async function unconfirmedTriggeringMeds(
  admin: SupabaseClient,
  patient: PatientForEscalation,
  escalations: TriggeringEscalation[],
): Promise<DueMedication[]> {
  const reminderIds = escalations.flatMap((escalation) => (
    escalation.reminder_event_id ? [escalation.reminder_event_id] : []
  ));
  const { data: reminders, error: reminderError } = reminderIds.length > 0
    ? await admin
      .from('reminder_events')
      .select('id, medication_id, scheduled_at, outcome')
      .eq('patient_id', patient.id)
      .in('id', reminderIds)
    : { data: [], error: null };
  if (reminderError) {
    console.error('Triggering reminder lookup failed', reminderError);
    throw new Error('could not load triggering reminders');
  }

  const remindersById = new Map(
    (reminders ?? []).map((reminder) => [reminder.id, reminder]),
  );
  const triggers = escalations.flatMap((escalation) => {
    const reminder = escalation.reminder_event_id
      ? remindersById.get(escalation.reminder_event_id)
      : null;
    if (reminder?.outcome === 'confirmed') return [];
    const medicationId = reminder?.medication_id ?? escalation.medication_id;
    if (!medicationId) return [];
    return [{
      medication_id: medicationId,
      scheduled_at: reminder?.scheduled_at as number | undefined,
      reference_ms: escalation.requested_at,
    }];
  });
  if (triggers.length === 0) return [];

  const medicationIds = [...new Set(triggers.map((trigger) => trigger.medication_id))];
  const { data: medications, error: medicationError } = await admin
    .from('medications')
    .select('id, name, dose, voice_path, chosen_time_min')
    .eq('patient_id', patient.id)
    .in('id', medicationIds);
  if (medicationError) {
    console.error('Triggering medication lookup failed', medicationError);
    throw new Error('could not load triggering medications');
  }

  const medicationById = new Map(
    ((medications ?? []) as Array<Omit<DueMedication, 'scheduled_at'>>)
      .map((medication) => [medication.id, medication]),
  );
  const candidates = triggers.flatMap((trigger) => {
    const medication = medicationById.get(trigger.medication_id);
    if (!medication) return [];
    return [{
      ...medication,
      scheduled_at: trigger.scheduled_at ?? nearestScheduledEpoch(
        medication.chosen_time_min,
        trigger.reference_ms,
        patient.timezone,
      ),
    }];
  });
  if (candidates.length === 0) return [];

  const earliest = Math.min(...candidates.map((medication) => medication.scheduled_at));
  const latest = Math.max(...candidates.map((medication) => medication.scheduled_at));
  const { data: confirmations, error: confirmationError } = await admin
    .from('reminder_events')
    .select('medication_id, scheduled_at')
    .eq('patient_id', patient.id)
    .eq('outcome', 'confirmed')
    .in('medication_id', medicationIds)
    .gte('scheduled_at', earliest - CONFIRMATION_TOLERANCE_MS)
    .lte('scheduled_at', latest + CONFIRMATION_TOLERANCE_MS);
  if (confirmationError) {
    console.error('Trigger confirmation lookup failed', confirmationError);
    throw new Error('could not check triggering medication confirmations');
  }

  return candidates.filter((medication) => !(confirmations ?? []).some((confirmation) => (
    confirmation.medication_id === medication.id
    && Math.abs(confirmation.scheduled_at - medication.scheduled_at)
      <= CONFIRMATION_TOLERANCE_MS
  )));
}

export async function unconfirmedMedsForEscalations(
  admin: SupabaseClient,
  patient: PatientForEscalation,
  escalations: TriggeringEscalation[],
  nowMs = Date.now(),
): Promise<DueMedication[]> {
  const [triggering, nearby] = await Promise.all([
    unconfirmedTriggeringMeds(admin, patient, escalations),
    unconfirmedMedsInWindow(admin, patient, nowMs),
  ]);
  const merged = new Map<string, DueMedication>();
  for (const medication of [...triggering, ...nearby]) {
    if (!merged.has(medication.id)) merged.set(medication.id, medication);
  }
  return [...merged.values()];
}

export function medicationList(
  medications: DueMedication[],
  langCode: string,
): string {
  const conjunctions: Record<string, string> = {
    hi: ', aur ',
    as: ', আৰু ',
    mni: ', অমসুং ',
    en: ', and ',
  };
  return medications
    .map((medication) => `${medication.dose} ${medication.name}`)
    .join(conjunctions[langCode] ?? conjunctions.en);
}
