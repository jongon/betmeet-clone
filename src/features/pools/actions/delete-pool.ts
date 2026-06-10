"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isFrozen } from "../services/competition-lock";
import { getCurrentUserId } from "../services/session";

/** Owner deletes the pool before the freeze (BL-7, Q8). Cascades memberships. */
export async function deletePool(poolId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  const pool = await prisma.pool.findUnique({ where: { id: poolId } });
  if (!pool) return { error: "Pool no encontrado." };
  if (pool.ownerId !== userId) return { error: "Solo el administrador puede eliminar el pool." };
  if (await isFrozen()) return { error: "El pool no puede eliminarse una vez iniciado el torneo." };

  await prisma.pool.delete({ where: { id: poolId } });

  revalidatePath("/pools");
  redirect("/pools");
}
