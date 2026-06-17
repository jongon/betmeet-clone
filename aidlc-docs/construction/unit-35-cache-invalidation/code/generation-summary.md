# Unit 35: Invalidacion inmediata de cache tras mutaciones admin — Generation Summary

## Scope

Implemented the approved cache-consistency fix for admin result mutations. The change replaces stale-while-revalidate tag invalidation with immediate `updateTag` invalidation from Server Actions and revalidates the user/admin routes that surface match results and scores.

## Application Code

- Created `src/features/admin/services/revalidate-result-views.ts` with shared `updateTag` + `revalidatePath` policy.
- Updated `src/features/admin/actions/force-result.ts` to call `revalidateResultViews({ adminMatches: true })` after a successful manual result override and scoring.
- Updated `src/features/admin/actions/revert-override.ts` to call `revalidateResultViews({ adminMatches: true })` after a successful revert and scoring cleanup.
- Updated `src/features/admin/actions/trigger-sync.ts` to call `revalidateResultViews({ adminDashboard: true })` after sync and scoring sweeper completion.
- Updated cache-tag comments in `src/features/competition/cache-tags.ts` and `src/features/scoring-rankings/cache-tags.ts` to document `updateTag` for immediate consistency.

## Tests

- Added `src/features/admin/services/__tests__/revalidate-result-views.test.ts` for tag and route invalidation coverage.
- Added `src/features/admin/actions/__tests__/force-result.test.ts` for success and non-success invalidation behavior.
- Added `src/features/admin/actions/__tests__/trigger-sync.test.ts` for success, auth, invalid scope, and provider error behavior.
- Updated `src/features/admin/actions/__tests__/revert-override.test.ts` to assert shared-helper usage and non-success no-op invalidation.

## Verification

- `pnpm exec vitest run src/features/admin/services/__tests__/revalidate-result-views.test.ts src/features/admin/actions/__tests__/revert-override.test.ts src/features/admin/actions/__tests__/force-result.test.ts src/features/admin/actions/__tests__/trigger-sync.test.ts` — 17/17 passing.
- `pnpm exec tsc --noEmit` — OK.
- `pnpm exec biome check ...` on touched `src` files — OK.
- `pnpm exec eslint ...` on touched `src` files — OK.

## Security Baseline

- SECURITY-08 remains compliant: existing admin authorization gates still run before mutations and invalidation.
- SECURITY-13 remains compliant: existing audit events remain in successful admin mutation paths.
- Other enabled Security Baseline rules are N/A for this cache-only change.
