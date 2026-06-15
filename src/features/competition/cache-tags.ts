/**
 * Cache tag for the static competition fixture (phases, matches, teams, status,
 * scores) served to `/matches` via `unstable_cache` (NFR-PERF-REFINE-22.3, Unit 22).
 *
 * Invalidate with `revalidateTag(COMPETITION_FIXTURE_TAG)` from every request-context
 * path that mutates match data: the admin-triggered sync (`triggerSync`) and the
 * manual result override / revert actions. Per-user predictions are NOT part of this
 * cache and stay dynamic.
 */
export const COMPETITION_FIXTURE_TAG = "competition-fixture";
