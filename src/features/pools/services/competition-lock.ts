import { getCompetitionLockTime } from "../../competition/services/competition-lock";

export { getCompetitionLockTime };

/**
 * Whether the competition has started (kickoff reached).
 *
 * FR-REFINE-23 (Unit 23) removed the membership "freeze": joining, leaving, kicking
 * and deleting are now allowed at any time, so this no longer gates any pool mutation.
 * Retained as a generic "has the competition started?" utility (still unit-tested) for
 * potential reuse; it is intentionally not wired to membership actions.
 */
export async function isFrozen(now: Date = new Date()): Promise<boolean> {
  const lockTime = await getCompetitionLockTime();
  if (lockTime === null) return false;
  return now.getTime() >= lockTime.getTime();
}
