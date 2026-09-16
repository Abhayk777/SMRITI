export type VoicebotErrorCode =
  | "NOT_AUTHENTICATED" | "NOT_AUTHORISED" | "PATIENT_NOT_FOUND"
  | "VOICEBOT_DISABLED" | "PATIENT_NOT_ENABLED" | "CONSENT_REQUIRED"
  | "INVALID_REQUEST" | "METHOD_NOT_ALLOWED" | "CONFLICT"
  | "UPSTREAM_TIMEOUT" | "UPSTREAM_UNAVAILABLE" | "UPSTREAM_CONTRACT_ERROR"
  | "INTERNAL_ERROR";

export type VoicebotEnvelope =
  | { ok: true; request_id: string; data: Record<string, unknown> }
  | { ok: false; request_id: string; error: { code: VoicebotErrorCode; message: string; retryable: boolean; retry_after_ms: number | null } };

const statusFor = (code: VoicebotErrorCode) => ({
  NOT_AUTHENTICATED: 401, NOT_AUTHORISED: 403, VOICEBOT_DISABLED: 403,
  PATIENT_NOT_FOUND: 404, CONSENT_REQUIRED: 409, PATIENT_NOT_ENABLED: 409,
  CONFLICT: 409, UPSTREAM_TIMEOUT: 504, UPSTREAM_UNAVAILABLE: 502,
  UPSTREAM_CONTRACT_ERROR: 502, INVALID_REQUEST: 400, METHOD_NOT_ALLOWED: 405,
  INTERNAL_ERROR: 500,
}[code]);

const messageFor = (code: VoicebotErrorCode) => ({
  NOT_AUTHENTICATED: "Sign in to continue.", NOT_AUTHORISED: "You do not have access to this patient.",
  PATIENT_NOT_FOUND: "That patient is unavailable.", INVALID_REQUEST: "That request is not valid.",
  METHOD_NOT_ALLOWED: "That request is not valid.", VOICEBOT_DISABLED: "Voice Assistant is not enabled.",
  PATIENT_NOT_ENABLED: "Voice Assistant is not enabled.", CONSENT_REQUIRED: "Consent is required before enabling Voice Assistant.",
  UPSTREAM_TIMEOUT: "Voice Assistant took too long to respond.", UPSTREAM_UNAVAILABLE: "Voice Assistant is temporarily unavailable.",
  UPSTREAM_CONTRACT_ERROR: "Voice Assistant returned an invalid response.", CONFLICT: "Voice Assistant needs to synchronise again.",
  INTERNAL_ERROR: "Voice Assistant could not complete that request.",
}[code]);

function respond(body: VoicebotEnvelope, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export function success(requestId: string, data: Record<string, unknown>): Response {
  return respond({ ok: true, request_id: requestId, data }, 200);
}

export function failure(requestId: string, code: VoicebotErrorCode, retryAfterMs: number | null = null): Response {
  return respond({ ok: false, request_id: requestId, error: { code, message: messageFor(code), retryable: code === "UPSTREAM_TIMEOUT" || code === "UPSTREAM_UNAVAILABLE", retry_after_ms: retryAfterMs } }, statusFor(code));
}

function codeForThrown(value: unknown): VoicebotErrorCode {
  const status = typeof value === "object" && value !== null && "status" in value ? Number((value as { status: unknown }).status) : 500;
  if (status === 401) return "NOT_AUTHENTICATED";
  if (status === 403) return "NOT_AUTHORISED";
  if (status === 404) return "PATIENT_NOT_FOUND";
  return "INTERNAL_ERROR";
}

export async function guarded(random: () => string, work: (requestId: string) => Promise<Response>): Promise<Response> {
  const requestId = random();
  try { return await work(requestId); } catch (cause) { return failure(requestId, codeForThrown(cause)); }
}
