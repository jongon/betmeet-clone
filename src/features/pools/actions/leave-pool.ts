"use server";

import { revalidatePath, updateTag } from "next/cache";
import { RANKINGS_TAG } from "@/features/scoring-rankings/cache-tags";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "../services/session";

/**
 * A non-owner member leaves the pool (BL-5, Q7).
 * FR-REFINE-23: no longer gated by the competition freeze — leaving is allowed at any time.
 */
export async function leavePool(poolId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  const pool = await prisma.pool.findUnique({ where: { id: poolId } });
  if (!pool) return { error: "Liga no encontrada." };
  if (pool.ownerId === userId) {
    return { error: "El administrador no puede salir; debe eliminar o transferir la liga." };
  }

  await prisma.poolMembership.deleteMany({ where: { poolId, userId } });

  // Membership change invalidates the cached pool leaderboard (RANKINGS_TAG).
  updateTag(RANKINGS_TAG);
  revalidatePath("/pools");
  revalidatePath(`/pools/${poolId}`);
  return { success: true };
}
