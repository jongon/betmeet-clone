/**
 * Cache tag for the static competition fixture (phases, matches, teams, status,
 * scores) served to `/matches` via `unstable_cache` (NFR-PERF-REFINE-22.3, Unit 22).
 *
 * Invalidate with `updateTag(COMPETITION_FIXTURE_TAG)` from Server Actions that
 * require immediate read-your-own-writes, such as admin sync/result mutations.
 * Per-user predictions are NOT part of this cache and stay dynamic.
 */
export const COMPETITION_FIXTURE_TAG = "competition-fixture";
