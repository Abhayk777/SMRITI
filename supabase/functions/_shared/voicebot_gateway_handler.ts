import { failure, guarded, success, type VoicebotErrorCode } from "./voicebot_envelope.ts";
import { voicebotJson } from "./voicebot_handlers.ts";

type Resource = "session" | "job" | "audio";
type Device = { id: string };
export type GatewayDeps = {
  admin: () => any; fetch: typeof fetch; env: (name: string) => string | undefined;
  random: () => string; authorizeDevice: (request: Request, patientId: string) => Promise<Device>;
  log: (event: string, fields?: Record<string, unknown>) => void;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const opaque = /^[A-Za-z0-9._:-]{1,256}$/;
const maxWavBytes = 10 * 1024 * 1024;
const kinds = new Set(["COMMAND", "CONVERSATION", "MEMORY", "CONFIRMATION", "REFUSAL", "FALLBACK", "ERROR"]);
const actions = new Set(["OPEN_PLAY", "OPEN_MY_PEOPLE", "OPEN_TODAY", "OPEN_MEDICINE", "HELP", "STOP", "NO_ACTION"]);
const upstreamCode = (status?: number): VoicebotErrorCode => status === 409 ? "CONFLICT" : status && status >= 500 ? "UPSTREAM_UNAVAILABLE" : "UPSTREAM_CONTRACT_ERROR";
const validOpaque = (value: unknown) => typeof value === "string" && opaque.test(value) ? value : null;
const validText = (value: unknown, max: number) => typeof value === "string" && value.trim() && value.length <= max ? value : null;
const language = (value: unknown, patientLanguage: string) => ({ en: "eng", hi: "hin" } as Record<string, string>)[patientLanguage] === value ? value as string : null;

async function owned(db: any, type: Resource, id: string, patientId: string, deviceId: string): Promise<VoicebotErrorCode | null> {
  const { data, error } = await db.from("voicebot_gateway_resources").select("expires_at")
    .eq("resource_type", type).eq("upstream_id", id).eq("patient_id", patientId).eq("device_user_id", deviceId).maybeSingle();
  if (error) throw error;
  if (!data) return type === "session" ? "SESSION_NOT_FOUND" : type === "job" ? "JOB_NOT_FOUND" : "AUDIO_NOT_FOUND";
  return data.expires_at && Date.parse(data.expires_at) <= Date.now() ? "JOB_EXPIRED" : null;
}

async function bind(db: any, type: Resource, id: unknown, patientId: string, deviceId: string, expiresAt?: unknown) {
  const value = validOpaque(id); if (!value) return;
  const { data: existing, error: lookupError } = await db.from("voicebot_gateway_resources").select("patient_id,device_user_id")
    .eq("resource_type", type).eq("upstream_id", value).maybeSingle();
  if (lookupError) throw lookupError;
  if (existing && (existing.patient_id !== patientId || existing.device_user_id !== deviceId)) throw new Error("resource collision");
  if (existing) return;
  const { error } = await db.from("voicebot_gateway_resources").insert({ resource_type: type, upstream_id: value, patient_id: patientId, device_user_id: deviceId,
    ...(typeof expiresAt === "string" && !Number.isNaN(Date.parse(expiresAt)) ? { expires_at: expiresAt } : {}) });
  if (error) throw error;
}

async function ready(deps: GatewayDeps, request: Request, candidate: unknown) {
  if (typeof candidate !== "string" || !uuid.test(candidate)) return "INVALID_REQUEST" as const;
  const device = await deps.authorizeDevice(request, candidate);
  if (deps.env("VOICEBOT_INTEGRATION_ENABLED") !== "true") return "VOICEBOT_DISABLED" as const;
  const db = deps.admin();
  const [{ data: patient, error: patientError }, { data: state, error: stateError }] = await Promise.all([
    db.from("patients").select("lang_code,archived_at").eq("id", candidate).maybeSingle(),
    db.from("voicebot_patient_state").select("enabled,status").eq("patient_id", candidate).maybeSingle(),
  ]);
  if (patientError || stateError) throw patientError ?? stateError;
  if (!patient || patient.archived_at) return "PATIENT_NOT_FOUND" as const;
  if (!state?.enabled) return "PATIENT_NOT_ENABLED" as const;
  if (state.status !== "ready") return "SYNC_NOT_READY" as const;
  return { db, patientId: candidate, deviceId: device.id, patientLanguage: patient.lang_code };
}

function conversation(payload: Record<string, unknown>, transcript = false): Record<string, unknown> | null {
  const sessionId = validOpaque(payload.session_id), kind = typeof payload.kind === "string" && kinds.has(payload.kind) ? payload.kind : null;
  const responseText = validText(payload.response_text, 8_000), resultLanguage = validText(payload.language, 16);
  if (!sessionId || !kind || !responseText || !resultLanguage || typeof payload.action_accepted !== "boolean" || typeof payload.requires_confirmation !== "boolean") return null;
  const action = typeof payload.action === "string" && actions.has(payload.action) ? payload.action : "NO_ACTION";
  const jobId = payload.job_id == null ? null : validOpaque(payload.job_id);
  if (payload.job_id != null && !jobId) return null;
  const jobStatus = payload.job_status == null ? null : validText(payload.job_status, 32)?.toLowerCase();
  if (jobStatus && !["queued", "processing", "completed", "failed"].includes(jobStatus)) return null;
  if (transcript && !validText(payload.transcript, 8_000)) return null;
  return { session_id: sessionId, kind, response_text: responseText, language: resultLanguage, action,
    action_accepted: action !== "NO_ACTION" && payload.action_accepted === true, requires_confirmation: payload.requires_confirmation,
    ...(transcript ? { transcript: payload.transcript } : {}),
    job: { job_id: jobId, status: jobStatus, audio_available: payload.audio_available === true, audio_unavailable_reason: typeof payload.audio_unavailable_reason === "string" ? payload.audio_unavailable_reason : null } };
}

function jsonCall(deps: GatewayDeps, path: string, key: string, method: "GET" | "POST", body?: Record<string, unknown>, requestId?: string) {
  const base = deps.env("VOICEBOT_BASE_URL"); if (!base) throw new Error("UPSTREAM_UNAVAILABLE");
  return voicebotJson(deps.fetch, `${base.replace(/\/$/, "")}${path}`, { method, headers: { "x-api-key": key, ...(body ? { "content-type": "application/json" } : {}), ...(requestId ? { "X-Idempotency-Key": requestId } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
}

function failureCode(cause: unknown): VoicebotErrorCode {
  const status = typeof cause === "object" && cause !== null && "status" in cause ? Number((cause as { status: unknown }).status) : 0;
  if (status === 401) return "NOT_AUTHENTICATED";
  if (status === 403) return "NOT_AUTHORISED";
  if (status === 404) return "PATIENT_NOT_FOUND";
  return cause instanceof Error && ["UPSTREAM_TIMEOUT", "UPSTREAM_UNAVAILABLE", "UPSTREAM_CONTRACT_ERROR", "CONFLICT"].includes(cause.message) ? cause.message as VoicebotErrorCode : "INTERNAL_ERROR";
}

export function createVoicebotGatewayHandler(deps: GatewayDeps) {
  return async (request: Request): Promise<Response> => guarded(deps.random, async (requestId) => {
    if (request.method !== "POST") return failure(requestId, "METHOD_NOT_ALLOWED");
    try {
      const multipart = (request.headers.get("content-type") ?? "").includes("multipart/form-data");
      const input = multipart ? await request.formData() : await request.json().catch(() => null);
      if (!input || (!multipart && (typeof input !== "object" || Array.isArray(input)))) return failure(requestId, "INVALID_REQUEST");
      const get = (name: string): unknown => multipart ? (input as FormData).get(name) : (input as Record<string, unknown>)[name];
      const state = await ready(deps, request, get("patient_id"));
      if (typeof state === "string") return failure(requestId, state, state === "RATE_LIMITED" ? 60_000 : null);
      const clientId = typeof get("client_request_id") === "string" && uuid.test(get("client_request_id") as string) ? get("client_request_id") as string : null;
      if (!clientId) return failure(requestId, "INVALID_REQUEST");
      const { data: allowed, error: rateError } = await state.db.rpc("claim_voicebot_gateway_request", { p_patient_id: state.patientId, p_device_user_id: state.deviceId });
      if (rateError || typeof allowed !== "boolean") throw rateError ?? new Error("rate limit error");
      if (!allowed) return failure(requestId, "RATE_LIMITED", 60_000);
      const apiKey = deps.env("VOICEBOT_API_KEY"); if (!apiKey) return failure(requestId, "UPSTREAM_UNAVAILABLE");
      const operation = get("operation");

      if (multipart) {
        if (operation !== "conversation_voice") return failure(requestId, "INVALID_REQUEST");
        const code = language(get("language"), state.patientLanguage); if (!code) return failure(requestId, "UNSUPPORTED_LANGUAGE");
        const sessionId = get("session_id"); if (sessionId) { const id = validOpaque(sessionId); if (!id) return failure(requestId, "INVALID_REQUEST"); const owner = await owned(state.db, "session", id, state.patientId, state.deviceId); if (owner) return failure(requestId, owner); }
        const wav = get("audio_wav"); if (!(wav instanceof File)) return failure(requestId, "INVALID_WAV");
        if (wav.size > maxWavBytes) return failure(requestId, "PAYLOAD_TOO_LARGE");
        const bytes = new Uint8Array(await wav.arrayBuffer()); if (bytes.length < 12 || String.fromCharCode(...bytes.slice(0, 4)) !== "RIFF" || String.fromCharCode(...bytes.slice(8, 12)) !== "WAVE") return failure(requestId, "INVALID_WAV");
        const form = new FormData(); form.set("audio_wav", wav); form.set("user_id", state.patientId); form.set("language", code); form.set("speak", get("speak") === "true" ? "true" : "false"); if (typeof sessionId === "string" && sessionId) form.set("session_id", sessionId);
        const base = deps.env("VOICEBOT_BASE_URL"); if (!base) return failure(requestId, "UPSTREAM_UNAVAILABLE");
        const upstream = await voicebotJson(deps.fetch, `${base.replace(/\/$/, "")}/v1/conversation/voice`, { method: "POST", headers: { "x-api-key": apiKey, "X-Idempotency-Key": clientId }, body: form });
        const data = upstream.response.ok ? conversation(upstream.body, true) : null;
        if (!data) return failure(requestId, upstreamCode(upstream.response.status));
        await bind(state.db, "session", data.session_id, state.patientId, state.deviceId); await bind(state.db, "job", (data.job as Record<string, unknown>).job_id, state.patientId, state.deviceId); return success(requestId, data);
      }

      if (operation === "welcome" || operation === "conversation_text") {
        const code = language(get("language"), state.patientLanguage); if (!code) return failure(requestId, "UNSUPPORTED_LANGUAGE");
        const sessionId = get("session_id"); if (sessionId) { const id = validOpaque(sessionId); if (!id) return failure(requestId, "INVALID_REQUEST"); const owner = await owned(state.db, "session", id, state.patientId, state.deviceId); if (owner) return failure(requestId, owner); }
        const body: Record<string, unknown> = { user_id: state.patientId, language: code, speak: get("speak") === true, ...(typeof sessionId === "string" && sessionId ? { session_id: sessionId } : {}) };
        const path = operation === "welcome" ? "/v1/conversation/welcome" : "/v1/conversation";
        if (operation === "conversation_text") { const message = validText(get("message"), 4_000); if (!message) return failure(requestId, "INVALID_REQUEST"); body.message = message; }
        const upstream = await jsonCall(deps, path, apiKey, "POST", body, clientId), data = upstream.response.ok ? conversation(upstream.body) : null;
        if (!data) return failure(requestId, upstreamCode(upstream.response.status));
        await bind(state.db, "session", data.session_id, state.patientId, state.deviceId); await bind(state.db, "job", (data.job as Record<string, unknown>).job_id, state.patientId, state.deviceId); return success(requestId, data);
      }

      if (!["job_status", "cancel_job", "fetch_audio"].includes(String(operation))) return failure(requestId, "INVALID_REQUEST");
      const resourceType: Resource = operation === "fetch_audio" ? "audio" : "job", resourceId = validOpaque(get(operation === "fetch_audio" ? "audio_id" : "job_id"));
      if (!resourceId) return failure(requestId, "INVALID_REQUEST"); const owner = await owned(state.db, resourceType, resourceId, state.patientId, state.deviceId); if (owner) return failure(requestId, owner);
      if (operation === "cancel_job") { const upstream = await jsonCall(deps, `/v1/voice/jobs/${encodeURIComponent(resourceId)}/cancel`, apiKey, "POST", {}, clientId); if (!upstream.response.ok || upstream.body.success !== true) return failure(requestId, upstreamCode(upstream.response.status)); return success(requestId, { job_id: resourceId, cancelled: true }); }
      if (operation === "job_status") { const upstream = await jsonCall(deps, `/v1/voice/jobs/${encodeURIComponent(resourceId)}`, apiKey, "GET"); const status = typeof upstream.body.status === "string" ? upstream.body.status.toLowerCase() : null; const audioId = upstream.body.audio_id == null ? null : validOpaque(upstream.body.audio_id); if (!upstream.response.ok || !status || !["queued", "processing", "completed", "failed"].includes(status) || (upstream.body.audio_id != null && !audioId)) return failure(requestId, upstreamCode(upstream.response.status)); await bind(state.db, "audio", audioId, state.patientId, state.deviceId, upstream.body.audio_expires_at); return success(requestId, { job_id: resourceId, status, language: validText(upstream.body.language, 16), audio_available: upstream.body.audio_available === true, audio_id: audioId, error_code: typeof upstream.body.error_code === "string" ? upstream.body.error_code : null, poll_after_ms: 1_500 }); }
      const base = deps.env("VOICEBOT_BASE_URL"); if (!base) return failure(requestId, "UPSTREAM_UNAVAILABLE");
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15_000);
      try {
        const upstream = await deps.fetch(`${base.replace(/\/$/, "")}/v1/audio/${encodeURIComponent(resourceId)}`, { headers: { "x-api-key": apiKey }, redirect: "error", signal: controller.signal });
        const declared = Number(upstream.headers.get("content-length") ?? "0");
        if (!upstream.ok || !upstream.body || !/^audio\/(wav|x-wav)(;|$)/i.test(upstream.headers.get("content-type") ?? "") || (Number.isFinite(declared) && declared > maxWavBytes)) return failure(requestId, upstreamCode(upstream.status));
        let total = 0;
        const bounded = upstream.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({ transform(chunk, sink) { total += chunk.byteLength; if (total > maxWavBytes) { controller.abort(); throw new Error("audio exceeds limit"); } sink.enqueue(chunk); } }));
        return new Response(bounded, { status: 200, headers: { "content-type": "audio/wav", "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
      } catch (cause) {
        return failure(requestId, controller.signal.aborted ? "UPSTREAM_TIMEOUT" : failureCode(cause));
      } finally { clearTimeout(timer); }
    } catch (cause) { const code = failureCode(cause); deps.log("voicebot_gateway_failed", { code }); return failure(requestId, code); }
  });
}
