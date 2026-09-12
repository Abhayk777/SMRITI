# SMRITI — Integration Task Pack

Complete tasks in order unless the index explicitly marks them parallel-safe. Each task is designed to be pasted to a coding agent as one bounded assignment.

## Integration guardrails

- Preserve the latest visual/UI work. This phase changes functionality, data contracts, security, loading/error states, and only the copy necessary for correctness.
- Supabase/Postgres is the cloud backend. The tablet remains offline-first; local reminders must work without network.
- Browser code uses only the public anon/publishable key and the authenticated user JWT. Never expose a service-role key.
- Keep browser data access centralised in `web/src/lib/db.ts`; `web/src/lib/supabase.ts` may initialise/export the browser client only.
- Add forward-only migrations. Do not edit deployed migrations `0001`–`0015`.
- Browser reads must use authorised summary views/RPCs, never raw event/session/reminder tables.
- Do not deploy, change production configuration, or send real SMS/calls without the owner’s explicit approval.

## INT-00 — Reconcile the current repository baseline

**Goal:** Start from the actual latest repository, including recently merged visual changes, and map the existing frontend/backend integration surface without changing it.

**Do:**

- Create a branch from the current intended integration branch; do not integrate from the old ZIP alone.
- Inspect routing, `db.ts`, `supabase.ts`, `AuthProvider`, query hooks, generated data types, backend migrations/functions, and all backend-facing UI actions.
- Preserve visual-only changes. Report only functional conflicts and files that need manual reconciliation.
- Record the exact commit SHA and build/lint baseline.

**Do not:** change production credentials, redesign pages, alter existing migrations, or deploy.

**Acceptance:** a concise baseline report; clean `npm run lint` and `npm run build`; a branch ready for INT-01.

## INT-01 — Add the security and aggregate-correctness migration

**Depends on:** INT-00.

**Goal:** Close critical RLS gaps and ensure adherence is counted per logical dose.

**Do:**

- Add one or more new, forward-only Supabase migrations.
- Remove/restrict `patient_members` direct insert access so a logged-in user cannot self-add to an arbitrary patient. Keep legitimate membership creation working through existing trusted RPCs.
- Restrict `flags` updates to the intended acknowledgement fields and `memos` updates to the intended read-state fields. Use a secure RPC if column-level control cannot be expressed safely in policy/grants.
- Ensure flag acknowledgement records the actor where schema design supports it.
- Correct `daily_adherence` so multiple events for the same medication and scheduled occurrence cannot inflate scheduled/confirmed/missed counts. Establish and document the exact deduplication key.
- Add hostile RLS tests: self-enrollment attempt, viewer write attempt, cross-patient write attempt, and edits to protected evidence fields.

**Do not:** edit migrations `0001`–`0015`; loosen RLS to make the frontend work; delete historical event data.

**Acceptance:** fresh DB migration works; normal caregiver RPC paths work; hostile SQL tests fail as expected; a duplicate tablet/Twilio dose is counted once.

## INT-02 — Publish and consume realtime correctly

**Depends on:** INT-01.

**Goal:** Make the existing live UI react to real backend changes without polling or stale dashboards.

**Do:**

- Add new migration(s) enabling the chosen derived-state tables in `supabase_realtime` (normally `patients`, `flags`, and `memos`).
- Update `usePatientRealtime` and related query hooks so a patient update invalidates identity/device status, daily report, trend/report/engagement data, and content data when content version can have changed.
- Ensure subscriptions are patient-scoped, cleaned up on navigation, and safe when the route ID is invalid or absent.
- Test from two authenticated browser sessions or an equivalent staging setup: tablet-equivalent patient update, new flag, new memo, flag acknowledgement.

**Do not:** publish raw event tables just to make a view refresh; subscribe before role/patient access is confirmed.

**Acceptance:** a real update becomes visible without page reload and no cross-patient update reaches another patient view.

## INT-03 — Align frontend/backend contracts and functional copy

**Depends on:** INT-00. May proceed alongside INT-01/INT-02 after the baseline is stable.

**Goal:** Make every implemented UI action send valid data and communicate truthfully.

**Do:**

- Replace the bitmask medicine-day utility with the comma-separated weekday contract. Convert form defaults, validation, mocks, OCR mapping, edit paths, and display helpers together.
- Align the language selector and help text with the supported language/fallback matrix.
- Make routine time state use the patient timezone.
- Fix engagement/report range calculation to use calendar days and a precise inclusive/exclusive date range.
- Mark a memo read only after playback actually starts or otherwise define and document the intended acknowledgement behavior. Handle viewer behaviour intentionally.
- Make flag acknowledgement include the actor and surface mutation errors.
- Correct device-offline wording: local tablet reminders continue offline; synchronisation and remote visibility do not.
- Fix alerts-ladder duplicate “on time” rendering and human labels for every configured channel.
- Leave unavailable OCR/report controls clearly unavailable with useful next-step copy; do not create fake success paths.

**Do not:** alter visual layout beyond what is necessary for an accurate state, message, loading/error condition, or accessible control.

**Acceptance:** forms write backend-valid values; timezone/date behaviour is tested; every enabled button produces a real supported action or a visible error; unsupported features remain explicitly unavailable.

## INT-04 — Connect staging auth and browser configuration

**Depends on:** INT-01, INT-02, INT-03.

**Goal:** Move the app from fixtures to a safe staging Supabase project.

**Do:**

- Create a local, ignored `web/.env.local` from a documented example with only `VITE_SUPABASE_URL` and the public anon/publishable key.
- Configure approved staging redirect URLs and production-intended SMS OTP provider settings in Supabase.
- Verify a real OTP login using a test phone number authorised by the project owner.
- Confirm browser network requests carry the user JWT; confirm no service-role secret is present in source, environment files committed to Git, or built assets.
- Keep the fixture/demo mode usable when public credentials are absent.

**Do not:** paste service-role keys into Vite variables; commit `.env.local`; point this first pass at production.

**Acceptance:** real staging OTP sign-in works; protected pages load real authorised data; an unauthorised user cannot retrieve a known patient ID.

## INT-05 — Make setup and management flows durable

**Depends on:** INT-03, INT-04.

**Goal:** Finish the existing web workflows so their success state matches backend state.

**Do:**

- Make setup resume honestly: persist/reconstruct the current step only if the needed data exists, and preload saved escalation configuration.
- Ensure patient, people, medicines, routine, alerts, access, and pairing screens refetch/invalidate after mutation and display backend failures.
- Clarify the access invitation flow: adding an existing signed-in user is not the same as delivering an invitation. Either implement delivery with an authorised backend service or name the current flow accurately.
- Delete replaced/orphaned media only when the Storage authorisation design supports safe deletion; otherwise record it as a maintenance job rather than silently leaking it.
- Update stale generated database types only through the repository’s intended generation/mirroring process.

**Acceptance:** refresh and return to setup does not present blank misleading forms; every management mutation survives a reload; pairing uses the production token format and expiry.

## INT-06 — End-to-end staging validation

**Depends on:** INT-01 through INT-05.

**Goal:** Prove the integrated system works as one product.

**Test matrix:**

1. Caregiver signs in, creates a patient, configures medicine/routine/alerts, and pairs a device.
2. Tablet works offline, records events, reconnects, and syncs without duplicate logical doses.
3. Dashboard, trends, engagement, messages, and report reflect backend views in the patient timezone.
4. New memo and flag update the caregiver UI live; acknowledgement persists with actor identity.
5. Viewer sees allowed data but cannot mutate patient data.
6. Unauthorised caregiver cannot read/write a guessed patient UUID or self-enrol.
7. Escalation worker and Twilio confirmation produce expected, deduplicated adherence state.
8. SMS/auth/storage/function failures display usable error states and do not silently claim success.

**Acceptance:** signed staging test record, screenshots or logs for each case, defect list triaged, and lint/build/DB checks all green.

## INT-07 — Production readiness gate

**Depends on:** INT-06.

**Goal:** Decide whether staging is safe to release.

**Do:**

- Review migration order and rollback/containment plan.
- Confirm Supabase Auth, Twilio/Vapi secrets, watchdog secret, CORS origins, redirect URLs, Storage buckets/policies, and scheduled jobs in the target environment.
- Run the verification suite against a fresh database and complete an independent RLS review.
- Confirm any missing capabilities—OCR, report generation, invitation delivery—are deliberately hidden or accurately described.

**Acceptance:** explicit owner sign-off. Deployment is a separate approved action.
