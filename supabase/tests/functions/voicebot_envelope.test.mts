import assert from "node:assert/strict";
import test from "node:test";
import { failure, guarded, success } from "../../functions/_shared/voicebot_envelope.ts";

const requestId = "11111111-1111-4111-8111-111111111111";
const body = async (response: Response) => response.json() as Promise<any>;

test("success envelopes have an opaque request id and data", async () => {
  const response = success(requestId, { value: 1 });
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.deepEqual(await body(response), { ok: true, request_id: requestId, data: { value: 1 } });
});

test("known failures are sanitised and use their conventional status", async () => {
  const response = failure(requestId, "NOT_AUTHORISED");
  assert.equal(response.status, 403);
  assert.equal((await body(response)).error.code, "NOT_AUTHORISED");
});

test("factory boundary catches thrown errors without leaking details", async () => {
  const response = await guarded(() => requestId, async () => { throw new Error("secret patient transcript"); });
  const value = await body(response);
  assert.equal(response.status, 500);
  assert.equal(value.error.code, "INTERNAL_ERROR");
  assert.equal(JSON.stringify(value).includes("secret"), false);
});
