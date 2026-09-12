# SMRITI — Integration Index for Orchestration

## How to use this pack

Give a coding agent exactly one task from `INTEGRATION-TASKS.md`. That file is standalone: it contains the task order and integration guardrails, so no separate master-context document is needed. Require the agent to report: files changed, migration name, commands run, test evidence, unresolved risks, and whether it changed any visual component intentionally.

Do not dispatch tasks that are not yet unblocked.

## Dispatch order

| Order | Task | May run in parallel with | Gate before next stage |
|---|---|---|---|
| 0 | INT-00 Baseline reconciliation | None | Latest branch builds and visual changes are preserved |
| 1 | INT-01 Security + adherence migration | INT-03 after INT-00 | RLS hostile tests and migration checks pass |
| 2 | INT-02 Realtime | INT-03 | Backend publication and cache invalidation verified |
| 3 | INT-03 Contract/UI truth | INT-01/INT-02 once baseline is complete | Valid payloads and accurate UI states |
| 4 | INT-04 Staging connection | None | Owner has supplied staging access/configuration |
| 5 | INT-05 Durable workflows | None | Real mutations survive reload |
| 6 | INT-06 E2E staging validation | None | All prior work merged into one integration branch |
| 7 | INT-07 Production readiness | None | Explicit owner approval required |

## Required agent report template

```md
## Result
Completed / partially completed / blocked

## Changes
- file — concise reason

## Verification
- command or scenario — result

## Compatibility notes
- migration impact, frontend contract, visual impact

## Risks or follow-ups
- only concrete unresolved items
```

## Merge rules

- One task branch or coherent pull request per task.
- New migrations only; never rewrite deployed history.
- Resolve conflicts in favour of the latest visual branch unless that would violate an integration contract.
- Before merging, rerun lint/build and the task’s acceptance checks on the combined branch.
- If a frontend task changes a database contract, stop and coordinate with the migration owner; do not guess field formats.

## Definition of done

The integration is complete only after INT-06 passes against staging. A green frontend build or a successful demo-mode click-through is not evidence that the live system is integrated.
