import type { PredictionLockReason } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export async function lockExistingPrediction(
  userId: string,
  matchId: string,
  reason: PredictionLockReason,
  poolId?: string,
): Promise<boolean> {
  const now = new Date();

  const result = await prisma.prediction.updateMany({
    where: {
      userId,
      matchId,
      poolId: poolId ?? null,
      lockedAt: null,
    },
    data: {
      lockedAt: now,
      lockReason: reason,
    },
  });

  return result.count > 0;
}
