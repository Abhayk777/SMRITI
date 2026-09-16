import assert from "node:assert/strict";
import test from "node:test";
import { createVoicebotAdminHandler, createVoicebotSyncWorkerHandler } from "../../functions/_shared/voicebot_handlers.ts";

const patientId = "aaaaaaaa-0000-4000-8000-000000000001";
const requestId = "11111111-1111-4111-8111-111111111111";
const patient = { consent_given_at: "2026-01-01T00:00:00.000Z", archived_at: null, lang_code: "hi", display_name: "Test", timezone: "Asia/Kolkata" };
const state = { enabled: true, status: "ready", desired_revision: 1, applied_revision: 1, last_attempt_at: null, last_synced_at: null, last_error_code: null, next_attempt_at: null };

function query(result: any, onSelect?: (value: string) => void) {
  return {
    select(value: string) { onSelect?.(value); return this; },
    eq() { return this; },
    single: async () => result,
    maybeSingle: async () => result,
    upsert: async () => ({ error: null }),
    delete() { return this; },
    update() { return this; },
    then(resolve: any) { return Promise.resolve(result).then(resolve); },
  };
}

function dependencies(overrides: Record<string, unknown> = {}) {
  const db = {
    from(table: string) {
      if (table === "patients") return query({ data: patient, error: null });
      if (table === "voicebot_patient_state") return query({ data: state, error: null });
      if (table === "people" || table === "medications" || table === "routine_items") return query({ data: [], error: null });
      return query({ data: null, error: null });
    },
    rpc: async () => ({ data: [], error: null }),
  };
  return {
    admin: () => db,
    fetch: async () => new Response(JSON.stringify({ success: true, user_id: patientId, authorized: true, active: true })),
    env: (name: string) => ({ VOICEBOT_INTEGRATION_ENABLED: "true", VOICEBOT_BASE_URL: "http://fake", VOICEBOT_API_KEY: "key", VOICEBOT_PROVISIONING_API_KEY: "provisioning" } as Record<string, string>)[name],
    now: () => new Date("2026-01-01T00:00:00.000Z"),
    random: () => requestId,
    authorizeCaregiver: async () => {},
    authorizeWorker: async () => true,
    log: () => {},
    ...overrides,
  };
}
const responseBody = (response: Response) => response.json() as Promise<any>;

test("admin returns contract envelopes for malformed and denied requests", async () => {
  const malformed = createVoicebotAdminHandler(dependencies() as any);
  const malformedResponse = await malformed(new Request("http://x", { method: "POST", body: "{}" }));
  assert.equal(malformedResponse.status, 400);
  assert.equal((await responseBody(malformedResponse)).request_id, requestId);
  const denied = createVoicebotAdminHandler(dependencies({ authorizeCaregiver: async () => { throw { status: 403 }; } }) as any);
  const deniedResponse = await denied(new Request("http://x", { method: "POST", body: JSON.stringify({ operation: "status", patient_id: patientId }) }));
  assert.equal(deniedResponse.status, 403);
  assert.equal((await responseBody(deniedResponse)).error.code, "NOT_AUTHORISED");
});

test("admin status returns the complete safe status contract", async () => {
  const handler = createVoicebotAdminHandler(dependencies() as any);
  const response = await handler(new Request("http://x", { method: "POST", body: JSON.stringify({ operation: "status", patient_id: patientId }) }));
  const value = await responseBody(response);
  assert.equal(response.status, 200);
  assert.equal(value.ok, true);
  assert.equal(value.data.language.voicebot_code, "hin");
  assert.equal(value.data.measured, undefined);
  assert.equal(value.data.last_synced_at, null);
  assert.equal(value.data.retry_allowed, false);
});

test("admin checks mutation and queue failures", async () => {
  const db = { from: (table: string) => table === "patients" ? query({ data: patient, error: null }) : query({ data: state, error: null }), rpc: async () => ({ data: null, error: { message: "db" } }) };
  const handler = createVoicebotAdminHandler(dependencies({ admin: () => db }) as any);
  const response = await handler(new Request("http://x", { method: "POST", body: JSON.stringify({ operation: "enable", patient_id: patientId }) }));
  assert.equal(response.status, 500);
  assert.equal((await responseBody(response)).error.code, "INTERNAL_ERROR");
});

test("admin disable uses the bounded transport and validates durable revocation", async () => {
  const calls: RequestInit[] = [];
  const handler = createVoicebotAdminHandler(dependencies({ fetch: async (_url: string, init: RequestInit) => { calls.push(init); return new Response(JSON.stringify({ success: true, user_id: patientId, authorized: false, active: false })); } }) as any);
  const response = await handler(new Request("http://x", { method: "POST", body: JSON.stringify({ operation: "disable", patient_id: patientId }) }));
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(String(calls[0].body)), { authorized: false, active: false });
  assert.equal(calls[0].redirect, "error");
});

function workerDependencies(overrides: Record<string, unknown> = {}) {
  const selected: string[] = [];
  const db = {
    from(table: string) {
      if (table === "voicebot_patient_state") return query({ data: { enabled: true }, error: null }, (value) => selected.push(value));
      if (table === "patients") return query({ data: patient, error: null }, (value) => selected.push(value));
      if (table === "people" || table === "medications" || table === "routine_items") return query({ data: [], error: null }, (value) => selected.push(value));
      if (table === "voicebot_sync_queue") return query({ data: { attempts: 1 }, error: null }, (value) => selected.push(value));
      return query({ data: null, error: null }, (value) => selected.push(value));
    },
    rpc: async () => ({ data: [{ patient_id: patientId, revision: 1 }], error: null }),
  };
  let calls = 0;
  const fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify(calls === 1
      ? { success: true, user_id: patientId, authorized: true, active: true }
      : { success: true, user_id: patientId, source_revision: 1, status: "applied" }));
  };
  return { deps: dependencies({ admin: () => db, fetch, ...overrides }), selected, calls: () => calls };
}

test("worker uses approved snapshot fields and validates provision then sync", async () => {
  const fixture = workerDependencies();
  const handler = createVoicebotSyncWorkerHandler(fixture.deps as any);
  const response = await handler(new Request("http://x", { method: "POST" }));
  assert.equal(response.status, 200);
  assert.equal(fixture.calls(), 2);
  assert.equal(fixture.selected.includes("*"), false);
});

test("worker source failure makes zero upstream calls and emits no raw error", async () => {
  let calls = 0; const logs: any[] = [];
  const db = { rpc: async () => ({ data: [{ patient_id: patientId, revision: 1 }], error: null }), from: (table: string) => table === "people" ? query({ data: null, error: { message: "private failure" } }) : table === "patients" ? query({ data: patient, error: null }) : query({ data: { enabled: true }, error: null }) };
  const handler = createVoicebotSyncWorkerHandler(dependencies({ admin: () => db, fetch: async () => { calls += 1; return new Response("{}"); }, log: (_event: string, fields: any) => logs.push(fields) }) as any);
  assert.equal((await handler(new Request("http://x", { method: "POST" }))).status, 200);
  assert.equal(calls, 0);
  assert.deepEqual(logs, [{ code: "INTERNAL_ERROR" }]);
});

test("worker failure uses the persisted claim attempt exactly once", async () => {
  const updates: any[] = [];
  const db = {
    rpc: async () => ({ data: [{ patient_id: patientId, revision: 1 }], error: null }),
    from(table: string) {
      if (table === "voicebot_sync_queue") return { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: { attempts: 3 }, error: null }), update(value: any) { updates.push(value); return this; }, then(resolve: any) { return Promise.resolve({ error: null }).then(resolve); } };
      if (table === "patients") return query({ data: patient, error: null });
      if (table === "voicebot_patient_state") return { select() { return this; }, eq() { return this; }, single: async () => ({ data: { enabled: true }, error: null }), update(value: any) { updates.push(value); return this; }, then(resolve: any) { return Promise.resolve({ error: null }).then(resolve); } };
      return query({ data: [], error: null });
    },
  };
  const handler = createVoicebotSyncWorkerHandler(dependencies({ admin: () => db, fetch: async () => { throw new Error("secret"); } }) as any);
  await handler(new Request("http://x", { method: "POST" }));
  assert.equal(updates.some((value) => value.attempt_count === 3), true);
});
