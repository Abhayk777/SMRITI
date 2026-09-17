# SMRITI VoiceBot Gateway — Flutter-Ready Contract v1

Status: proposed SMRITI-side contract. Reconcile with the current VoiceBot source
in WV-00 before implementation. Freeze as `v1` only after contract tests pass.

This contract deliberately hides the upstream VoiceBot URL and API key. Both the
caregiver web app and Flutter app authenticate with their existing Supabase session.

## 1. Identity and authentication

Every non-OPTIONS request sends:

```http
Authorization: Bearer <current Supabase access token>
Content-Type: application/json
```

Voice upload uses `multipart/form-data` instead of JSON.

The client sends `patient_id` only as a consistency assertion. The gateway derives
the authoritative identity from the verified Supabase user and current database
binding. It rejects a mismatch and always overwrites the upstream `user_id` with the
authorised SMRITI patient UUID.

Caregiver operations require current `caregiver` membership. Conversation operations
require the currently bound device user. A signed but replaced device JWT is invalid.

No request or response contains a VoiceBot API key, provider key, service-role key,
contact phone number, signed patient-media URL, or arbitrary upstream URL.

## 2. Common response envelope

JSON success:

```json
{
  "ok": true,
  "request_id": "opaque-id",
  "data": {}
}
```

JSON failure:

```json
{
  "ok": false,
  "request_id": "opaque-id",
  "error": {
    "code": "STABLE_ERROR_CODE",
    "message": "Safe user-facing summary",
    "retryable": false,
    "retry_after_ms": null
  }
}
```

Never forward raw provider bodies, stack traces, patient text, or credentials.

Minimum stable error codes:

```text
NOT_AUTHENTICATED
NOT_AUTHORISED
PATIENT_MISMATCH
DEVICE_REPLACED
VOICEBOT_DISABLED
PATIENT_NOT_ENABLED
SYNC_NOT_READY
UNSUPPORTED_LANGUAGE
INVALID_REQUEST
INVALID_WAV
PAYLOAD_TOO_LARGE
RATE_LIMITED
UPSTREAM_TIMEOUT
UPSTREAM_UNAVAILABLE
UPSTREAM_CONTRACT_ERROR
SESSION_NOT_FOUND
JOB_NOT_FOUND
AUDIO_NOT_FOUND
JOB_EXPIRED
CONFLICT
INTERNAL_ERROR
```

Use conventional HTTP status codes: 400 invalid input, 401 unauthenticated, 403
unauthorised/disabled, 404 owned resource absent, 409 conflict, 413 too large, 415
invalid media, 422 schema error, 429 rate limit, 502 invalid/upstream failure, and
504 timeout. Do not use 200 for a failed operation.

## 3. Caregiver API: `voicebot-admin`

Endpoint:

```text
POST /functions/v1/voicebot-admin
```

### Status

Request:

```json
{
  "operation": "status",
  "patient_id": "uuid"
}
```

Response data:

```json
{
  "enabled": true,
  "status": "ready",
  "desired_revision": 7,
  "applied_revision": 7,
  "last_attempt_at": "ISO-8601-or-null",
  "last_synced_at": "ISO-8601-or-null",
  "last_error_code": null,
  "retry_allowed": false,
  "language": {
    "smriti_code": "hi",
    "voicebot_code": "hin",
    "text_enabled": true,
    "asr_enabled": true,
    "tts_enabled": true,
    "measured": true
  }
}
```

### Enable, disable, retry

```json
{ "operation": "enable", "patient_id": "uuid" }
```

```json
{ "operation": "disable", "patient_id": "uuid" }
```

```json
{ "operation": "retry_sync", "patient_id": "uuid" }
```

The client cannot provide snapshot data, revision, upstream identity, capabilities,
or status. Responses return the same safe status shape.

## 4. Device API: `voicebot-gateway`

Endpoint:

```text
POST /functions/v1/voicebot-gateway
```

Each action includes a unique `client_request_id`. Keep conversation `session_id`
separate from SMRITI gameplay `sessions.id`.

### Welcome

Request:

```json
{
  "operation": "welcome",
  "patient_id": "uuid",
  "client_request_id": "uuid",
  "language": "eng",
  "speak": true
}
```

### Text conversation

Request:

```json
{
  "operation": "conversation_text",
  "patient_id": "uuid",
  "client_request_id": "uuid",
  "session_id": "opaque-id-or-null",
  "language": "eng",
  "message": "patient utterance",
  "speak": true
}
```

The gateway maps `client_request_id` to the upstream `X-Idempotency-Key` behavior.
The app must not automatically retry an ambiguous action-producing request with a
new ID.

Successful conversation data:

```json
{
  "session_id": "opaque-id",
  "kind": "CONVERSATION",
  "response_text": "Safe response text",
  "language": "eng",
  "action": "NO_ACTION",
  "action_accepted": false,
  "requires_confirmation": false,
  "job": {
    "job_id": "opaque-id-or-null",
    "status": "queued-or-null",
    "audio_available": false,
    "audio_unavailable_reason": "TTS_PROCESSING-or-null"
  }
}
```

Allowed `kind` values:

```text
COMMAND
CONVERSATION
MEMORY
CONFIRMATION
REFUSAL
FALLBACK
ERROR
```

Allowed action values for v1:

```text
OPEN_PLAY
OPEN_MY_PEOPLE
OPEN_TODAY
OPEN_MEDICINE
HELP
STOP
NO_ACTION
```

Unknown actions are treated as `NO_ACTION` locally and logged only by safe code.
Flutter may execute a non-`NO_ACTION` value only when `action_accepted` is exactly
true and the value is in its own compile-time allow-list. `STOP` must also work
locally without a network response.

### Voice conversation

Request is multipart:

```text
operation=conversation_voice
patient_id=<uuid>
client_request_id=<uuid>
session_id=<opaque optional>
language=<VoiceBot language code>
speak=true
audio_wav=<real RIFF/WAVE file>
```

The file must be a genuine supported WAV, not WebM/M4A renamed to `.wav`. The final
size/duration ceilings must match the current VoiceBot and Edge Function limits and
be frozen after WV-00. The response includes the same conversation fields plus the
ASR `transcript`. Do not execute the transcript.

### Job status

Request:

```json
{
  "operation": "job_status",
  "patient_id": "uuid",
  "job_id": "opaque-id"
}
```

Response data:

```json
{
  "job_id": "opaque-id",
  "status": "queued",
  "language": "eng",
  "audio_available": false,
  "audio_id": null,
  "error_code": null,
  "poll_after_ms": 1500
}
```

Valid states are `queued`, `processing`, `completed`, and `failed`. Poll only after
`poll_after_ms`, use bounded backoff, and stop on completion, failure, cancellation,
expiry, route exit, logout, or device replacement.

### Cancel job

```json
{
  "operation": "cancel_job",
  "patient_id": "uuid",
  "job_id": "opaque-id"
}
```

Cancellation is idempotent. A late completion must not play after local STOP or a
new interaction context.

### Fetch audio

```json
{
  "operation": "fetch_audio",
  "patient_id": "uuid",
  "audio_id": "opaque-id"
}
```

Success returns `audio/wav`, not the JSON envelope, with:

```http
Cache-Control: private, no-store
X-Content-Type-Options: nosniff
```

Audio IDs are short-lived and patient-owned. Fetch promptly; Flutter may keep only
an app-private temporary cache consistent with retention policy.

## 5. Flutter state machine

```text
IDLE
  -> LISTENING
  -> UPLOADING
  -> THINKING
  -> TEXT_READY
  -> TTS_QUEUED / TTS_PROCESSING
  -> PLAYING
  -> IDLE

Any active state -> CANCELLED / ERROR -> IDLE
```

Requirements for the future Flutter implementation:

- use the existing Supabase device session;
- record valid WAV within the frozen limits;
- render `response_text` before TTS completes;
- preserve `session_id` only for related turns;
- use a new local interaction generation so late responses cannot play;
- cancel polling/playback on STOP, route exit, logout, re-pairing, or replacement;
- give medicine alarms priority over assistant recording/playback;
- do not create game events merely because Games was opened;
- preserve touch UI, local reminders, games, downloads, and offline queue when the
  gateway or VoiceBot is unavailable.

## 6. Synchronised memory semantics

The sync worker, never Flutter/web, constructs a full replacement snapshot from
SMRITI. It must always include explicit arrays for family, medicines, and routine.

Mapping rules:

```text
patients.id                 -> VoiceBot user_id
patients.display_name       -> profile display name
patients.lang_code          -> canonical mapped VoiceBot code
patients.timezone           -> IANA timezone
people.id                   -> stable source ID
people.name                 -> family member name
people.relationship         -> relationship
people.memory_prompt        -> approved memory context
people.is_deceased          -> deceased state
medications.id              -> stable source ID
medications.name            -> medicine name
medications.dose            -> dose text
medications.days_of_week    -> canonical ISO weekday string
medications.chosen_time_min -> chosen integer minute
medications.window_*_min    -> allowed integer-minute window
medications.active          -> active state
routine_items.id            -> stable source ID
routine_items.time_min      -> integer minute
routine_items.label_key     -> meaningful label through approved mapping
```

The adapter must use the current upstream name `relationship`; do not send
`relation`. Do not place structured medicine time only into free-text instructions.

Empty arrays intentionally clear the corresponding caregiver-synchronised dataset.
Missing arrays are forbidden in the SMRITI v1 snapshot. A query error aborts sync
and preserves the last applied upstream snapshot.

## 7. Privacy, safety, and retention

- Do not expose private conversations to caregivers by default.
- Do not store transcripts or generated audio in Supabase unless a separately
  approved retention/spec change requires it.
- Never log request bodies for conversation/voice/sync operations.
- Redact upstream error bodies; store stable codes only.
- Do not forward raw contact numbers or permit arbitrary dialing.
- Do not treat a VoiceBot confirmation as execution of a call, reminder, medicine
  change, or game event.
- Disabling a patient must deny new requests immediately; remote data deletion can
  be a separately reported cleanup state but cannot delay access revocation.
- Consent is required before sending any approved patient content to VoiceBot.

## 8. Compatibility and acceptance

Existing web and tablet clients that know nothing about VoiceBot must continue to
work. New fields/tables/functions are additive and feature-disabled by default.

The gateway contract is ready for Flutter only when fake-upstream tests prove:

- correct/current device accepted;
- viewer, foreign caregiver/device, and replaced device rejected;
- patient ID cannot be forged;
- session/job/audio ownership cannot cross patients;
- input limits, timeouts, cancellation, expiry, and rate limits are deterministic;
- response/action enums are strictly validated;
- no credential appears in source, bundle, response, or logs;
- VoiceBot unavailability leaves all existing patient care behavior operational.

Real Flutter completion still requires physical-device tests for microphone
permission, genuine WAV, lifecycle/backgrounding, audio focus, alarm interruption,
polling, cancellation, playback, re-pairing, and supported-language speech.
