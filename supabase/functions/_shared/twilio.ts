export type ProviderDispatchResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'no_credentials' | 'provider_error'; status?: number };

function credentials(): {
  accountSid: string;
  authToken: string;
  from: string;
} | null {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_PHONE_NUMBER');

  return accountSid && authToken && from
    ? { accountSid, authToken, from }
    : null;
}

function apiBaseUrl(): string {
  return (Deno.env.get('TWILIO_API_BASE_URL') ?? 'https://api.twilio.com').replace(/\/$/, '');
}

async function twilioRequest(
  path: string,
  form: URLSearchParams,
): Promise<ProviderDispatchResult> {
  const configured = credentials();
  if (!configured) return { ok: false, reason: 'no_credentials' };

  let response: Response;
  try {
    response = await fetch(
      `${apiBaseUrl()}/2010-04-01/Accounts/${configured.accountSid}/${path}.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${configured.accountSid}:${configured.authToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form,
      },
    );
  } catch (error) {
    console.error('Twilio request could not be sent', { path, error });
    return { ok: false, reason: 'provider_error' };
  }

  if (!response.ok) {
    const responseBody = await response.text().catch(() => '');
    let errorCode: unknown = null;
    let message: unknown = null;

    try {
      const parsed = JSON.parse(responseBody) as Record<string, unknown>;
      errorCode = parsed.code ?? null;
      message = parsed.message ?? null;
    } catch {
      // Preserve the raw response below even when Twilio returns non-JSON.
    }

    console.error('Twilio request failed', {
      path,
      status: response.status,
      twilio_error_code: errorCode,
      twilio_message: message,
      response_body: responseBody,
    });
    return { ok: false, reason: 'provider_error', status: response.status };
  }

  const body = await response.json().catch(() => ({})) as { sid?: unknown };
  if (typeof body.sid !== 'string') {
    console.error('Twilio response did not include a SID', { path });
    return { ok: false, reason: 'provider_error', status: response.status };
  }
  return { ok: true, id: body.sid };
}

export function hasTwilioCredentials(): boolean {
  return credentials() !== null;
}

export async function sendSmsWithResult(
  to: string | null,
  body: string,
): Promise<ProviderDispatchResult> {
  const configured = credentials();
  if (!configured || !to) return { ok: false, reason: 'no_credentials' };
  return twilioRequest('Messages', new URLSearchParams({
    To: to,
    From: configured.from,
    Body: body,
  }));
}

export async function placeTwilioCall(
  to: string,
  twiml: string,
): Promise<ProviderDispatchResult> {
  const configured = credentials();
  if (!configured || !to) return { ok: false, reason: 'no_credentials' };
  return twilioRequest('Calls', new URLSearchParams({
    To: to,
    From: configured.from,
    Twiml: twiml,
  }));
}

export async function sendSms(to: string, body: string): Promise<boolean> {
  const result = await sendSmsWithResult(to, body);
  if (!result.ok && result.reason === 'no_credentials') {
    console.warn('Replacement SMS skipped because Twilio credentials or recipient are absent');
  }
  return result.ok;
}
