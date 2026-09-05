# Smriti Backend — Agent Instructions

## Before any task
1. Read `docs/INDEX.md` to find the relevant spec section
2. Read that section of `docs/backend-spec.md` in full
3. Read the current task and its acceptance criteria in `TASKS.md`
4. Do only that task

## Stack
Supabase (Postgres + Auth + Storage + Edge Functions, region `ap-south-1`)
React 19 + Vite + TypeScript. npm workspaces monorepo.

There is **no REST API server**. PostgREST auto-generates CRUD from the schema
and RLS is the authorization layer. The only hand-written HTTP endpoints are
the Edge Functions in `supabase/functions/`.

## Non-negotiables
`npm run verify` enforces 1, 2, 3, 4, 8, 9. The rest are on you.

1. Every table has `alter table X enable row level security` somewhere in the
   migrations. Tables are declared in `0002`–`0005`; policies live in `0007`.
2. `auth.uid()` is always wrapped as `(select auth.uid())` inside RLS policies.
   Bare `auth.uid()` evaluates once per row instead of once per statement.
3. All time-of-day values are integer minutes (0–1439) with modulo-1440
   arithmetic. Never a `time` or `timetz` column.
4. Migration numbers are unique and sequential. **Never edit an applied
   migration** — write a new numbered one.
5. No trigger on `events` may write to `events`. That is an infinite loop with
   a real bill attached.
6. Escalation IDs are deterministic: `{reminderEventId}_{step}` for device
   escalations, `wd_{patient}_{date}_{slot}` for watchdog escalations.
7. Every webhook verifies its signature before writing anything.
8. The service-role key never appears anywhere under `web/`.
9. All Supabase client access lives in `web/src/lib/db.ts`. No other file in
   `web/src/` imports `@supabase/supabase-js`.
10. `ocr-prescription` never writes to `medications`. It returns candidates for
    per-row caregiver confirmation.
11. Media uploads complete and are confirmed **before** their path is written
    into `people` or `medications`.
12. One escalation call per patient covering all due medicines — never one call
    per pill.
13. Device writes never use `.select()` or `RETURNING`. The device has insert-only
    access; a read-back fails with a misleading "violates RLS policy" error.
14. Every view is created `with (security_invoker = true)`. Without it, views run
    as owner and bypass RLS entirely — a cross-tenant data leak that table-level
    RLS tests will not catch.
15. supabase/functions/_shared/ mirrors types from packages/shared manually
    (Deno cannot resolve npm workspace packages). When packages/shared
    changes, update the mirror in the same commit.

## Workflow
- One task per session. Do not start the next task.
- Run `npm run verify` after every change and paste the output.
- Stop and ask if the spec is ambiguous. **Do not invent schema, columns, or
  table names.** If it is not in `backend-spec.md`, it does not exist.
- Do not add dependencies that are not in the spec.
- Do not create files outside the task's scope.

## Repo layout
```
supabase/migrations/   numbered SQL, applied in order
supabase/functions/    Deno Edge Functions
web/src/lib/db.ts      the ONLY Supabase client module
packages/shared/       types + zod, imported by web AND functions
analysis/              Python — owned by the ML engineer, do not touch
docs/                  specs. Read, never edit.
```
## Verification
After each task, run `npm run verify` and paste the complete output —
not a summary. If any check fails, stop and report rather than working around it.

If the spec appears wrong or self-contradictory, say so and stop.
Do not silently deviate, and do not silently comply with something that looks unsafe.