import { failure, guarded, success, type VoicebotErrorCode } from "./voicebot_envelope.ts";

export type VoicebotDeps = {
  admin: () => any; fetch: typeof fetch; env: (name: string) => string | undefined;
  now: () => Date; random: () => string;
  authorizeCaregiver: (req: Request, patientId: string) => Promise<void>;
  authorizeWorker: (req: Request) => Promise<boolean>;
  log: (event: string, fields?: Record<string, unknown>) => void;
};

type State = { enabled: boolean; status: string; desired_revision: number; applied_revision: number; last_attempt_at: string | null; last_synced_at: string | null; last_error_code: string | null; next_attempt_at: string | null };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_JSON_BYTES = 256 * 1024;
const isEnabled = (d: VoicebotDeps) => d.env("VOICEBOT_INTEGRATION_ENABLED") === "true";
const upstreamCode = (status?: number): VoicebotErrorCode => status === 409 ? "CONFLICT" : status === 408 ? "UPSTREAM_TIMEOUT" : status && status >= 500 ? "UPSTREAM_UNAVAILABLE" : "UPSTREAM_CONTRACT_ERROR";

function capability(langCode: string) {
  const voicebotCode = ({ en: "eng", hi: "hin", as: "asm", mni: "mni", kha: "kha", lus: "lus" } as Record<string, string>)[langCode] ?? langCode;
  return { smriti_code: langCode, voicebot_code: voicebotCode, text_enabled: false, asr_enabled: false, tts_enabled: false, measured: false };
}
function statusData(state: Partial<State> | null, langCode: string) {
  return { enabled: state?.enabled ?? false, status: state?.status ?? "disabled", desired_revision: Number(state?.desired_revision ?? 0), applied_revision: Number(state?.applied_revision ?? 0), last_attempt_at: state?.last_attempt_at ?? null, last_synced_at: state?.last_synced_at ?? null, last_error_code: state?.last_error_code ?? null, retry_allowed: Boolean(state?.enabled && state?.status === "error"), language: capability(langCode) };
}
function validStatus(value: ReturnType<typeof statusData>) {
  return typeof value.enabled === "boolean"
    && ["disabled", "pending", "syncing", "ready", "error", "unavailable"].includes(value.status)
    && Number.isSafeInteger(value.desired_revision) && value.desired_revision >= 0
    && Number.isSafeInteger(value.applied_revision) && value.applied_revision >= 0
    && typeof value.retry_allowed === "boolean"
    && typeof value.language.smriti_code === "string"
    && typeof value.language.voicebot_code === "string";
}
function validSync(body: Record<string, unknown>, patientId: string, revision: number) { return body.success === true && body.user_id === patientId && Number(body.source_revision) === revision && (body.status === "applied" || body.status === "no_op"); }
function validDeactivation(body: Record<string, unknown>, patientId: string) { return body.success === true && body.user_id === patientId && (body.status === "applied" || body.status === "no_op"); }

export async function voicebotJson(fetchFn: typeof fetch, url: string, init: RequestInit, timeoutMs = 8_000): Promise<{ response: Response; body: Record<string, unknown> }> {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchFn(url, { ...init, redirect: "error", signal: controller.signal });
    const length = Number(response.headers.get("content-length") ?? "0");
    if (Number.isFinite(length) && length > MAX_JSON_BYTES) throw new Error("UPSTREAM_CONTRACT_ERROR");
    const reader = response.body?.getReader(); if (!reader) throw new Error("UPSTREAM_CONTRACT_ERROR");
    const chunks: Uint8Array[] = []; let total = 0;
    for (;;) { const next = await reader.read(); if (next.done) break; total += next.value.byteLength; if (total > MAX_JSON_BYTES) throw new Error("UPSTREAM_CONTRACT_ERROR"); chunks.push(next.value); }
    const bytes = new Uint8Array(total); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const body = JSON.parse(new TextDecoder().decode(bytes)); if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("UPSTREAM_CONTRACT_ERROR");
    return { response, body: body as Record<string, unknown> };
  } catch (cause) {
    if (controller.signal.aborted || (cause instanceof DOMException && cause.name === "AbortError")) throw new Error("UPSTREAM_TIMEOUT");
    throw cause;
  } finally { clearTimeout(timer); }
}

async function stateFor(db: any, patientId: string): Promise<State | null> {
  const { data, error } = await db.from("voicebot_patient_state").select("enabled,status,desired_revision,applied_revision,last_attempt_at,last_synced_at,last_error_code,next_attempt_at").eq("patient_id", patientId).maybeSingle();
  if (error) throw error; return data as State | null;
}

export function createVoicebotAdminHandler(d: VoicebotDeps) {
  return async (req: Request) => guarded(d.random, async (requestId) => {
    if (req.method !== "POST") return failure(requestId, "METHOD_NOT_ALLOWED");
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || !["status", "enable", "disable", "retry_sync"].includes(String(body.operation)) || typeof body.patient_id !== "string" || !uuid.test(body.patient_id) || Object.keys(body).length !== 2) return failure(requestId, "INVALID_REQUEST");
    const patientId = body.patient_id; await d.authorizeCaregiver(req, patientId); const db = d.admin();
    const { data: patient, error: patientError } = await db.from("patients").select("consent_given_at,archived_at,lang_code").eq("id", patientId).single();
    if (patientError || !patient) return failure(requestId, "PATIENT_NOT_FOUND");
    if (body.operation === "enable") {
      if (!isEnabled(d)) return failure(requestId, "VOICEBOT_DISABLED");
      if (!patient.consent_given_at || patient.archived_at) return failure(requestId, "CONSENT_REQUIRED");
      const { error } = await db.from("voicebot_patient_state").upsert({ patient_id: patientId, enabled: true, status: "pending", updated_at: d.now().toISOString() }); if (error) throw error;
      const { error: queueError } = await db.rpc("enqueue_voicebot_sync", { p_patient_id: patientId }); if (queueError) throw queueError;
    } else if (body.operation === "retry_sync") {
      if (!isEnabled(d)) return failure(requestId, "VOICEBOT_DISABLED");
      if (!(await stateFor(db, patientId))?.enabled) return failure(requestId, "PATIENT_NOT_ENABLED");
      const { error } = await db.rpc("enqueue_voicebot_sync", { p_patient_id: patientId }); if (error) throw error;
    } else if (body.operation === "disable") {
      const { error: stateError } = await db.from("voicebot_patient_state").upsert({ patient_id: patientId, enabled: false, status: "disabled", updated_at: d.now().toISOString() }); if (stateError) throw stateError;
      const { error: queueError } = await db.from("voicebot_sync_queue").delete().eq("patient_id", patientId); if (queueError) throw queueError;
      if (isEnabled(d)) {
        const base = d.env("VOICEBOT_BASE_URL"), key = d.env("VOICEBOT_API_KEY");
        // Local disable always wins: the SMRITI gateway stops immediately even
        // if the optional upstream privacy cleanup is temporarily unavailable.
        if (!base || !key) {
          const { error } = await db.from("voicebot_patient_state").update({ last_error_code: "UPSTREAM_UNAVAILABLE" }).eq("patient_id", patientId);
          if (error) throw error;
        } else try {
          const response = await voicebotJson(d.fetch, `${base.replace(/\/$/, "")}/v1/memory/sync`, { method: "POST", headers: { "content-type": "application/json", "x-api-key": key }, body: JSON.stringify({ user_id: patientId, active: false, family_members: [], medicines: [], daily_routines: [] }) });
          if (!response.response.ok || !validDeactivation(response.body, patientId)) {
            const { error } = await db.from("voicebot_patient_state").update({ last_error_code: upstreamCode(response.response.status) }).eq("patient_id", patientId);
            if (error) throw error;
          }
        } catch (cause) {
          const code = cause instanceof Error && cause.message === "UPSTREAM_TIMEOUT" ? "UPSTREAM_TIMEOUT" : "UPSTREAM_UNAVAILABLE";
          const { error } = await db.from("voicebot_patient_state").update({ last_error_code: code }).eq("patient_id", patientId);
          if (error) throw error;
        }
      }
    }
    const data = statusData(await stateFor(db, patientId), patient.lang_code);
    if (!validStatus(data)) throw new Error("INTERNAL_ERROR");
    return success(requestId, data);
  });
}

const retryDelayMs = (attempts: number) => Math.min(3_600_000, 30_000 * 2 ** Math.min(Math.max(attempts - 1, 0), 6)) + ((attempts * 997) % 5_000);
export function createVoicebotSyncWorkerHandler(d: VoicebotDeps) {
  return async (req: Request) => guarded(d.random, async (requestId) => {
    if (req.method !== "POST") return failure(requestId, "METHOD_NOT_ALLOWED");
    if (!await d.authorizeWorker(req)) return failure(requestId, "NOT_AUTHORISED");
    if (!isEnabled(d)) return success(requestId, { results: [] });
    const db = d.admin(), token = d.random(); const { data: jobs, error } = await db.rpc("claim_voicebot_sync_jobs", { p_limit: 10, p_lock_token: token }); if (error) throw error;
    const results = await Promise.all((jobs ?? []).map(async (job: { patient_id: string; revision: number }) => {
      try {
        const [state, patient, people, medications, routines] = await Promise.all([
          db.from("voicebot_patient_state").select("enabled").eq("patient_id", job.patient_id).single(),
          db.from("patients").select("display_name,lang_code,timezone,archived_at").eq("id", job.patient_id).single(),
          db.from("people").select("id,name,relationship,memory_prompt,is_deceased").eq("patient_id", job.patient_id),
          db.from("medications").select("id,name,dose,active,days_of_week,chosen_time_min,window_start_min,window_end_min").eq("patient_id", job.patient_id),
          db.from("routine_items").select("id,time_min,label_key").eq("patient_id", job.patient_id),
        ]);
        if ([state, patient, people, medications, routines].some((result: any) => result.error)) throw new Error("INTERNAL_ERROR");
        if (!state.data.enabled || patient.data.archived_at) {
          const { error: deleteError } = await db.from("voicebot_sync_queue").delete().eq("patient_id", job.patient_id).eq("lock_token", token); if (deleteError) throw deleteError;
          return { patient_id: job.patient_id, success: true };
        }
        const base = d.env("VOICEBOT_BASE_URL"), apiKey = d.env("VOICEBOT_API_KEY"); if (!base || !apiKey) throw new Error("UPSTREAM_UNAVAILABLE");
        const payload = { user_id: job.patient_id, external_id: job.patient_id, display_name: patient.data.display_name, language_code: capability(patient.data.lang_code).voicebot_code, timezone: patient.data.timezone, active: true, source_revision: job.revision, schema_version: 1,
          family_members: people.data.map((item: any) => ({ external_id: item.id, name: item.name, relationship: item.relationship, memory_prompt: item.memory_prompt, is_deceased: item.is_deceased })),
          medicines: medications.data.map((item: any) => ({ external_id: item.id, name: item.name, dose: item.dose, active: item.active, days_of_week: item.days_of_week, chosen_time_min: item.chosen_time_min, window_start_min: item.window_start_min, window_end_min: item.window_end_min })),
          daily_routines: routines.data.map((item: any) => ({ external_id: item.id, time: `${String(Math.floor(item.time_min / 60)).padStart(2, "0")}:${String(item.time_min % 60).padStart(2, "0")}`, activity: item.label_key })), };
        if (!uuid.test(payload.user_id) || !Number.isSafeInteger(payload.source_revision) || payload.source_revision < 0 || !payload.medicines.every((item) => item.chosen_time_min >= 0 && item.chosen_time_min <= 1439 && item.window_start_min >= 0 && item.window_start_min <= 1439 && item.window_end_min >= 0 && item.window_end_min <= 1439)) throw new Error("UPSTREAM_CONTRACT_ERROR");
        const sync = await voicebotJson(d.fetch, `${base.replace(/\/$/, "")}/v1/memory/sync`, { method: "POST", headers: { "content-type": "application/json", "x-api-key": apiKey, "X-Idempotency-Key": `${job.patient_id}:${job.revision}` }, body: JSON.stringify(payload) });
        if (!(sync.response.ok || sync.response.status === 409) || !validSync(sync.body, job.patient_id, job.revision)) throw new Error(upstreamCode(sync.response.status));
        const { error: stateError } = await db.from("voicebot_patient_state").update({ status: "ready", applied_revision: job.revision, last_error_code: null, last_synced_at: d.now().toISOString(), next_attempt_at: null }).eq("patient_id", job.patient_id); if (stateError) throw stateError;
        const { error: deleteError } = await db.from("voicebot_sync_queue").delete().eq("patient_id", job.patient_id).eq("lock_token", token); if (deleteError) throw deleteError;
        return { patient_id: job.patient_id, success: true };
      } catch (cause) {
        const code: VoicebotErrorCode = cause instanceof Error && ["UPSTREAM_TIMEOUT", "UPSTREAM_UNAVAILABLE", "UPSTREAM_CONTRACT_ERROR", "CONFLICT"].includes(cause.message) ? cause.message as VoicebotErrorCode : "INTERNAL_ERROR";
        const { data: queued, error: queueError } = await db.from("voicebot_sync_queue").select("attempts").eq("patient_id", job.patient_id).eq("lock_token", token).maybeSingle(); if (queueError) throw queueError;
        const attempts = Math.max(1, Number(queued?.attempts ?? 1)); const at = new Date(d.now().getTime() + retryDelayMs(attempts)).toISOString();
        const { error: stateError } = await db.from("voicebot_patient_state").update({ status: "error", last_attempt_at: d.now().toISOString(), attempt_count: attempts, last_error_code: code, next_attempt_at: at }).eq("patient_id", job.patient_id); if (stateError) throw stateError;
        const { error: retryError } = await db.from("voicebot_sync_queue").update({ available_at: at, locked_until: null, lock_token: null, last_error_code: code }).eq("patient_id", job.patient_id).eq("lock_token", token); if (retryError) throw retryError;
        d.log("voicebot_sync_failed", { code }); return { patient_id: job.patient_id, success: false };
      }
    }));
    return success(requestId, { results });
  });
}
