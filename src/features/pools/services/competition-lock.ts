import { getCompetitionLockTime } from "../../competition/services/competition-lock";

export { getCompetitionLockTime };

/** True once the competition has locked. Null lock time ⇒ not frozen (BR-3.21). */
export async function isFrozen(now: Date = new Date()): Promise<boolean> {
  const lockTime = await getCompetitionLockTime();
  if (lockTime === null) return false;
  return now.getTime() >= lockTime.getTime();
}
