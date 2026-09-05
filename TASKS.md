# Build Tasks

Rules: one task per session. Run `npm run verify`. Commit. Then `/clear`.

## Phase 1 — Schema
- [ ] **T01** `0001_extensions.sql` — spec §2. AC: `supabase db reset` clean
- [ ] **T02** `0002_core.sql` — patients, patient_members, pairing_tokens, audit_log
- [ ] **T03** `0003_content.sql` — people, medications, routine_items, escalation_config
- [ ] **T04** `0004_events.sql` — events, sessions, reminder_events, memos, escalations
- [ ] **T05** `0005_derived.sql` — ability_mirror, flags, bandit_state, reports

## Phase 2 — Security ⚠ CHECKPOINT
- [ ] **T06** `0006_rls_helpers.sql` + `0007_rls_policies.sql` — spec §3
- [ ] **T07** **Manual RLS test.** Two users, two patients. Confirm A cannot read B
       with the anon key. DO NOT PROCEED UNTIL THIS PASSES.

## Phase 3 — Logic
- [ ] **T08** `0008_rpcs.sql` — get_patient_content, device_heartbeat, create_patient
- [ ] **T09** `0009_triggers.sql` — content version bump, ability mirror, flag count
- [ ] **T10** `0010_views.sql` + `0011_storage.sql` + `0012_cron.sql`

## Phase 4 — Functions (unblocks the Flutter dev)
- [ ] **T11** `packages/shared` — types + zod schemas
- [ ] **T12** create-pairing-token, redeem-pairing-token, pair-device-authenticated
       ⚠ Notify app developer when done — she is blocked on this
- [ ] **T13** escalation-worker + twilio-webhook — spec §8.4, §8.5
- [ ] **T14** watchdog — spec §8.6