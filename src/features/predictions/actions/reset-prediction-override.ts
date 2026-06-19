"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getOnboardedUserId } from "@/features/profile/queries";
import { POOL_LEADERBOARD_TAG_PREFIX } from "@/features/scoring-rankings/cache-tags";
import { prisma } from "@/lib/prisma";
import { ResetPredictionOverrideSchema } from "../schemas";

export async function resetPredictionOverride(input: {
  matchId: string;
  poolId: string;
}): Promise<{ success: true } | { error: string }> {
  const userId = await getOnboardedUserId();
  if (!userId) return { error: "Completa tu perfil para predecir." };

  const parsed = ResetPredictionOverrideSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { matchId, poolId } = parsed.data;

  const membership = await prisma.poolMembership.findUnique({
    where: { poolId_userId: { poolId, userId } },
  });
  if (!membership) {
    return { error: "No eres miembro de esta liga." };
  }

  try {
    await prisma.prediction.deleteMany({
      where: { userId, matchId, poolId },
    });
  } catch {
    return { error: "No se pudo eliminar la predicción. Inténtalo de nuevo." };
  }

  revalidatePath(`/pools/${poolId}`, "page");
  // The pool leaderboard cache is tagged with the bare prefix (see
  // getPoolLeaderboardRows), so invalidation must use the same string — a
  // per-pool suffix here would never match and the leaderboard would stay stale.
  revalidateTag(POOL_LEADERBOARD_TAG_PREFIX, "max");
  return { success: true };
}
