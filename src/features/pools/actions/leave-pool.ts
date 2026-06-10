"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isFrozen } from "../services/competition-lock";
import { getCurrentUserId } from "../services/session";

/** A non-owner member leaves the pool before the freeze (BL-5, Q7). */
export async function leavePool(poolId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  const pool = await prisma.pool.findUnique({ where: { id: poolId } });
  if (!pool) return { error: "Pool no encontrado." };
  if (pool.ownerId === userId) {
    return { error: "El administrador no puede salir; debe eliminar o transferir el pool." };
  }
  if (await isFrozen()) return { error: "Las listas están congeladas." };

  await prisma.poolMembership.deleteMany({ where: { poolId, userId } });

  revalidatePath("/pools");
  return { success: true };
}
