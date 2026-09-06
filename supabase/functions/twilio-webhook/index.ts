import { optionsResponse } from '../_shared/cors.ts';
import {
  type PatientForEscalation,
  unconfirmedMedsForEscalations,
} from '../_shared/escalation.ts';
import {
  errorResponse,
  handleError,
  jsonResponse,
  methodNotAllowedResponse,
} from '../_shared/http.ts';
import { validateTwilioSignature, validateVapiSignature } from '../_shared/signatures.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import {
  escalationCallbackContextSchema,
  type EscalationCallbackContext,
  type VapiWebhookBody,
  vapiWebhookBodySchema,
} from '../_shared/types.ts';

function requiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function twimlResponse(): Response {
  return new Response('<Response/>', {
    status: 200,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  });
}

function externallyVisibleUrl(req: Request): string {
  const url = new URL(req.url);
  const functionsBase = (Deno.env.get('FUNCTIONS_PUBLIC_URL')
    ?? `${requiredEnv('SUPABASE_URL').replace(/\/$/, '')}/functions/v1`)
    .replace(/\/$/, '');
  return `${functionsBase}/twilio-webhook${url.search}`;
}

function contextFromTwilioUrl(url: URL): EscalationCallbackContext | null {
  const parsed = escalationCallbackContextSchema.safeParse({
    patient_id: url.searchParams.get('p'),
    escalation_id: url.searchParams.get('e'),
  });
  return parsed.success ? parsed.data : null;
}

function tookMedicationFromVapi(body: VapiWebhookBody): boolean | null {
  let taken: boolean | null = null;
  const outputs = body.message?.artifact?.structuredOutputs ?? {};
  for (const output of Object.values(outputs)) {
    if (output?.name === 'took_medication') taken = output.result as boolean | null;
  }
  if (taken === null) {
    taken = body.message?.analysis?.structuredData?.took_medication as boolean | null ?? null;
  }
  return typeof taken === 'boolean' ? taken : null;
}

function contextFromVapi(body: VapiWebhookBody): EscalationCallbackContext | null {
  const variables = body.message?.call?.assistantOverrides?.variableValues;
  const parsed = escalationCallbackContextSchema.safeParse({
    patient_id: variables?.patient_id,
    escalation_id: variables?.escalation_id,
  });
  return parsed.success ? parsed.data : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') return methodNotAllowedResponse();

  try {
    const contentType = req.headers.get('content-type')?.split(';', 1)[0]?.trim()
      .toLowerCase();
    const rawBody = await req.text();
    let context: EscalationCallbackContext | null = null;
    let confirmed = false;
    let twilioRequest = false;

    if (contentType === 'application/x-www-form-urlencoded') {
      twilioRequest = true;
      const formBody = new URLSearchParams(rawBody);
      const signatureUrl = externallyVisibleUrl(req);
      const valid = await validateTwilioSignature(
        requiredEnv('TWILIO_AUTH_TOKEN'),
        req.headers.get('x-twilio-signature'),
        signatureUrl,
        formBody,
      );
      if (!valid) return new Response('forbidden', { status: 403 });
      if (!Deno.env.get('DENO_DEPLOYMENT_ID')) {
        console.log('Authenticated Twilio callback', Object.fromEntries(formBody));
      }

      const url = new URL(req.url);
      context = contextFromTwilioUrl(url);
      confirmed = !url.searchParams.has('noanswer')
        && (formBody.get('Digits')?.length ?? 0) > 0;
    } else if (contentType === 'application/json') {
      const valid = await validateVapiSignature(
        requiredEnv('VAPI_WEBHOOK_SECRET'),
        req.headers.get('x-vapi-webhook-secret'),
      );
      if (!valid) return new Response('forbidden', { status: 403 });

      let decoded: unknown;
      try {
        decoded = JSON.parse(rawBody || 'null');
      } catch {
        return errorResponse(400, 'invalid request body');
      }
      const parsed = vapiWebhookBodySchema.safeParse(decoded);
      if (!parsed.success) return errorResponse(400, 'invalid request body');
      if (!Deno.env.get('DENO_DEPLOYMENT_ID')) {
        console.log('Authenticated Vapi callback', parsed.data);
      }
      const taken = tookMedicationFromVapi(parsed.data);
      if (taken === null || taken === false) return jsonResponse({ received: true });
      context = contextFromVapi(parsed.data);
      confirmed = true;
    } else {
      return errorResponse(415, 'unsupported content type');
    }

    if (!confirmed) return twilioRequest ? twimlResponse() : jsonResponse({ received: true });
    if (!context) return errorResponse(400, 'invalid callback context');

    // No database client is created until the provider signature and callback
    // context have both been validated.
    const admin = createAdminClient();
    const { data: escalation, error: escalationError } = await admin
      .from('escalations')
      .select('id, patient_id, reminder_event_id, medication_id, requested_at, step')
      .eq('id', context.escalation_id)
      .eq('patient_id', context.patient_id)
      .maybeSingle();
    if (escalationError) {
      console.error('Callback escalation lookup failed', escalationError);
      throw new Error('could not load callback escalation');
    }
    if (!escalation) return errorResponse(400, 'invalid callback context');

    const { data: patient, error: patientError } = await admin
      .from('patients')
      .select('id, display_name, lang_code, timezone')
      .eq('id', context.patient_id)
      .single();
    if (patientError || !patient) {
      console.error('Callback patient lookup failed', patientError);
      throw new Error('could not load callback patient');
    }

    const due = await unconfirmedMedsForEscalations(
      admin,
      patient as PatientForEscalation,
      [escalation],
    );
    if (due.length > 0) {
      const now = Date.now();
      const { error: reminderError } = await admin.from('reminder_events').insert(
        due.map((medication) => ({
          id: crypto.randomUUID(),
          patient_id: context.patient_id,
          medication_id: medication.id,
          scheduled_at: medication.scheduled_at,
          fired_at: now,
          responded_at: now,
          outcome: 'confirmed',
          channel: 'call',
          ladder_step: escalation.step,
        })),
      );
      if (reminderError) {
        console.error('Call confirmation insert failed', reminderError);
        throw new Error('could not record call confirmation');
      }

      const { error: cancellationError } = await admin
        .from('escalations')
        .update({ status: 'cancelled', reason: 'confirmed_by_call' })
        .eq('patient_id', context.patient_id)
        .eq('status', 'requested');
      if (cancellationError) {
        console.error('Pending escalation cancellation failed', cancellationError);
        throw new Error('could not cancel pending escalations');
      }
    }

    return twilioRequest ? twimlResponse() : jsonResponse({ received: true });
  } catch (error) {
    return handleError(error);
  }
});
