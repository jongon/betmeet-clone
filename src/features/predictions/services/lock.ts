import type { PredictionLockReason } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/**
 * BL-5.3: Lock an existing unlocked prediction for a user/match pair.
 * Called when the match is no longer editable (kickoff reached, status locked, etc.).
 */
export async function lockExistingPrediction(
  userId: string,
  matchId: string,
  reason: PredictionLockReason,
): Promise<boolean> {
  const now = new Date();

  const result = await prisma.prediction.updateMany({
    where: {
      userId,
      matchId,
      lockedAt: null,
    },
    data: {
      lockedAt: now,
      lockReason: reason,
    },
  });

  return result.count > 0;
}
