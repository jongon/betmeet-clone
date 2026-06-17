# Unit 35: Invalidación inmediata de caché tras mutaciones admin — Execution Plan

## Status

- **Stage**: Workflow Planning — READY FOR REVIEW
- **Unit**: Unit 35, refine post-construcción sobre cache consistency
- **Created**: 2026-06-17T00:18:40Z
- **Approval Gate**: Waiting for explicit approval before Functional Design and Code Generation planning

## Intent

Bug reportado: tras forzar o revertir un resultado en `/admin/matches`, al entrar como usuario en `/matches`, `/rankings` o pools/rankings de liga se requieren dos refreshes para ver datos actualizados.

## Workspace Detection Summary

- Existing AI-DLC project detected (`aidlc-docs/aidlc-state.md`).
- Existing application code detected under workspace root (`src/`, `prisma/`, Next.js app router).
- Brownfield refine; reverse-engineering rerun skipped because scoped artifacts and current implementation context are sufficient.
- Worktree has an unrelated modified file: `src/features/competition/components/match-card.tsx`; this unit must not touch it.

## Requirements Summary

- `FR-REFINE-35.1`: `forceMatchResult()` must make user pages see the new result/points on the next normal navigation/refresh.
- `FR-REFINE-35.2`: `revertMatchOverride()` must make user pages see cleaned result/removed points on the next normal navigation/refresh.
- `FR-REFINE-35.3`: `triggerSync()` must invalidate the same result/scoring-dependent user views.
- `FR-REFINE-35.4`: admin result mutations should share a single invalidation policy.
- `NFR-REFINE-35.1`: prefer immediate consistency for explicit admin mutations; use Next.js Server Action `updateTag` for read-your-own-writes and `revalidatePath` for affected route payloads.

## Root Cause Hypothesis

Current actions call `revalidateTag(tag, "max")` for `competition-fixture` and `rankings`. In Next.js 16 this gives stale-while-revalidate behavior, so the first user request can still receive stale data while the cache refreshes in the background. This matches the observed “refresh twice” symptom.

Affected routes are also not explicitly invalidated from admin result mutations:

- `/matches`
- `/rankings`
- `/pools`
- `/pools/[id]`
- `/pools/[id]/leaderboard`

## Impact Assessment

- **User-facing**: yes, fixes stale data on match fixture, global ranking and pool ranking views.
- **Structural**: small helper/service for invalidation; no architecture change.
- **Data model**: no.
- **API/route contracts**: no.
- **NFR impact**: cache consistency improves; admin mutation latency may increase slightly because the next request waits for fresh data instead of serving stale content.
- **Risk**: medium-low. Cache invalidation touches several pages, but affected code is narrow and existing tests can be expanded.

## Stage Decisions

### Inception

- Workspace Detection: COMPLETE.
- Reverse Engineering: SKIP. Existing targeted artifacts and direct code inspection are sufficient for this scoped cache bug.
- Requirements Analysis: COMPLETE (minimal/standard). Requirements added to `requirements.md` as Épica 34 / Unit 35.
- User Stories: SKIP. Bug fix with clear acceptance criteria; requirements cover the observable behavior.
- Application Design: SKIP. No new route/component boundaries.
- Units Generation: LIGHT. Unit 35 added to `unit-of-work.md` and implementation sequence.

### Construction

- Functional Design: EXECUTE (light). Need to document exact invalidation policy, helper contract and route/tag coverage.
- NFR Requirements / NFR Design: EMBED in Functional Design. Cache consistency is the NFR; no separate artifacts needed.
- Infrastructure Design: SKIP. No infra, schema, storage, auth or deployment changes.
- Code Generation Part 1: EXECUTE after Functional Design approval. Create explicit codegen plan.
- Code Generation Part 2: WAIT for explicit approval after plan.
- Build and Test: EXECUTE after implementation.

## Proposed Implementation Shape (for later Code Generation)

- Create a shared helper, likely `src/features/admin/services/revalidate-admin-results.ts`, that:
  - calls `updateTag(COMPETITION_FIXTURE_TAG)`;
  - calls `updateTag(RANKINGS_TAG)`;
  - calls `revalidatePath("/admin")` and/or `revalidatePath("/admin/matches")` depending on caller;
  - calls `revalidatePath("/matches")`;
  - calls `revalidatePath("/rankings")`;
  - calls `revalidatePath("/pools")`;
  - calls `revalidatePath("/pools/[id]", "page")`;
  - calls `revalidatePath("/pools/[id]/leaderboard", "page")`.
- Update `force-result.ts`, `revert-override.ts`, and `trigger-sync.ts` to use the helper.
- Update tests to assert immediate invalidation behavior and affected paths.
- Update cache-tag comments to mention `updateTag` for Server Actions that require immediate consistency.

## Verification Plan

- Focused unit tests:
  - `force-result` invalidates fixture/rankings tags immediately and user routes.
  - `revert-override` invalidates fixture/rankings tags immediately and user routes.
  - `trigger-sync` invalidates fixture/rankings tags immediately and user routes.
  - shared helper calls expected tags/paths.
- `pnpm exec tsc --noEmit`.
- Biome/ESLint on touched source files.
- Optional full Vitest if touched tests reveal broader impact.

## Security Baseline Compliance

- SECURITY-08: Compliant. Existing `getAdminUserId()` gates remain unchanged.
- SECURITY-03: N/A. No sensitive data/logging changes.
- SECURITY-05: N/A. No new input or API surface.
- SECURITY-01/02/04/06/07/09/10/11/12/13/14: N/A for this cache invalidation-only change.

## Approval Gate

Do not implement code until this execution plan is approved and Functional Design is completed/approved.
