/**
 * Cache tag for the global ranking served to `/rankings` via `unstable_cache`
 * (NFR-PERF-REFINE-22.4, Unit 22). The ranking only changes when prediction scores
 * change, so it is cached and invalidated by event instead of recomputing an
 * unfiltered `groupBy` over the whole `PredictionScore` table on every visit.
 *
 * Invalidate with `revalidateTag(RANKINGS_TAG, "max")` from every request-context
 * path that writes scores via `scoreMatch`: the admin-triggered sync (`triggerSync`,
 * which runs the scoring sweeper) and the manual result override / revert actions.
 */
export const RANKINGS_TAG = "rankings";
