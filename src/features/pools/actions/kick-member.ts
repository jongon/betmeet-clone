"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isFrozen } from "../services/competition-lock";
import { getCurrentUserId } from "../services/session";

/** Owner kicks a member before the freeze (BL-4, US-4.3). */
export async function kickMember(poolId: string, targetUserId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  const pool = await prisma.pool.findUnique({ where: { id: poolId } });
  if (!pool) return { error: "Liga no encontrada." };
  if (pool.ownerId !== userId) return { error: "Solo el administrador puede expulsar." };
  if (await isFrozen()) return { error: "Las listas están congeladas." };
  if (targetUserId === pool.ownerId) return { error: "El administrador no puede expulsarse." };

  await prisma.poolMembership.deleteMany({ where: { poolId, userId: targetUserId } });

  revalidatePath(`/pools/${poolId}`);
  return { success: true };
}
