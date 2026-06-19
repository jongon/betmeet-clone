/**
 * Cache tag for the static competition fixture (phases, matches, teams, status,
 * scores) served to `/matches` via `unstable_cache` (NFR-PERF-REFINE-22.3, Unit 22).
 *
 * Invalidate with `revalidateTag(COMPETITION_FIXTURE_TAG)` from Server Actions /
 * route handlers that change fixture data, such as admin sync/result mutations.
 * `unstable_cache` tags are invalidated by `revalidateTag`, NOT `updateTag` (the
 * latter only targets `use cache`/`cacheTag` entries and is a no-op here, which
 * left `/matches` serving stale results until the time-based window elapsed).
 * Per-user predictions are NOT part of this cache and stay dynamic.
 */
export const COMPETITION_FIXTURE_TAG = "competition-fixture";
