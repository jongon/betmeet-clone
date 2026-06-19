"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { RANKINGS_TAG } from "@/features/scoring-rankings/cache-tags";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "../services/session";

/**
 * Owner kicks a member (BL-4, US-4.3).
 * FR-REFINE-23: no longer gated by the competition freeze — kicking is allowed at any time.
 */
export async function kickMember(poolId: string, targetUserId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  const pool = await prisma.pool.findUnique({ where: { id: poolId } });
  if (!pool) return { error: "Liga no encontrada." };
  if (pool.ownerId !== userId) return { error: "Solo el administrador puede expulsar." };
  if (targetUserId === pool.ownerId) return { error: "El administrador no puede expulsarse." };

  await prisma.poolMembership.deleteMany({ where: { poolId, userId: targetUserId } });

  // Membership change invalidates the cached pool leaderboard (RANKINGS_TAG).
  revalidateTag(RANKINGS_TAG, "max");
  revalidatePath(`/pools/${poolId}`);
  return { success: true };
}
