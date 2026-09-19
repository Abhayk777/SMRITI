import assert from "node:assert/strict";
import test from "node:test";
import { createVoicebotGatewayHandler } from "../../functions/_shared/voicebot_gateway_handler.ts";

const patientId = "aaaaaaaa-0000-4000-8000-000000000001";
const deviceId = "bbbbbbbb-0000-4000-8000-000000000001";
const requestId = "cccccccc-0000-4000-8000-000000000001";

function chain(result: unknown) {
  const value: any = { eq() { return value; }, select() { return value; }, maybeSingle: async () => result, insert: async () => ({ error: null }) };
  return value;
}
function db(options: { enabled?: boolean; status?: string; rateAllowed?: boolean; resource?: object | null } = {}) {
  return {
    from(table: string) {
      if (table === "patients") return chain({ data: { lang_code: "en", archived_at: null }, error: null });
      if (table === "voicebot_patient_state") return chain({ data: { enabled: options.enabled ?? true, status: options.status ?? "ready" }, error: null });
      if (table === "voicebot_gateway_resources") return chain({ data: options.resource ?? null, error: null });
      throw new Error(`unexpected table ${table}`);
    },
    rpc(name: string) { assert.equal(name, "claim_voicebot_gateway_request"); return Promise.resolve({ data: options.rateAllowed ?? true, error: null }); },
  };
}
function handler(options: { fetch?: typeof fetch; enabled?: boolean; status?: string; rateAllowed?: boolean; resource?: object | null; authorizeDevice?: () => Promise<{ id: string }>; integrationEnabled?: boolean } = {}) {
  const fetchImpl = options.fetch ?? (async () => new Response(JSON.stringify({ session_id: "session-1", kind: "CONVERSATION", response_text: "Hello", language: "eng", action: "CALL_ANYONE", action_accepted: true, requires_confirmation: false, job_id: null, job_status: null, audio_available: false }), { status: 200, headers: { "content-type": "application/json" } }));
  return createVoicebotGatewayHandler({ admin: () => db(options), fetch: fetchImpl, env: (key) => ({ VOICEBOT_INTEGRATION_ENABLED: options.integrationEnabled === false ? "false" : "true", VOICEBOT_BASE_URL: "https://voicebot.invalid", VOICEBOT_API_KEY: "not-a-real-key" })[key], random: () => "dddddddd-0000-4000-8000-000000000001", authorizeDevice: options.authorizeDevice ?? (async () => ({ id: deviceId })), log: () => undefined });
}

test("gateway binds only validated conversation fields and downgrades unknown actions", async () => {
  const response = await handler()(new Request("https://smriti.invalid", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operation: "conversation_text", patient_id: patientId, client_request_id: requestId, language: "eng", message: "Hello", speak: true }) }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.data.action, "NO_ACTION");
  assert.equal(body.data.action_accepted, false);
});

test("gateway rejects a request with a forged patient id before upstream traffic", async () => {
  let calls = 0;
  const response = await handler({ fetch: async () => { calls += 1; return new Response(); } })(new Request("https://smriti.invalid", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operation: "conversation_text", patient_id: "not-a-uuid", client_request_id: requestId, language: "eng", message: "Hello" }) }));
  assert.equal(response.status, 400);
  assert.equal(calls, 0);
});

test("gateway rejects unsupported operations and disabled integration before upstream traffic", async () => {
  let calls = 0;
  const request = (operation: string) => new Request("https://smriti.invalid", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operation, patient_id: patientId, client_request_id: requestId, language: "eng" }) });
  assert.equal((await handler({ fetch: async () => { calls += 1; return new Response(); } })(request("arbitrary_proxy"))).status, 400);
  assert.equal((await handler({ integrationEnabled: false, fetch: async () => { calls += 1; return new Response(); } })(request("welcome"))).status, 403);
  assert.equal(calls, 0);
});

test("gateway rejects non-WAV voice input before upstream traffic", async () => {
  let calls = 0;
  const form = new FormData(); form.set("operation", "conversation_voice"); form.set("patient_id", patientId); form.set("client_request_id", requestId); form.set("language", "eng"); form.set("audio_wav", new File(["not wav"], "voice.wav", { type: "audio/wav" }));
  const response = await handler({ fetch: async () => { calls += 1; return new Response(); } })(new Request("https://smriti.invalid", { method: "POST", body: form }));
  assert.equal(response.status, 415);
  assert.equal(calls, 0);
});

test("gateway forwards only a validated WAV under the authorised patient identity", async () => {
  let seen: FormData | null = null;
  const wav = new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 65, 86, 69]);
  const form = new FormData(); form.set("operation", "conversation_voice"); form.set("patient_id", patientId); form.set("client_request_id", requestId); form.set("language", "eng"); form.set("speak", "true"); form.set("audio_wav", new File([wav], "voice.wav", { type: "audio/wav" }));
  const response = await handler({ fetch: async (_url, init) => {
    seen = init?.body as FormData;
    return new Response(JSON.stringify({ session_id: "session-1", kind: "CONVERSATION", response_text: "Hello", language: "eng", action: "NO_ACTION", action_accepted: false, requires_confirmation: false, transcript: "Hello", job_id: null, job_status: null, audio_available: false }), { status: 200, headers: { "content-type": "application/json" } });
  } })(new Request("https://smriti.invalid", { method: "POST", body: form }));
  assert.equal(response.status, 200);
  assert.equal(seen?.get("user_id"), patientId);
  assert.equal(seen?.get("language"), "eng");
  assert.equal(seen?.get("speak"), "true");
});

test("gateway denies a replaced device before upstream traffic", async () => {
  let calls = 0;
  const response = await handler({ fetch: async () => { calls += 1; return new Response(); }, authorizeDevice: async () => { const error: any = new Error("replaced"); error.status = 403; throw error; } })(new Request("https://smriti.invalid", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operation: "welcome", patient_id: patientId, client_request_id: requestId, language: "eng" }) }));
  assert.equal(response.status, 403);
  assert.equal(calls, 0);
});

test("gateway refuses unsynchronised patients and rate-limited device traffic before upstream traffic", async () => {
  let calls = 0;
  const request = () => new Request("https://smriti.invalid", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operation: "welcome", patient_id: patientId, client_request_id: requestId, language: "eng" }) });
  assert.equal((await handler({ status: "pending", fetch: async () => { calls += 1; return new Response(); } })(request())).status, 409);
  assert.equal((await handler({ rateAllowed: false, fetch: async () => { calls += 1; return new Response(); } })(request())).status, 429);
  assert.equal(calls, 0);
});

test("gateway returns 404 for foreign opaque job IDs without upstream traffic", async () => {
  let calls = 0;
  const response = await handler({ fetch: async () => { calls += 1; return new Response(); } })(new Request("https://smriti.invalid", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operation: "job_status", patient_id: patientId, client_request_id: requestId, job_id: "job-other" }) }));
  assert.equal(response.status, 404);
  assert.equal(calls, 0);
});

test("gateway validates job status, cancellation, and private WAV retrieval", async () => {
  const resource = { expires_at: null, patient_id: patientId, device_user_id: deviceId };
  const json = (value: object) => new Response(JSON.stringify(value), { status: 200, headers: { "content-type": "application/json" } });
  const job = await handler({ resource, fetch: async () => json({ status: "completed", language: "eng", audio_available: true, audio_id: "audio-1", error_code: null }) })(new Request("https://smriti.invalid", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operation: "job_status", patient_id: patientId, client_request_id: requestId, job_id: "job-1" }) }));
  assert.equal(job.status, 200);
  const cancelled = await handler({ resource, fetch: async () => json({ success: true }) })(new Request("https://smriti.invalid", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operation: "cancel_job", patient_id: patientId, client_request_id: requestId, job_id: "job-1" }) }));
  assert.equal(cancelled.status, 200);
  const audio = await handler({ resource, fetch: async () => new Response(new Uint8Array([1, 2]), { status: 200, headers: { "content-type": "audio/wav", "content-length": "2" } }) })(new Request("https://smriti.invalid", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operation: "fetch_audio", patient_id: patientId, client_request_id: requestId, audio_id: "audio-1" }) }));
  assert.equal(audio.status, 200);
  assert.equal(audio.headers.get("cache-control"), "private, no-store");
  assert.equal(audio.headers.get("x-content-type-options"), "nosniff");
});

test("gateway maps malformed upstream conversation data to a safe failure", async () => {
  const response = await handler({ fetch: async () => new Response(JSON.stringify({ response_text: "missing required fields" }), { status: 200, headers: { "content-type": "application/json" } }) })(new Request("https://smriti.invalid", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ operation: "welcome", patient_id: patientId, client_request_id: requestId, language: "eng" }) }));
  assert.equal(response.status, 502);
  const body = await response.json();
  assert.equal(body.error.code, "UPSTREAM_CONTRACT_ERROR");
});
