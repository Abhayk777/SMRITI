import type { SupabaseClient } from '@supabase/supabase-js';

import { optionsResponse } from '../_shared/cors.ts';
import {
  medicationList,
  type DueMedication,
  type PatientForEscalation,
  unconfirmedMedsForEscalations,
} from '../_shared/escalation.ts';
import {
  errorResponse,
  handleError,
  jsonResponse,
  methodNotAllowedResponse,
} from '../_shared/http.ts';
import { secretsEqual } from '../_shared/signatures.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import {
  hasTwilioCredentials,
  placeTwilioCall,
  type ProviderDispatchResult,
  sendSmsWithResult,
} from '../_shared/twilio.ts';
import {
  escalationWorkerBodySchema,
  type EscalationRecord,
} from '../_shared/types.ts';
import { hasVapiCredentials, placeVapiCall, vapiCallPayload } from '../_shared/vapi.ts';

type EscalationStep = {
  step: number;
  minutes: number;
  channel: string;
};

type EscalationConfig = {
  steps: unknown;
  primary_phone: string;
  secondary_phone: string | null;
};

type WorkerResult = {
  patient_id: string;
  escalation_ids: string[];
  success: boolean;
  status: string;
  call_plan?: Record<string, unknown>;
  next_escalation_id?: string;
};

const CONVERSATIONAL_LANGUAGES = new Set(['hi', 'as']);

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function functionsBaseUrl(): string {
  return (Deno.env.get('FUNCTIONS_PUBLIC_URL')
    ?? `${requiredEnv('SUPABASE_URL').replace(/\/$/, '')}/functions/v1`)
    .replace(/\/$/, '');
}

function xmlEscape(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function parseSteps(value: unknown): EscalationStep[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (
      typeof candidate !== 'object'
      || candidate === null
      || !Number.isInteger((candidate as Record<string, unknown>).step)
      || !Number.isInteger((candidate as Record<string, unknown>).minutes)
      || typeof (candidate as Record<string, unknown>).channel !== 'string'
    ) return [];
    return [candidate as EscalationStep];
  }).sort((left, right) => left.step - right.step);
}

async function updateEscalations(
  admin: SupabaseClient,
  ids: string[],
  values: Record<string, unknown>,
): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await admin.from('escalations').update(values).in('id', ids);
  if (error) {
    console.error('Escalation status update failed', { ids, error });
    throw new Error('could not update escalation status');
  }
}

async function claimDueForPatient(
  admin: SupabaseClient,
  patientId: string,
): Promise<EscalationRecord[]> {
  // A single update claims every due row for this patient. Concurrent webhook
  // deliveries cannot each claim a different medication and place duplicate calls.
  const { data, error } = await admin
    .from('escalations')
    .update({ status: 'executing' })
    .eq('patient_id', patientId)
    .eq('status', 'requested')
    .lte('not_before', new Date().toISOString())
    .select('*');
  if (error) {
    console.error('Escalation claim failed', { patientId, error });
    throw new Error('could not claim due escalations');
  }
  return (data ?? []) as EscalationRecord[];
}

async function removeAlreadyConfirmed(
  admin: SupabaseClient,
  claimed: EscalationRecord[],
): Promise<EscalationRecord[]> {
  const reminderIds = claimed.flatMap((escalation) => (
    escalation.reminder_event_id ? [escalation.reminder_event_id] : []
  ));
  if (reminderIds.length === 0) return claimed;

  const { data, error } = await admin
    .from('reminder_events')
    .select('id')
    .in('id', reminderIds)
    .eq('outcome', 'confirmed');
  if (error) {
    console.error('Escalation confirmation re-check failed', error);
    throw new Error('could not re-check reminder confirmation');
  }
  const confirmedIds = new Set((data ?? []).map((event) => event.id));
  const cancelled = claimed.filter((escalation) => (
    escalation.reminder_event_id && confirmedIds.has(escalation.reminder_event_id)
  ));
  await updateEscalations(
    admin,
    cancelled.map((escalation) => escalation.id),
    { status: 'cancelled', reason: 'already_confirmed' },
  );
  return claimed.filter((escalation) => !cancelled.includes(escalation));
}

async function signedUrl(
  admin: SupabaseClient,
  bucket: string,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, 3600);
  if (error) {
    console.warn('Could not sign escalation audio', { bucket, path, error });
    return null;
  }
  return data.signedUrl;
}

async function dtmfPlan(
  admin: SupabaseClient,
  patient: PatientForEscalation,
  due: DueMedication[],
  escalation: EscalationRecord,
  to: string,
): Promise<Record<string, unknown>> {
  const audioUrls = await Promise.all(
    due.map((medication) => signedUrl(admin, 'patient-media', medication.voice_path)),
  );
  const promptUrl = await signedUrl(
    admin,
    'lang-packs',
    `${patient.lang_code}/press_any_key.mp3`,
  );
  const callbackUrl = `${functionsBaseUrl()}/twilio-webhook?p=${
    encodeURIComponent(patient.id)
  }&e=${encodeURIComponent(escalation.id)}`;
  const medicationAudio = due.map((medication, index) => (
    audioUrls[index]
      ? `<Play>${xmlEscape(audioUrls[index] as string)}</Play>`
      : `<Say>${xmlEscape(`${medication.dose} ${medication.name}`)}</Say>`
  )).join('');
  const prompt = promptUrl
    ? `<Play>${xmlEscape(promptUrl)}</Play>`
    : '<Say>Press any key after taking your medication.</Say>';
  const escapedCallback = xmlEscape(callbackUrl);
  const twiml = `<Response>${medicationAudio}<Gather numDigits="1" timeout="8" action="${
    escapedCallback
  }">${prompt}</Gather><Redirect>${escapedCallback}&amp;noanswer=1</Redirect></Response>`;
  return {
    provider: 'twilio',
    mechanism: 'dtmf',
    tier: 'dtmf',
    to,
    medications: due.map((medication) => ({
      id: medication.id,
      name: medication.name,
      dose: medication.dose,
      scheduled_at: medication.scheduled_at,
    })),
    twiml,
  };
}

function conversationalPlan(
  patient: PatientForEscalation,
  due: DueMedication[],
  escalation: EscalationRecord,
  to: string,
): Record<string, unknown> {
  const medications = medicationList(due, patient.lang_code);
  return {
    provider: 'vapi',
    mechanism: 'conversational',
    tier: 'conversational',
    to,
    medications: due.map((medication) => ({
      id: medication.id,
      name: medication.name,
      dose: medication.dose,
      scheduled_at: medication.scheduled_at,
    })),
    payload: vapiCallPayload({
      to,
      patientId: patient.id,
      escalationId: escalation.id,
      patientName: patient.display_name,
      medicationsList: medications,
    }) ?? {
      assistantId: null,
      phoneNumberId: null,
      customer: { number: to },
      assistantOverrides: {
        variableValues: {
          patient_name: patient.display_name,
          medications_list: medications,
          patient_id: patient.id,
          escalation_id: escalation.id,
        },
      },
    },
  };
}

async function dispatchCall(
  admin: SupabaseClient,
  patient: PatientForEscalation,
  due: DueMedication[],
  escalation: EscalationRecord,
  to: string,
): Promise<{ result: ProviderDispatchResult; plan: Record<string, unknown> }> {
  if (CONVERSATIONAL_LANGUAGES.has(patient.lang_code)) {
    const plan = conversationalPlan(patient, due, escalation, to);
    if (!hasVapiCredentials()) {
      if (patient.lang_code === 'as' && hasTwilioCredentials()) {
        const fallback = await dtmfPlan(admin, patient, due, escalation, to);
        return {
          result: await placeTwilioCall(to, fallback.twiml as string),
          plan: { ...fallback, mechanism: 'dtmf_fallback' },
        };
      }
      return { result: { ok: false, reason: 'no_credentials' }, plan };
    }
    const result = await placeVapiCall({
      to,
      patientId: patient.id,
      escalationId: escalation.id,
      patientName: patient.display_name,
      medicationsList: medicationList(due, patient.lang_code),
    });
    if (!result.ok && result.reason === 'provider_error' && patient.lang_code === 'as') {
      const fallback = await dtmfPlan(admin, patient, due, escalation, to);
      return {
        result: await placeTwilioCall(to, fallback.twiml as string),
        plan: { ...fallback, mechanism: 'dtmf_fallback' },
      };
    }
    return { result, plan };
  }

  const plan = await dtmfPlan(admin, patient, due, escalation, to);
  if (!hasTwilioCredentials()) {
    return { result: { ok: false, reason: 'no_credentials' }, plan };
  }
  return { result: await placeTwilioCall(to, plan.twiml as string), plan };
}

async function queueNextStep(
  admin: SupabaseClient,
  escalation: EscalationRecord,
  configuredSteps: unknown,
): Promise<string | undefined> {
  const steps = parseSteps(configuredSteps);
  const current = steps.find((step) => step.step === escalation.step);
  const next = steps.find((step) => step.step === escalation.step + 1);
  if (!next || next.step > 5) return undefined;

  // Configured minute values are cumulative ladder offsets. Waiting for their
  // difference preserves the 15/30/50/75/180-minute pattern after cron jitter.
  const delayMinutes = Math.max(0, next.minutes - (current?.minutes ?? 0));
  const id = escalation.reminder_event_id
    ? `${escalation.reminder_event_id}_${next.step}`
    : `${escalation.id}_${next.step}`;
  const now = Date.now();
  const { error } = await admin.from('escalations').insert({
    id,
    patient_id: escalation.patient_id,
    reminder_event_id: escalation.reminder_event_id,
    medication_id: escalation.medication_id,
    step: next.step,
    status: 'requested',
    requested_at: now,
    not_before: new Date(now + delayMinutes * 60_000).toISOString(),
    source: escalation.source,
  });
  if (error && error.code !== '23505') {
    console.error('Next escalation step insert failed', { id, error });
    throw new Error('could not queue next escalation step');
  }
  return id;
}

async function processPatient(
  admin: SupabaseClient,
  patientId: string,
): Promise<WorkerResult> {
  const claimed = await claimDueForPatient(admin, patientId);
  if (claimed.length === 0) {
    return { patient_id: patientId, escalation_ids: [], success: true, status: 'not_due' };
  }

  let active = await removeAlreadyConfirmed(admin, claimed);
  if (active.length === 0) {
    return {
      patient_id: patientId,
      escalation_ids: claimed.map((escalation) => escalation.id),
      success: true,
      status: 'already_confirmed',
    };
  }

  const [{ data: patient, error: patientError }, { data: config, error: configError }] =
    await Promise.all([
      admin.from('patients')
        .select('id, display_name, lang_code, timezone')
        .eq('id', patientId)
        .single(),
      admin.from('escalation_config')
        .select('steps, primary_phone, secondary_phone')
        .eq('patient_id', patientId)
        .single(),
    ]);
  if (patientError || !patient || configError || !config) {
    console.error('Escalation context lookup failed', { patientError, configError });
    await updateEscalations(
      admin,
      active.map((escalation) => escalation.id),
      { status: 'failed', reason: 'missing_config' },
    );
    return {
      patient_id: patientId,
      escalation_ids: active.map((escalation) => escalation.id),
      success: false,
      status: 'missing_config',
    };
  }

  let due = await unconfirmedMedsForEscalations(
    admin,
    patient as PatientForEscalation,
    active,
  );
  if (due.length === 0) {
    await updateEscalations(
      admin,
      active.map((escalation) => escalation.id),
      { status: 'cancelled', reason: 'nothing_due' },
    );
    return {
      patient_id: patientId,
      escalation_ids: active.map((escalation) => escalation.id),
      success: true,
      status: 'nothing_due',
    };
  }

  // Re-check immediately before dispatch, after building the complete due set.
  active = await removeAlreadyConfirmed(admin, active);
  if (active.length === 0) {
    return {
      patient_id: patientId,
      escalation_ids: claimed.map((escalation) => escalation.id),
      success: true,
      status: 'already_confirmed',
    };
  }
  due = await unconfirmedMedsForEscalations(
    admin,
    patient as PatientForEscalation,
    active,
  );
  if (due.length === 0) {
    await updateEscalations(
      admin,
      active.map((escalation) => escalation.id),
      { status: 'cancelled', reason: 'nothing_due' },
    );
    return {
      patient_id: patientId,
      escalation_ids: active.map((escalation) => escalation.id),
      success: true,
      status: 'nothing_due',
    };
  }
  const representative = [...active].sort((left, right) => (
    right.step - left.step || left.requested_at - right.requested_at
  ))[0];
  const cfg = config as EscalationConfig;

  let result: ProviderDispatchResult;
  let callPlan: Record<string, unknown>;
  if (representative.step === 2 || representative.step === 3) {
    ({ result, plan: callPlan } = await dispatchCall(
      admin,
      patient as PatientForEscalation,
      due,
      representative,
      cfg.primary_phone,
    ));
  } else if (representative.step === 4 || representative.step === 5) {
    const to = representative.step === 4 ? cfg.primary_phone : cfg.secondary_phone;
    const body = `${patient.display_name} has not confirmed: ${
      medicationList(due, patient.lang_code)
    }. Please check in.`;
    callPlan = {
      provider: 'twilio',
      mechanism: representative.step === 4 ? 'sms_primary' : 'sms_secondary',
      to,
      body,
      medications: due.map((medication) => ({
        id: medication.id,
        name: medication.name,
        dose: medication.dose,
        scheduled_at: medication.scheduled_at,
      })),
    };
    result = await sendSmsWithResult(to, body);
  } else {
    await updateEscalations(
      admin,
      active.map((escalation) => escalation.id),
      { status: 'cancelled', reason: 'unsupported_step' },
    );
    return {
      patient_id: patientId,
      escalation_ids: active.map((escalation) => escalation.id),
      success: true,
      status: 'unsupported_step',
    };
  }

  if (!result.ok) {
    await updateEscalations(
      admin,
      active.map((escalation) => escalation.id),
      { status: 'failed', reason: result.reason },
    );
    console.warn('Escalation dispatch failed', { callPlan, reason: result.reason });
    return {
      patient_id: patientId,
      escalation_ids: active.map((escalation) => escalation.id),
      success: false,
      status: result.reason,
      call_plan: callPlan,
    };
  }

  await updateEscalations(
    admin,
    active.map((escalation) => escalation.id),
    {
      status: 'completed',
      reason: null,
      twilio_sid: result.id,
      executed_at: new Date().toISOString(),
    },
  );
  const nextId = await queueNextStep(admin, representative, cfg.steps);
  return {
    patient_id: patientId,
    escalation_ids: active.map((escalation) => escalation.id),
    success: true,
    status: 'completed',
    call_plan: callPlan,
    next_escalation_id: nextId,
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

    const parsed = escalationWorkerBodySchema.safeParse(
      await req.json().catch(() => null),
    );
    if (!parsed.success) return errorResponse(400, 'invalid request body');

    const admin = createAdminClient();
    let patientIds: string[];
    if ('mode' in parsed.data) {
      const { data, error } = await admin
        .from('escalations')
        .select('patient_id')
        .eq('status', 'requested')
        .lte('not_before', new Date().toISOString());
      if (error) {
        console.error('Due escalation sweep failed', error);
        throw new Error('could not load due escalations');
      }
      patientIds = [...new Set((data ?? []).map((row) => row.patient_id))];
    } else {
      const record = parsed.data.record;
      if (
        parsed.data.type !== 'INSERT'
        || record.status !== 'requested'
        || Date.parse(record.not_before) > Date.now()
      ) {
        return jsonResponse({ success: true, results: [], status: 'not_due' });
      }
      patientIds = [record.patient_id];
    }

    // Provider dispatches for different patients are independent. allSettled
    // prevents one provider failure from blocking every other due patient.
    const settled = await Promise.allSettled(
      patientIds.map((patientId) => processPatient(admin, patientId)),
    );
    await Promise.all(settled.map(async (result, index) => {
      if (result.status !== 'rejected') return;
      const { error } = await admin
        .from('escalations')
        .update({ status: 'failed', reason: 'internal_error' })
        .eq('patient_id', patientIds[index])
        .eq('status', 'executing');
      if (error) {
        console.error('Could not fail stuck executing escalations', {
          patientId: patientIds[index],
          error,
        });
      }
    }));
    const results = settled.map((result, index) => (
      result.status === 'fulfilled'
        ? result.value
        : {
          patient_id: patientIds[index],
          escalation_ids: [],
          success: false,
          status: 'internal_error',
        }
    ));
    settled.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error('Escalation patient dispatch failed', {
          patientId: patientIds[index],
          error: result.reason,
        });
      }
    });
    return jsonResponse({
      success: results.every((result) => result.success),
      results,
    });
  } catch (error) {
    return handleError(error);
  }
});
