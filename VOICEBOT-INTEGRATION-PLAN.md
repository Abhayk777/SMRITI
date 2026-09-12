# SMRITI VoiceBot Integration — Agent Implementation Plan

Status: proposed implementation work; nothing in this checklist is certified complete.

Purpose: integrate the separate VoiceBot service with the existing Supabase backend,
Flutter patient app, and React caregiver dashboard while preserving working features.

## 1. Execution instructions

1. Read the applicable `AGENTS.md` in each repository. In SMRITI, read
   `docs/INDEX.md`, the relevant sections of `docs/backend-spec.md`, and `TASKS.md`.
2. Read this entire plan before implementation. Execute one numbered work package
   at a time, in dependency order. Batch related implementation and checks within
   a package; do not repeatedly ask approval for routine choices already authorised.
3. Review actual source and deployment state. Earlier reports and handoff claims
   are evidence to investigate, not proof of the current deployment.
4. Inspect branch, commit, tracked diff, and untracked files before any edits.
   Preserve user work. Do not switch, reset, stash, or commit unrelated changes.
5. Record implementation evidence in a separate work log: repository commits,
   package status, changed files, commands, results, limitations, and next package.
   Use `NOT STARTED`, `IN PROGRESS`, `BLOCKED`, or `VERIFIED`.
6. A green mock test does not prove live ASR, LLM, TTS, audio playback, phone calls,
   or tablet behavior. Label local, mocked-provider, staging, and physical-device
   results separately. Never mark an unrun check passed.
7. Stop dependent work if a security gate fails. Fix an in-scope failure and rerun
   its gate; report pre-existing failures separately. Do not weaken a test to pass.
8. This document authorises no production deployment, real SMS/OTP/call, patient
   data transfer to an external AI service, or cloud configuration change by itself.
   Use explicit session authorisation for those operations. Local code and synthetic
   tests can be prepared first. Never put credentials in the work log.
9. Do not invent existing tables or APIs. Proposed additions below need a concrete
   versioned contract before implementation. Resolve conflicts with the backend
   spec explicitly; do not silently alter ownership rules.

## 2. Architectural boundaries and invariants

- Supabase remains authoritative for patients, caregiver membership, medicines,
  routine, people, media, device binding, gameplay events, adherence, and escalation.
- VoiceBot owns its conversation processing, ASR/TTS, working memory, and voice jobs.
  Access it through HTTP; do not directly edit its SQLite database from our backend
  or clients. Changes inside its own repository may use its repository/migration layer.
- Flutter retains local reminders, games, content downloads, offline queue, and sync.
- VoiceBot failure must never block a caregiver save, patient creation, pairing,
  a medication alarm, ordinary gameplay, or normal backend sync.
- Existing medicine escalation through Twilio/Vapi remains independent of chatbot
  contact requests. Never use a fabricated missed dose to implement a chat call.
- Preserve current visual design. Add only the controls/status needed for voice.
- Never edit applied migrations. Select the next available migration number after
  inspecting all branches/migrations; `0019` existed when this plan was written.
- Keep RLS enabled, wrap policy `auth.uid()` as `(select auth.uid())`, and create
  views with `security_invoker = true`. No broad role or Storage permission grants.
- Follow the existing web data layer: use `web/src/lib/db.ts`; keep established
  client initialisation in `supabase.ts`. Do not add SDK imports elsewhere.
- Mirror shared contract changes in `supabase/functions/_shared/` when needed.
- Device event writes remain insert-only and must not request `.select()`/RETURNING.
- Never store an uploaded media path before upload success. Keep people photos required.
- Do not modify `analysis/`, existing integration Markdown files, secrets, environment
  files, or generated build output as incidental work.

## 3. Known review findings to reproduce

The supplied ZIP's automated suite passed 365 tests in a temporary Python environment
with substituted providers. It was not a real speech or deployment acceptance test.
The dependency environment was not an exact deployment lockfile reproduction.

| Finding | Required treatment |
|---|---|
| New allow-listed identity without SQLite user fails nonempty memory sync | Add authorised, idempotent provisioning before sync |
| Session ID can be reused by another user after cache eviction | Enforce persistent ownership before any turn or side effect |
| Sync writes medicine schedule into instructions, leaving structured time empty | Extend contract and readers; test morning/date filtering |
| Family sync omits deceased status and memory prompts | Preserve these fields and apply appropriate response behavior |
| `phone_available` is discarded and synced contacts are untrusted | Keep calling disabled until an approved contact reference contract exists |
| Reminder creation only inserts VoiceBot SQLite data | Do not claim alarm delivery until integrated |
| In-memory TTS queue is lost at restart | Recover safely or terminate abandoned jobs explicitly |
| Indic Parler generation does not enforce its configured timeout | Bound work and recover without starting concurrent model instances |
| Audio cleanup runs on writes, not expiry checks on reads | Enforce expiration on retrieval and scheduled cleanup |
| Language evidence file is empty; health reporting has omissions | Report configured, reachable, and measured capability separately |
| Time defaults to Kolkata; some fallback text is English under another code | Carry patient timezone; return accurate language/unavailability metadata |
| Browser recorder emits WebM/M4A; VoiceBot requires WAV | Use a dedicated WAV path for assistant input |

Source areas: VoiceBot `api/routes/`, `api/dependencies.py`, `schemas.py`,
`conversation/`, `memory/`, `voice_jobs.py`, `tts/`, `language/`, and `offline/health.py`.
Recheck against the engineer's latest commit; do not assume the ZIP is still current.

## 4. Work packages

### VB-00 — Baseline and scope lock

Steps:
1. Identify the SMRITI, VoiceBot, and Flutter checkouts and record their commits.
   Use an isolated writable VoiceBot checkout, not the original ZIP or Downloads handoff.
2. Read current device/app contracts. Inventory active patient flows and tests.
3. Inspect environment structure without displaying secrets. Distinguish local
   Supabase from authorised staging; never infer production permission.
4. Run baseline lint/build/tests using each repository's supported commands.
   Use a disposable local database for resets; preserve the user's manual test data.
5. Capture baseline screenshots or UI assertions for pages receiving additions.
6. Define feature enablement with a server-enforced disabled state. Identify how
   to turn voice off without reverting migrations or changing existing care flows.

Gate:
- [ ] Baseline and pre-existing failures documented.
- [ ] Existing app remains usable with voice disabled.
- [ ] Missing Flutter access is recorded as a blocker only for Flutter-dependent work.

### VB-01 — Agree the versioned integration contract

Steps:
1. Define request/response schemas, status/error codes, role access, identifier
   ownership, limits, and compatibility rules before adding endpoints or tables.
2. Prefer the Supabase patient UUID as VoiceBot identity for new provisioned users.
   If the pilot requires an alias, store an explicit server-owned mapping. Never
   map every real patient to `elder-1` or trust client-selected VoiceBot identities.
3. Define an authenticated provisioning operation restricted to the credential's
   allowed identities. Store patient name, canonical language, and IANA timezone.
   Provisioning must not grant itself access to arbitrary new identities.
4. Define a complete memory snapshot with schema version, source version, stable
   source record IDs, and explicit arrays. Include structured medication weekdays,
   chosen time, allowed window, dose, family deceased flag, and memory prompts.
5. Keep Supabase times as integer minutes and weekdays as comma-separated ISO
   weekdays. Define lossless conversions for VoiceBot's internal representation.
6. Define identity, session, job, and audio ownership checks at both services.
7. Define action outcomes as proposed/accepted/execution-result, with stable IDs
   for side-effect deduplication. Do not equate `action_accepted` with success.
8. Define minimum compatible service/client versions; old clients must continue
   their existing behavior. Reject unsupported versions explicitly.

Language mapping:

| SMRITI | VoiceBot | Initial enablement |
|---|---|---|
| `en` | `eng` | Enable voice only after measured E2E test |
| `hi` | `hin` | Enable voice only after measured E2E test |
| `as` | `asm` | Validate configured ASR, generation, and TTS separately |
| `mni` | `mni` | Keep unvalidated capability unavailable |
| `kha` | `kha` | Preserve touch/recorded-media fallback |
| `lus` | `lus` | Preserve touch/recorded-media fallback |

Gate:
- [ ] API schemas and example synthetic payloads are concrete and reviewed.
- [ ] No incompatible reuse of gameplay session IDs as conversation IDs.
- [ ] No loss of medicine schedule information or silent field truncation.
- [ ] New schema/ownership requirements are reconciled with the existing spec.

### VB-02 — Harden VoiceBot before connecting patient data

Steps:
1. Reproduce and fix persistent session ownership. Reject mismatches before ASR
   where feasible and always before conversation processing, tools, persistence,
   or TTS. Test restart, eviction, expiry, concurrent requests, and both API routes.
2. Add idempotent provisioning and predictable errors for unknown users. Do not
   seed sample family/medicine records for real patients.
3. Extend sync and memory readers together. Implement patient timezone and actual
   weekday filtering, not just a formatted schedule string handed to the model.
4. Preserve deceased status in retrieval and deterministic/LLM response context.
   Test that deceased contacts cannot become call/visit suggestions.
5. Apply snapshot replacement atomically with monotonic source-version checks.
   Equal-version retries must not recreate IDs or change content; reject a different
   payload under the same version. Reject stale versions. Missing arrays must not
   silently clear data in the new contract.
6. Fix configured/available/validated capability reporting, including Groq,
   multi-user authentication, and Indic Parler. A constructible adapter is not proof
   of provider reachability or model availability.
7. Normalise language codes before routing. Fix the OpenAI ASR `mni` to `mn`
   mapping: `mn` must not be used as a Meiteilon hint. Verify the actual provider
   contract before choosing a replacement or omitting a hint.
8. Bound the TTS queue and initial request duration. On restart, safely recover
   queued work or mark interrupted work failed. Enforce generation limits using
   a mechanism that actually stops/recycles stuck execution; do not merely time
   out the HTTP client while synthesis keeps running indefinitely.
9. Keep one synthesis operation active. Add graceful shutdown and job retention.
   Check audio expiry at retrieval and remove expired files/jobs under policy.
10. Remove patient text from error logs; make retained transcripts explicit and
    define access, retention, and deletion behavior.
11. Disable unintegrated tools on the server so they cannot announce nonexistent
    alarms/calls. Use the conversational API; do not expose legacy `/v1/command`
    as a shortcut around v5 confirmation behavior.

Gate:
- [ ] Original suite passes plus regression tests for each changed boundary.
- [ ] Unknown/foreign sessions never create turns or speech jobs.
- [ ] No silent wrong-language speech or misleading capability success.
- [ ] Jobs terminate or recover after restart; overload is explicit.
- [ ] Synthetic data is used exclusively in development tests.

### VB-03 — Build the Supabase gateway

Steps:
1. Add scoped Edge Function operations for conversation, voice submission, job
   polling, audio retrieval, and authorised capability/status reads.
2. Validate Supabase authentication server-side. Check current patient membership
   for caregivers; verify current device binding as well as signed device claims.
   Old device JWT claims alone must not survive replacement/revocation.
3. Forbid arbitrary upstream URLs, paths, headers, user IDs, and proxy operations.
   Use one configured HTTPS service origin and fixed endpoint templates. Do not
   follow redirects that could forward credentials to a different host.
4. Apply role rules: paired device may converse; caregiver may access approved
   diagnostics/status; family viewers cannot provision, sync, or act. Do not give
   caregivers transcript access merely because they can see patient status.
5. Use exact-patient upstream credentials or durable server-side ownership bindings
   for sessions/jobs/audio. A shared multi-patient key plus a guessed job ID must
   never be enough to fetch another patient's output.
6. Validate actual WAV bytes, size and duration limits, fields, and identifiers.
   Check initial ASR/LLM response times against deployed gateway limits. If they do
   not fit, extend upstream job submission rather than claiming TTS-only async solves it.
7. Use per-patient/device limits and bounded polling. Account for the existing
   upstream per-key limit when several patients share a service credential.
8. Never automatically replay an ambiguous action-producing POST. Implement the
   agreed idempotency contract before retrying such requests.
9. Keep credentials in server secret storage; expose only booleans/status in logs.
   Protect audio responses from shared caching. Restrict browser CORS to approved
   origins; CORS is not an authorisation substitute.

Gate:
- [ ] Hostile auth tests cover anonymous, viewer, foreign caregiver, old device,
   forged patient IDs, foreign session/job/audio IDs, and arbitrary proxy requests.
- [ ] Gateway outage/timeout does not affect existing database operations.
- [ ] No API key or service-role credential reaches web/Flutter bundles or errors.

### VB-04 — Implement durable content synchronisation

Steps:
1. Capture relevant content-version changes in a durable queue/outbox with minimal
   local transactional writes. Do not make external HTTP calls inside caregiver saves.
2. Include profile/name/timezone changes even if current content-version triggers
   do not cover them; extend the contract/versioning without breaking tablet pulls.
3. Provision only explicitly enabled patients, then read one consistent complete
   authorised snapshot. Never convert a query failure into an empty array.
4. Send only approved fields. Omit contact phone numbers, signed media URLs,
   unrelated game events, and private memos. Translate routine label keys into
   meaningful labels using the existing app contract.
5. Coalesce changes per patient; use bounded retry/backoff, worker leases, and
   monotonic snapshot application. Mark a version synced only after acknowledgement.
6. Keep last-success version/time and sanitised failure status. Make manual retry
   caregiver-only and idempotent; clients cannot upload arbitrary replacement facts.
7. Prevent stale medicine advice: when source version differs from the applied
   version, refresh successfully or return explicit unavailability for those answers.
   Never fall back to seeded or outdated medicine facts as current information.
8. Establish handling for patient deletion/voice disablement and external data
   retention. Revocation must stop access immediately even if cleanup is delayed.

Gate:
- [ ] Create/edit/delete/empty data synchronise correctly.
- [ ] Duplicate, concurrent, reversed-order, and failed snapshots are tested.
- [ ] A VoiceBot outage leaves caregiver saves and tablet downloads operational.
- [ ] No demo records or another patient's data appear in retrieved facts.

### VB-05 — Implement Flutter conversation and playback

Steps:
1. Inspect the actual Flutter architecture before choosing files or dependencies.
   Reuse authentication, navigation, audio focus, cancellation, and lifecycle patterns.
2. Add WAV microphone capture with explicit permission, recording limits, and
   visible listening/processing/playing/error states.
3. Submit through the gateway with the current device session. Retain conversation
   IDs for related turns; keep them separate from cognitive-game sessions.
4. Render text immediately when received. Poll jobs with bounded backoff and stop
   on completion, failure, expiry, cancellation, route exit, or re-pairing.
5. Retrieve audio through authenticated gateway access and cache locally only under
   the retention policy. Never put service credentials in playback URLs.
6. Tag each interaction so a late response cannot play after STOP or in a new
   patient context. Clear queued playback and patient caches on re-pairing/logout.
7. Give medicine alarms priority over assistant recording/playback. Test audio
   interruption/resume behavior on hardware. Keep ordinary offline flows available.

Gate:
- [ ] Real WAV -> ASR -> response -> TTS job -> audio -> audible playback succeeds.
- [ ] Silence, denial, invalid WAV, no network, slow TTS, backgrounding, interruption,
   and cancellation produce understandable behavior and no endless spinner.
- [ ] Existing local alarms and event uploads continue during voice failures.

### VB-06 — Wire safe navigation

Map `OPEN_PLAY`, `OPEN_MY_PEOPLE`, `OPEN_TODAY`, `OPEN_MEDICINE`, `HELP`, and `STOP`
to existing app behavior. Require both `action_accepted=true` and the client's
explicit allow-list. Reject unknown actions. Never execute transcript/response text.

Steps:
1. Execute each accepted action at most once per interaction.
2. Opening Games must not manufacture a game session or trial event.
3. Keep game selection parameters tied to actual available game IDs.
4. Preserve confirmation where the service requests it; never confirm after silence.
5. Ensure STOP can interrupt locally even if the service is unavailable.

Gate:
- [ ] Navigation works without duplicate session creation or content mutation.
- [ ] Late/duplicate responses do not repeat actions.
- [ ] Disabled action families are not advertised or executed.

### VB-07 — Add minimal caregiver status

Steps:
1. Add patient-specific availability and last-sync status using existing components.
2. Add an authorised retry for failed memory sync; display failure honestly.
3. Optionally add a staging-only text diagnostic panel, separate from patient
   conversation history and disabled for side effects by server policy.
4. If browser voice diagnostics are necessary, use genuine WAV capture/conversion;
   do not rename WebM/M4A files or change the working media-upload recorder globally.
5. Keep query keys patient-scoped and clear/cancel work when changing patients.
6. Hide diagnostic controls in production and enforce restrictions on the server.

Gate:
- [ ] No patient-switch data leakage or permission bypass.
- [ ] Existing page layout and content save behavior remain intact.
- [ ] Status reflects actual integration state rather than a hardcoded success.

### VB-08 — Optional actions after core acceptance

Do not enable these merely because their tool names exist. Core release is VB-00
through VB-07 plus the validation in VB-09. These extensions need their own passing gate.

Trusted contact calls:
1. Start with the configured primary contact only. Define an opaque trusted-contact
   reference; do not copy a SQLite integer ID into our contact model or select by name.
2. Resolve the phone through our trusted backend/device contract after explicit
   confirmation. Recheck patient access and the contact before execution.
3. Add a server-issued expiring action ID, one-time execution, and outcome reporting.
   Handle unknown provider outcomes without blindly placing a second call.
4. Keep manual call requests independent of medicine escalation records.
5. Require explicit authorisation for each bounded real staging call test.

Personal reminders:
1. Agree an authoritative non-medication reminder model and tablet delivery contract.
   Do not write into caregiver-only routine or medication tables from a device tool.
2. Define timezone, due instant, optional recurrence, cancellation, deduplication,
   offline delivery, and acknowledgement. Add schema only after resolving the spec.
3. Confirm creation only when persisted and distinguish saved from scheduled on-device.
4. Test actual alarm delivery, restart, duplicate requests, offline operation, and cancellation.

Personal stories:
1. Extend approved caregiver snapshot fields into the existing memory retrieval layer.
2. Preserve provenance, deletion semantics, and deceased-person context.
3. Do not present unverified assistant-generated content as caregiver-confirmed facts.

Gate:
- [ ] Every enabled action has an observable real outcome and safe retry semantics.
- [ ] No medication edits, arbitrary dialing, false delivery claims, or duplicate calls.

### VB-09 — Acceptance, staging release, and rollback

1. Run the verification matrix below and inspect the final diff for unintended
   visuals, secrets, environment files, generated output, and unrelated changes.
2. Run a synthetic one-patient staging pilot, then two-patient hostile isolation tests.
3. Test supported languages using native-speaker review and actual recordings.
   Record latency separately for ASR, conversation, queue wait, TTS, and playback.
4. Approve a concrete acceptable waiting-time budget before broad voice enablement.
   CPU synthesis that routinely exceeds it requires hosting/provider changes.
5. Test service restart, queue saturation, upstream rate limiting, expired audio,
   revoked devices, and a complete VoiceBot outage.
6. Revalidate old clients, existing device pairing, media download/upload, medicine
   CRUD, routine, reminders, gameplay sessions/events, dashboard, Realtime, and RLS.
7. For authorised staging deployment, inspect pending migrations first. Apply only
   reviewed intended changes; never accidentally deploy unrelated pending migrations.
   Record service commits and schema/API versions; run compatibility checks.
8. Enable voice only for explicitly chosen staging patients. Keep actions separately
   controlled. Roll back operationally by disabling voice and its dispatch workers;
   preserve care functions and data. Do not reverse applied migrations destructively.
9. Before production, require separate owner approval and reliable service hosting,
   durable database/audio configuration, backups, supervision, monitoring, and
   tested recovery. The Windows/Tailscale pilot is not availability proof.

Gate:
- [ ] Local, staging, hardware, and language evidence are separately recorded.
- [ ] Core care flows pass with VoiceBot enabled AND unavailable.
- [ ] No critical ownership, stale-medication, action, or secret-exposure issue remains.
- [ ] Rollback switch is exercised; pending jobs cannot execute disabled actions.

## 5. Verification matrix

| Area | Required checks |
|---|---|
| Patient ownership | Two caregivers/patients; viewer; device replacement; session eviction/restart; guessed jobs/audio |
| Snapshot safety | Atomic replacement; explicit empty lists; missing lists; stale version; equal version with changed payload; retries |
| Medicine facts | Selected weekdays; inactive/deleted meds; time window; midnight; differing timezone; stale snapshot refusal |
| Family facts | Correct identity; deceased context; notes treated as data; no seeded facts or raw phones |
| Voice | Valid and invalid WAV; silence; unsupported language; provider failure; real playback; cancellation |
| Job lifecycle | Queue cap; duplicates; restart; stuck synthesis; expiry; bounded polling; per-key capacity |
| Actions | Allow-list; confirmation; rejection; replay; changed contact; provider uncertainty; actual execution result |
| Regression | Pairing; uploads/previews; required photo; CRUD; alarms; gameplay sync; reports; Realtime; RLS |
| Privacy | No secrets in source/bundles/logs; controlled transcript retention; no shared audio caching; disabled diagnostics |

Commands known at plan creation (inspect scripts/runtime versions again before execution):

```sh
# SMRITI root — this includes a LOCAL DATABASE RESET.
# Run only against disposable local test state; never add --linked.
npm run verify

# Frontend
npm run lint --workspace web
npm run build --workspace web

# Database tests against the local stack
npx supabase test db

# Whitespace validation
git diff --check

# VoiceBot isolated environment, from its repository
python -m pytest -q

# Flutter repository
flutter analyze
flutter test
```

Discover and run the existing frontend TypeScript tests with the Node/TypeScript
runner already used in the repository; `web/package.json` currently has no `test`
script. Do not report root `npm test` as verification: it is currently a placeholder.
Run relevant Edge Function tests/type checks and the existing Realtime test with
local credentials supplied privately. Do not display `supabase status` secret output.

If Docker or reset is unavailable, record the exact blocker. A static verification
pass does not substitute for reset/migration/RLS execution. Keep complete sanitised
verification output as required by repository instructions; omit secret values.

## 6. Evidence required after every package

```text
Package:
Status:
Repositories / starting commits:
Changed files and resulting behavior:
Security boundaries added or preserved:
Commands and sanitised results:
Local / mocked-provider / staging / hardware evidence:
Untested scenarios and blockers:
Migration / API compatibility:
Feature disablement / recovery behavior:
Remaining risks:
Next eligible package:
```

Before any authorised commit, stage only reviewed implementation/tests/contracts.
Exclude credentials, `.env.local`, temporary sessions, generated build output, the
original ZIP, and unrelated integration Markdown files. Do not auto-commit this plan.

## 7. Definition of complete

Core integration is complete only when VB-00 through VB-07 and VB-09 pass, real
speech works for each enabled language, two-patient isolation is verified, and
existing care features still work during a VoiceBot outage. Optional features are
complete only after their individual VB-08 delivery checks pass.

The agent must never replace a missing hardware, credential, hosting, or provider
test with fake success. Record exactly what is proven and what remains unavailable.
