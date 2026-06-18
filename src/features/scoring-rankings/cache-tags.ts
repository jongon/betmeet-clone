/**
 * Cache tag for the global ranking served to `/rankings` via `unstable_cache`
 * (NFR-PERF-REFINE-22.4, Unit 22). The ranking only changes when prediction scores
 * change, so it is cached and invalidated by event instead of recomputing an
 * unfiltered `groupBy` over the whole `PredictionScore` table on every visit.
 *
 * Invalidate with `updateTag(RANKINGS_TAG)` from Server Actions that require
 * immediate read-your-own-writes after score changes, such as admin sync/result
 * mutations.
 */
export const RANKINGS_TAG = "rankings";

export const POOL_LEADERBOARD_TAG_PREFIX = "pool-leaderboard-";
