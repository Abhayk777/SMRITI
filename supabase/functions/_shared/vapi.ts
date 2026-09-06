import type { ProviderDispatchResult } from './twilio.ts';

type VapiCall = {
  to: string;
  patientId: string;
  escalationId: string;
  patientName: string;
  medicationsList: string;
};

function credentials(): {
  apiKey: string;
  assistantId: string;
  phoneNumberId: string;
} | null {
  const apiKey = Deno.env.get('VAPI_API_KEY');
  const assistantId = Deno.env.get('VAPI_ASSISTANT_ID');
  const phoneNumberId = Deno.env.get('VAPI_PHONE_NUMBER_ID');
  return apiKey && assistantId && phoneNumberId
    ? { apiKey, assistantId, phoneNumberId }
    : null;
}

export function hasVapiCredentials(): boolean {
  return credentials() !== null;
}

export function vapiCallPayload(call: VapiCall): Record<string, unknown> | null {
  const configured = credentials();
  if (!configured) return null;
  return {
    assistantId: configured.assistantId,
    phoneNumberId: configured.phoneNumberId,
    customer: { number: call.to },
    assistantOverrides: {
      variableValues: {
        patient_name: call.patientName,
        medications_list: call.medicationsList,
        patient_id: call.patientId,
        escalation_id: call.escalationId,
      },
    },
  };
}

export async function placeVapiCall(call: VapiCall): Promise<ProviderDispatchResult> {
  const configured = credentials();
  const payload = vapiCallPayload(call);
  if (!configured || !payload) return { ok: false, reason: 'no_credentials' };

  const endpoint = Deno.env.get('VAPI_API_URL') ?? 'https://api.vapi.ai/call';
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${configured.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error('Vapi call request could not be sent', error);
    return { ok: false, reason: 'provider_error' };
  }
  if (!response.ok) {
    console.error('Vapi call request failed', { status: response.status });
    return { ok: false, reason: 'provider_error', status: response.status };
  }

  const body = await response.json().catch(() => ({})) as { id?: unknown };
  if (typeof body.id !== 'string') {
    console.error('Vapi response did not include a call ID');
    return { ok: false, reason: 'provider_error', status: response.status };
  }
  return { ok: true, id: body.id };
}
