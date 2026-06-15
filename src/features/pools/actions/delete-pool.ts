"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "../services/session";

/**
 * Owner deletes the pool (BL-7, Q8). Cascades memberships.
 * FR-REFINE-23: no longer gated by the competition freeze — deleting is allowed at any time.
 */
export async function deletePool(poolId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  const pool = await prisma.pool.findUnique({ where: { id: poolId } });
  if (!pool) return { error: "Liga no encontrada." };
  if (pool.ownerId !== userId) return { error: "Solo el administrador puede eliminar la liga." };

  await prisma.pool.delete({ where: { id: poolId } });

  revalidatePath("/pools");
  redirect("/pools");
}
