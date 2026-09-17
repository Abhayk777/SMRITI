# SMRITI VoiceBot Web/Backend Integration — Coding Agent Handoff

Status: implementation plan only. No item in this file is complete until its gate
and evidence requirements pass.

Branch: implement only on `integration/complete-ml` unless the owner explicitly
changes the target branch.

Companion contract: `VOICEBOT-FLUTTER-READY-CONTRACT.md`.

## 1. Goal

Connect the existing SMRITI Supabase backend and caregiver web dashboard to the
separate SMRITI VoiceBot service without disrupting patient creation, pairing,
content downloads, medicine reminders, escalation, media, games, or reports.

This package must deliver:

- opt-in VoiceBot enablement for an authorised patient;
- durable, asynchronous synchronisation of approved caregiver content;
- honest caregiver-visible availability and last-sync status;
- a server-side gateway for text, welcome, WAV voice submission, TTS job polling,
  cancellation, and audio retrieval;
- strict patient, session, job, and audio ownership;
- a stable contract that the Flutter app can consume later without placing any
  VoiceBot/provider credential in the app;
- a kill switch that disables VoiceBot while every existing care feature continues.

It must not add a caregiver chat transcript or microphone interface to the web app.
The patient conversation is private and belongs on the paired patient device. The
web app owns configuration/status; the future Flutter client owns conversation and
playback.

## 2. Required reading and authority order

Before editing anything, read in this order:

1. `AGENTS.md`
2. `docs/INDEX.md`
3. `docs/backend-spec.md` sections 0, 1, 2, 3, 4, 5, 8, 10, and 12 in full
4. `TASKS.md`
5. this file in full
6. `VOICEBOT-FLUTTER-READY-CONTRACT.md` in full
7. the current VoiceBot repository source and its current versions of:
   `INTEGRATION_CONTRACT.md`, `API_INTEGRATION.md`, `SECURITY.md`,
   `LANGUAGE_SUPPORT.md`, `VOICEBOT_INTEGRATION_GUIDE.md`, and
   `BACKEND_VOICEBOT_INTEGRATION.md`

Authority order for contradictions:

1. current executable source and tests;
2. current versioned integration contract/OpenAPI description;
3. current repository specifications;
4. handoff prose and historical reports.

Stop and report a contradiction rather than silently choosing a convenient shape.
Do not edit files in `docs/` or `analysis/`.

## 3. Proven current boundaries

SMRITI remains the source of truth for:

- patient UUID, profile, language, and timezone;
- patient membership and caregiver/device authorisation;
- people, medicines, routines, media paths, pairing, events, sessions, reminders,
  escalation, reports, and device state.

VoiceBot remains the source of truth for:

- ASR, language detection, conversational processing, safety, deterministic
  commands, LLM/tool routing, VoiceBot memory, TTS jobs, and generated audio.

Integration uses HTTPS APIs only. Never access VoiceBot SQLite directly.

The following fields may be synchronised:

- patient: UUID, display name, canonical language, IANA timezone, active state;
- people: stable source ID, name, relationship, memory prompt, deceased state;
- medicines: stable source ID, name, dose, active state, comma-separated ISO
  weekdays, chosen time, and allowed start/end minutes;
- routine: stable source ID, meaningful label, and time in integer minutes.

Never synchronise:

- phone numbers or escalation configuration;
- photos, recorded caregiver/family voices, signed URLs, or Storage credentials;
- memos, raw gameplay events, scores, reports, caregiver membership, or audit logs;
- secrets, access tokens, refresh tokens, or provider credentials.

The existing tablet content RPC remains the only source for normal tablet content.
VoiceBot sync is an additional derived copy and must never delay or replace it.

## 4. Feature scope

### Enable in the core release

- English and Hindi text conversation after live capability checks.
- English and Hindi WAV input and asynchronous spoken output after real end-to-end
  validation for each language.
- Patient-aware answers using the approved profile/people/medicine/routine snapshot.
- Welcome messages and persistent multi-turn VoiceBot sessions.
- Safe navigation proposals: `OPEN_PLAY`, `OPEN_MY_PEOPLE`, `OPEN_TODAY`,
  `OPEN_MEDICINE`, `HELP`, and local `STOP`.
- Safety refusals, confirmation state, cancellation, idempotency, revocation,
  capability reporting, and caregiver sync status/retry.

### Keep disabled until separately implemented and accepted

- real phone calls from VoiceBot;
- reminder/alarm creation by conversation;
- medication creation, editing, deletion, or adherence confirmation by VoiceBot;
- arbitrary URLs, phone numbers, tool names, or model-provided commands;
- specific game launch unless the returned identifier maps to an actual allow-listed
  Flutter game ID;
- unsupported or unvalidated language combinations;
- caregiver access to patient conversation text/audio;
- a production rollout to arbitrary patients.

The upstream VoiceBot must not advertise success for disabled tools. Before enabling
any patient, confirm that call/reminder/game side-effect tools are actually disabled
server-side or return an explicit unavailable result. Filtering only in Flutter is
not sufficient because generated speech could still claim an action happened.

## 5. Known contract details that must not regress

- Use `family_members[].relationship`, not `relation`.
- Send `X-Idempotency-Key`; do not assume the undocumented
  `Idempotency-Key` spelling.
- Treat HTTP `409` as the conflict response for stale or equal-but-different sync
  revisions unless current VoiceBot source proves a newer contract.
- Always send all three snapshot arrays explicitly. The current service defaults
  omitted arrays to empty and replacement sync can otherwise erase memory.
- Never translate a failed SMRITI query into an empty array.
- Supabase stores times as integer minutes in the range 0–1439.
- SMRITI writes medicine weekdays as canonical comma-separated ISO values 1–7.
- Use patient timezone for date/time meaning. Never use the Edge Function host or
  caregiver browser timezone.
- Never execute `transcript`, `response_text`, a URL, or an arbitrary tool name.
  Only an allow-listed action with `action_accepted === true` is eligible for the
  future Flutter client, and that still means “approved proposal,” not proof that
  an external side effect succeeded.

## 6. Proposed backend architecture

Use three small Edge Functions and shared modules instead of a generic proxy:

```text
Caregiver web
    |
    | Supabase JWT
    v
voicebot-admin  -------- status / enable / disable / retry
    |
    v
voicebot integration state + durable sync queue
    |
    | internal authenticated dispatch
    v
voicebot-sync-worker ---- fixed VoiceBot provisioning/sync APIs

Future paired Flutter device
    |
    | device Supabase JWT
    v
voicebot-gateway -------- fixed conversation/job/audio operations
    |
    | server-held VoiceBot credential
    v
VoiceBot HTTPS service
```

Do not build an endpoint that accepts an upstream URL, arbitrary path, arbitrary
headers, arbitrary `user_id`, or arbitrary HTTP method.

All upstream configuration is server-only:

- `VOICEBOT_BASE_URL`
- `VOICEBOT_API_KEY`
- `VOICEBOT_INTEGRATION_ENABLED`
- an internal worker secret if the existing cron convention requires one

Do not put any of these under `web/`, in `VITE_*`, in logs, fixtures, reports, or
commits. The base URL may be non-secret operationally, but it still belongs in
server configuration so environments cannot drift through hard-coded source.

## 7. Proposed database extension — approval gate

The current backend specification has no VoiceBot schema. Therefore the coding
agent must first write the exact proposed migration and tests for review, and must
not apply it to a linked project until the owner approves the schema extension.

Use the next unique migration number after inspecting the repository; it is expected
to be `0022`, but never assume this if another migration appears.

Keep the schema minimal:

### `voicebot_patient_state`

One row per explicitly configured patient:

- `patient_id uuid primary key` referencing `patients(id) on delete cascade`;
- `enabled boolean not null default false`;
- `desired_revision bigint not null default 0`;
- `applied_revision bigint not null default 0`;
- `status text not null` constrained to
  `disabled | pending | syncing | ready | error | unavailable`;
- `last_attempt_at timestamptz`;
- `last_synced_at timestamptz`;
- `last_error_code text` containing a sanitised stable code only;
- `attempt_count integer not null default 0`;
- `next_attempt_at timestamptz`;
- `created_at` and `updated_at` timestamps.

RLS requirements:

- enable RLS in the same migration;
- caregiver may select the row only for their patient;
- family viewers, devices, and anonymous callers cannot read it directly;
- no browser/device insert, update, or delete policy;
- enable/disable/retry happens through the authorised Edge Function;
- service-role use remains confined to Edge Functions.

### `voicebot_sync_queue`

One coalesced pending job per patient:

- `patient_id uuid primary key` referencing `patients(id) on delete cascade`;
- `revision bigint not null`;
- `available_at timestamptz not null`;
- `locked_until timestamptz`;
- `attempts integer not null default 0`;
- `created_at` and `updated_at` timestamps.

RLS requirements:

- enable RLS in the same migration;
- create no client policies; only server-side workers access it;
- never expose its rows through a browser view.

### Queue triggers

Create local, transactional triggers only. Never call the VoiceBot from a database
trigger or block a caregiver save on external HTTP.

When integration is enabled, enqueue/coalesce after:

- insert/update/delete on `people`, `medications`, or `routine_items`;
- changes to `patients.display_name`, `patients.lang_code`, `patients.timezone`,
  or `patients.archived_at`.

Increment the VoiceBot-specific desired revision without changing the tablet's
existing `content_version` semantics. Disabling integration must stop dispatch and
prevent pending jobs from reaching VoiceBot. Re-enabling must enqueue one complete,
current snapshot.

All trigger functions must use fixed `search_path`, and policies must wrap
`auth.uid()` as `(select auth.uid())`.

## 8. Shared local contracts

Add versioned Zod/TypeScript contracts in `packages/shared/` and mirror anything
needed by Deno under `supabase/functions/_shared/` in the same commit.

Define these semantic models without leaking the upstream credential:

- `VoicebotSnapshotV1`
- `VoicebotIntegrationStatus`
- `VoicebotAdminRequest/Response`
- `VoicebotGatewayRequest/Response`
- `VoicebotCapability`
- `VoicebotErrorCode`

`VoicebotSnapshotV1` must contain a complete snapshot and an immutable revision.
Keep a small adapter between the SMRITI model and the current upstream VoiceBot
payload so upstream naming changes do not spread through the database or web app.

Validate both outgoing upstream requests and incoming upstream responses. Treat an
invalid upstream response as `UPSTREAM_CONTRACT_ERROR`, never as success.

## 9. Edge Function implementation

### 9.1 Shared modules

Add narrowly scoped helpers under `supabase/functions/_shared/`:

- caller authentication and paired-device verification;
- VoiceBot client with fixed endpoint templates, timeout, response-size limits,
  redirect rejection, and sanitised errors;
- snapshot construction and upstream adapter;
- integration-state transitions;
- per-patient/device rate limiting and idempotency validation.

Paired-device verification must check all of the following on every device request:

1. a valid Supabase bearer JWT;
2. signed `app_metadata.is_device === true`;
3. signed `app_metadata.patient_id` equals the requested patient UUID;
4. `patients.device_user_id` currently equals the JWT user ID;
5. the patient is not archived and VoiceBot integration is enabled.

The database binding check is mandatory: an old signed JWT must stop working after
device replacement.

### 9.2 `voicebot-admin`

Accept POST JSON only with the exact operation enum:

- `status`
- `enable`
- `disable`
- `retry_sync`

Require current caregiver membership for the exact `patient_id`. Reject family
viewers, health workers without caregiver role, devices, foreign caregivers, and
anonymous callers.

Behavior:

- `status`: return only enabled state, capability summary, sync status/revisions,
  last timestamps, sanitised error code, and retry eligibility;
- `enable`: require `patients.consent_given_at` and the global server kill switch,
  create/update state, enqueue one full snapshot, and return `pending`;
- `disable`: immediately deny new gateway traffic, cancel local pending dispatch,
  and call the upstream deactivation/revocation API if the current VoiceBot contract
  supports it; report cleanup separately from access revocation;
- `retry_sync`: coalesce one job for the latest desired revision; never accept a
  client-provided snapshot or revision.

Do not return conversation history, transcripts, generated audio, upstream request
bodies, credentials, or raw upstream errors.

### 9.3 `voicebot-sync-worker`

Invoke only through the repository's established internal cron/worker authentication
pattern. Do not expose it as a caregiver operation.

For each leased job:

1. confirm global and patient enablement;
2. lease atomically with a bounded lease duration;
3. read one complete current snapshot from SMRITI;
4. fail without sending if any required query fails;
5. validate and adapt the snapshot;
6. provision/activate the exact patient UUID through the supported upstream contract;
7. send the complete replacement snapshot with `X-Idempotency-Key` derived from
   patient UUID + revision, never patient text;
8. on acknowledgement, advance `applied_revision` to exactly the sent revision;
9. if a newer desired revision exists, leave one coalesced pending job;
10. on failure, store only a stable sanitised code and schedule bounded exponential
    backoff with jitter.

Never mark a version applied from an HTTP transport success alone. Validate the
VoiceBot response and revision. Equal-revision idempotent acknowledgement is success;
stale or equal-but-different conflicts are explicit errors requiring investigation.

### 9.4 `voicebot-gateway`

Implement the exact operations in the companion contract. This function exists now
so Flutter later integrates against SMRITI, not directly against VoiceBot.

Rules:

- device-only by default;
- optionally allow caregiver text diagnostics only behind a server-side staging
  flag, with no action execution and no access to other sessions;
- overwrite upstream `user_id` with the authorised route patient UUID;
- fixed upstream endpoint per operation;
- no redirects with credentials;
- strict request size, WAV byte/header, duration, response-size, and timeout limits;
- bounded polling and per-patient/device rate limits;
- no automatic replay of an ambiguous action-producing request;
- audio responses use `Cache-Control: private, no-store`;
- sanitise upstream errors and never log transcripts, response text, WAV bytes,
  medication details, family notes, tokens, or credentials.

Conversation/session IDs, TTS job IDs, and audio IDs are opaque. The gateway must
bind them to the patient/device or rely on a proven upstream persistent ownership
check plus the exact authenticated patient identity. A shared upstream API key and
an opaque guessed ID must never be sufficient for access.

## 10. Caregiver web implementation

Add a compact Voice Assistant section to the existing patient management experience,
preferably the device page unless current layout review identifies a more natural
existing settings page. Preserve typography, spacing, components, and responsive
behavior. Do not redesign a page.

The section may show:

- `Unavailable`, `Off`, `Preparing`, `Ready`, or `Needs attention`;
- last successful sync time;
- whether a newer revision is pending;
- enabled language capability stated honestly;
- Enable/Disable and Retry controls for caregivers only;
- a concise note that voice is additional and ordinary tablet reminders continue
  when VoiceBot is unavailable.

Do not show:

- raw provider errors or configuration values;
- transcripts, response text, generated audio, or patient conversation history;
- unsupported-language claims;
- a success state based only on a hard-coded flag.

Required code rules:

- add all Supabase invocation functions to `web/src/lib/db.ts` only;
- add `qk.voicebotStatus(patientId)` to `web/src/lib/queryKeys.ts`;
- create a patient-scoped query/mutation hook under `web/src/features/voicebot/`;
- enable the query only after `PatientRoute` has validated the UUID and membership;
- invalidate only the exact patient-scoped status key after mutations;
- clear/cancel VoiceBot queries when switching patients;
- hide all mutations from non-caregiver roles and rely on server authorisation too;
- display mutation failures and offer retry only when safe;
- do not add a browser-visible VoiceBot key or direct VoiceBot `fetch` call.

If status needs live refresh, prefer focused polling while `pending/syncing` and stop
when terminal. Do not publish the server-only queue to Realtime.

## 11. Language behavior

Capability must come from the current VoiceBot capability endpoint, not marketing
copy or a constructible provider adapter. Track `configured`, `reachable`,
`measured`, and `enabled` separately.

Initial policy:

| SMRITI | VoiceBot | Core behavior |
|---|---|---|
| `en` | `eng` | eligible after real ASR + LLM + TTS validation |
| `hi` | `hin` | eligible after real ASR + LLM + TTS validation |
| `as` | `asm` | text-only unless current deployment proves TTS |
| `mni` | `mni` | unavailable unless current deployment proves full path |
| `kha` | `kha` | unavailable; preserve recorded-audio/touch fallback |
| `lus` | `lus` | unavailable; preserve recorded-audio/touch fallback |

Never silently speak Hindi or English for a requested unsupported language. Return
text with an explicit speech-unavailable reason when text is genuinely supported;
otherwise keep VoiceBot unavailable and leave existing tablet behavior untouched.

## 12. Test plan

### Database and RLS

Add focused SQL tests covering:

- caregiver can read only their patient's integration status;
- viewer, device, anonymous, and foreign caregiver cannot read/write state;
- no client can access the queue;
- enabled content/profile changes enqueue and coalesce;
- disabled patient changes do not dispatch;
- profile language/timezone/name changes enqueue without altering established
  tablet `content_version` behavior unexpectedly;
- deletion/archival disables access and prevents later dispatch;
- concurrent/reversed updates preserve the greatest desired revision.

### Edge Functions

Add deterministic tests with a fake upstream server for:

- missing/invalid JWT, viewer, foreign caregiver, forged patient ID;
- current paired device, replaced-device JWT, archived patient;
- unknown operation and attempted arbitrary URL/header/method injection;
- correct snapshot mapping, explicit empty arrays, failed source query, stale and
  conflicting revisions, idempotent retry, timeout, invalid JSON, oversized body;
- valid/invalid WAV, silence/upstream error mapping, foreign session/job/audio IDs;
- cancellation, expired/missing audio, no-store headers, and rate limits;
- global and patient kill switches;
- log/error redaction.

Never use real patient content in fixtures.

### Web

Add pure/component tests using the existing frontend test approach for:

- status mapping and honest language labels;
- caregiver versus viewer controls;
- pending polling and terminal stop;
- patient switch cache isolation;
- enable, disable, retry success and visible failure;
- no direct VoiceBot call and no credential in built assets.

### Regression

Re-run pairing, media upload/preview, people/medicine/routine CRUD, device content
pull, medicine reminders/escalation, game event sync, dashboards/reports, Realtime,
and hostile RLS. Test core care flows with VoiceBot available and completely down.

## 13. Work packages and gates

Follow the repository rule: one package per coding session. Stop after each report.

### WV-00 — Baseline and contract verification

- confirm branch/commit/diff and preserve unrelated work;
- inspect current VoiceBot commit and live/non-live capability separately;
- reconcile the companion contract with current VoiceBot source/OpenAPI;
- verify side-effect tools are server-disabled;
- run current SMRITI baseline checks.

Gate: no unresolved contract/security contradiction.

### WV-01 — Shared contracts and database queue

- add the reviewed forward-only migration, shared schemas, mirrored Deno types,
  RLS tests, and queue trigger tests;
- do not deploy remotely.

Gate: local reset, SQL tests, static verification, lint/build all pass.

### WV-02 — Admin and sync worker

- implement `voicebot-admin`, `voicebot-sync-worker`, shared client/adapter, fake
  upstream tests, idempotency, backoff, redaction, and kill switch;
- prove VoiceBot outage never fails a caregiver content write.

Gate: full local synthetic sync lifecycle and hostile auth tests pass.

### WV-03 — Flutter-ready gateway

- implement `voicebot-gateway` against the companion contract;
- test current/replaced devices, ownership, WAV, jobs, audio, cancellation, limits,
  and failure mapping using a fake upstream;
- do not require Flutter source to complete gateway contract tests.

Gate: no credentials/client-selected identity/foreign opaque ID crosses the boundary.

### WV-04 — Caregiver status UI

- add patient-scoped status and caregiver controls with minimal existing styling;
- add frontend tests and patient-switch/cache tests;
- do not add patient conversation UI.

Gate: role behavior, visible errors, and all frontend/regression checks pass.

### WV-05 — Authorised staging acceptance

- inspect pending cloud changes and obtain explicit deployment approval;
- set secrets directly through authorised secret management without displaying them;
- apply only reviewed migration/functions to staging;
- enable one synthetic/approved patient and test provisioning, sync, edits, empty
  lists, disable/re-enable, outage, and status;
- perform real English/Hindi text and voice only with explicit data/test approval;
- record latency and current capabilities honestly.

Gate: staging proof is separated from local proof; no production changes.

### WV-06 — Flutter handoff

- freeze the companion contract version and provide generated/example requests with
  no credentials;
- give the Flutter developer Supabase function names, auth requirements, state
  machine, error codes, polling/cancellation rules, and test fixtures;
- do not claim hardware acceptance until the real app completes it.

Gate: Flutter can integrate without any VoiceBot/provider secret or backend rewrite.

## 14. Required verification after every implementation package

Inspect scripts before running them and never add `--linked` to local database checks.

```sh
npm run verify
npm run lint --workspace web
npm run build --workspace web
npx supabase test db
git diff --check
```

Also run relevant Edge Function/Deno tests and current frontend tests. If Docker,
Supabase, VoiceBot, credentials, or hardware is unavailable, record the exact blocker;
do not replace the missing check with a mock and call it end-to-end success.

After each package report:

1. starting branch and commit;
2. files changed;
3. migration/API compatibility;
4. exact security boundaries added or preserved;
5. commands and complete sanitised results;
6. local, fake-upstream, staging, and hardware evidence separately;
7. anything untested;
8. unresolved risks;
9. rollback/disable behavior;
10. next eligible package.

Do not commit `.env.local`, secrets, tokens, temporary sessions, generated build
output, downloaded ZIPs, or unrelated integration Markdown files.

## 15. Stop conditions

Stop and ask the owner before proceeding when:

- current VoiceBot source does not match the companion API contract;
- scalable patient provisioning/authorisation is absent;
- side-effect tools still claim calls/reminders/actions they cannot execute;
- implementing the migration would conflict with another pending migration number;
- consent semantics are unclear;
- a schema change is not approved or contradicts `backend-spec.md`;
- cloud deployment, secret changes, real patient data, a real voice request, or any
  production action is required;
- a security/isolation test fails;
- unrelated tracked changes overlap the intended files.

## 16. Definition of complete

Web/backend integration is complete only when:

- an authorised caregiver can opt an approved patient in/out and see truthful state;
- complete snapshots synchronise durably and idempotently without blocking saves;
- stale medicine data is never represented as current;
- a current paired device can use the versioned gateway and a replaced device cannot;
- sessions/jobs/audio are patient-owned and cross-patient hostile tests pass;
- VoiceBot/provider secrets never enter the web or Flutter bundle;
- English/Hindi are enabled only after real measured acceptance;
- VoiceBot outage and disablement leave every existing care flow working;
- the Flutter team can implement the companion contract without backend redesign;
- staging, hardware, and language limitations are reported rather than simulated.
