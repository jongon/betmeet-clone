# Unit 35: Invalidacion inmediata de cache tras mutaciones admin — Code Generation Plan

## Status

- **Stage**: Code Generation Part 2 — COMPLETE
- **Created**: 2026-06-17T00:23:37Z
- **Unit**: Unit 35, cache consistency refine over admin result mutations
- **Approval Gate**: Approved by user continuation (`aprove and continue`) and executed
- **Source of Truth**: This plan is the single source of truth for Unit 35 Code Generation.

## Plan Authoring Progress

- [x] Step 1: Read Unit 35 requirements, execution plan, functional design, and current state.
- [x] Step 2: Read relevant existing admin actions, cache tags, route/query code, and tests.
- [x] Step 3: Confirm NFR consistency is embedded in Functional Design and Infrastructure is skipped.
- [x] Step 4: Define exact workspace-root application paths and test paths.
- [x] Step 5: Log the approval prompt in `aidlc-docs/audit.md` and update `aidlc-docs/aidlc-state.md` in the same interaction.

## Unit Context

### Requirements Traceability

- **FR-REFINE-35.1**: `forceMatchResult()` must make `/matches`, `/rankings`, and pool views reflect changed result/points on the next normal navigation/refetch.
- **FR-REFINE-35.2**: `revertMatchOverride()` must make user views reflect cleaned result and removed points immediately.
- **FR-REFINE-35.3**: `triggerSync()` must apply the same invalidation policy because sync can change fixture/status/results/scoring.
- **FR-REFINE-35.4**: Invalidation policy must be shared to avoid drift between admin actions.
- **NFR-REFINE-35.1**: Prefer immediate consistency for explicit admin mutations; use `updateTag` in Server Actions instead of stale-while-revalidate `revalidateTag(tag, "max")`.

### Functional Rules

- **BR-35.1**: Admin result/scoring mutations invalidate fixture/rankings with immediate semantics.
- **BR-35.2**: Invalidation runs after mutation and scoring complete successfully.
- **BR-35.3**: Failed mutations keep existing error handling and must not be presented as successful invalidation.
- **BR-35.4**: Shared helper covers `forceMatchResult`, `revertMatchOverride`, and `triggerSync`.
- **BR-35.5**: Dynamic pool routes are revalidated by route pattern.
- **BR-35.6**: No scoring, data model, or UI contract changes.

### Dependencies

- Reuses existing cache tags: `COMPETITION_FIXTURE_TAG` and `RANKINGS_TAG`.
- Reuses existing admin guards and mutation flow in `force-result.ts`, `revert-override.ts`, and `trigger-sync.ts`.
- Does not touch unrelated worktree change: `src/features/competition/components/match-card.tsx`.
- Does not implement Unit 36 scoring-rule changes; Unit 35 is cache invalidation only.

## Part 2 Generation Steps

### Step 1: Shared Invalidation Helper

- [x] Create `src/features/admin/services/revalidate-result-views.ts`.
- [x] Import `revalidatePath` and `updateTag` from `next/cache`.
- [x] Import `COMPETITION_FIXTURE_TAG` and `RANKINGS_TAG`.
- [x] Export `revalidateResultViews(options?: { adminDashboard?: boolean; adminMatches?: boolean })`.
- [x] Inside the helper, call `updateTag(COMPETITION_FIXTURE_TAG)`, `updateTag(RANKINGS_TAG)`, `revalidatePath("/matches")`, `revalidatePath("/rankings")`, `revalidatePath("/pools")`, `revalidatePath("/pools/[id]", "page")`, and `revalidatePath("/pools/[id]/leaderboard", "page")`.
- [x] Revalidate `/admin` when `adminDashboard` is true.
- [x] Revalidate `/admin/matches` when `adminMatches` is true.

### Step 2: Admin Action Integration

- [x] Update `src/features/admin/actions/force-result.ts` to remove direct `revalidatePath` / `revalidateTag` imports and call `revalidateResultViews({ adminMatches: true })` only after mutation, `scoreMatch(matchId)`, and successful logging path.
- [x] Update `src/features/admin/actions/revert-override.ts` to remove direct `revalidatePath` / `revalidateTag` imports and call `revalidateResultViews({ adminMatches: true })` only after mutation, `scoreMatch(matchId)`, and successful logging path.
- [x] Update `src/features/admin/actions/trigger-sync.ts` to remove direct `revalidatePath` / `revalidateTag` imports and call `revalidateResultViews({ adminDashboard: true })` only after `runCompetitionSync()` and `scoreFinishedUnscoredMatches()` complete successfully.

### Step 3: Cache Tag Documentation

- [x] Update `src/features/competition/cache-tags.ts` comment to say Server Actions that require immediate read-your-own-writes should use `updateTag(COMPETITION_FIXTURE_TAG)`.
- [x] Update `src/features/scoring-rankings/cache-tags.ts` comment similarly for `RANKINGS_TAG`.

### Step 4: Unit Tests

- [x] Add `src/features/admin/services/__tests__/revalidate-result-views.test.ts`.
- [x] Mock `next/cache` with `revalidatePath` and `updateTag`.
- [x] Verify the helper expires both tags immediately.
- [x] Verify user routes are revalidated: `/matches`, `/rankings`, `/pools`, `/pools/[id]` with type `page`, and `/pools/[id]/leaderboard` with type `page`.
- [x] Verify optional admin routes are controlled by options.

### Step 5: Action Tests

- [x] Update `src/features/admin/actions/__tests__/revert-override.test.ts` to mock the shared helper and assert successful/non-success invalidation behavior.
- [x] Add `src/features/admin/actions/__tests__/force-result.test.ts` to cover success and validation/auth/error cases.
- [x] Add `src/features/admin/actions/__tests__/trigger-sync.test.ts` to cover success, missing admin, invalid scope, and provider errors.

### Step 6: Documentation Summary

- [x] Create `aidlc-docs/construction/unit-35-cache-invalidation/code/generation-summary.md` after generation.

### Step 7: Verification

- [x] Run focused Vitest files for Unit 35 action/helper tests.
- [x] Run `pnpm exec tsc --noEmit`.
- [x] Run Biome on touched `src` files.
- [x] Run ESLint on touched `src` files.

### Step 8: Progress Tracking

- [x] Mark completed steps in this plan with `[x]` in the same interaction as generation.
- [x] Update `aidlc-docs/aidlc-state.md` to mark Unit 35 Code Generation complete after successful generation.
- [x] Append the Unit 35 Code Generation result to `aidlc-docs/audit.md` with exact files and verification results.

## Security Baseline Compliance

- **SECURITY-08**: Compliant. Existing admin authorization remains in each action before mutation/invalidation.
- **SECURITY-13**: Compliant. Existing audit events remain in actions; this unit does not remove logging.
- **SECURITY-03/05**: N/A. No new logs, sensitive data, inputs, or API routes.
- **SECURITY-01/02/04/06/07/09/10/11/12/14/15**: N/A. No infra, auth, headers, dependency, network, or external error-handling changes.

## Completion Notes

Application code was generated only after explicit approval. Unit 35 is ready for the Build and Test approval gate.
