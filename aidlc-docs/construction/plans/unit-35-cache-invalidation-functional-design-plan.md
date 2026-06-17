# Unit 35: Invalidacion inmediata de cache tras mutaciones admin — Functional Design Plan

## Status

- **Stage**: Functional Design — COMPLETE, awaiting review approval
- **Created**: 2026-06-17T00:21:44Z
- **Unit**: Unit 35, cache consistency refine over admin result mutations

## Plan Steps

- [x] Read Unit 35 requirements (`FR-REFINE-35.1` through `FR-REFINE-35.4`, `NFR-REFINE-35.1`).
- [x] Read Unit 35 execution plan and unit-of-work definition.
- [x] Identify functional ambiguity requiring user questions.
- [x] Decide no additional functional questions are needed because affected mutations, tags and routes are explicit in the approved execution plan.
- [x] Define the shared invalidation policy for admin result mutations.
- [x] Define route and tag coverage for user-facing stale views.
- [x] Define business rules, edge cases and exclusions.
- [x] Document Security Baseline compliance.
- [x] Generate the light Functional Design artifact.
- [x] Update `aidlc-state.md` and `audit.md` in the same interaction.

## Question Assessment

No question file was created for this Functional Design stage. The reported bug, root cause and target behavior are already explicit:

- Admin actions in scope: `forceMatchResult`, `revertMatchOverride`, `triggerSync`.
- Cache tags in scope: `competition-fixture`, `rankings`.
- User routes in scope: `/matches`, `/rankings`, `/pools`, `/pools/[id]`, `/pools/[id]/leaderboard`.
- Constraint: no schema, migrations, routes, auth or scoring algorithm changes.

Adding questions would not change the functional design and would delay a direct cache-consistency bug fix.

## Next Gate

Functional Design review approval is required before Code Generation Part 1 planning.
