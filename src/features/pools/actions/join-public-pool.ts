"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { isFrozen } from "../services/competition-lock";
import { getCurrentUserId } from "../services/session";

/** Join a public pool from the directory (BL-2). */
export async function joinPublicPool(poolId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  if (await isFrozen()) return { error: "Las listas están congeladas: ya no se puede unir." };

  try {
    await prisma.$transaction(async (tx) => {
      const pool = await tx.pool.findUnique({
        where: { id: poolId },
        include: { _count: { select: { memberships: true } } },
      });
      if (pool?.type !== "PUBLIC") throw new Error("NOT_FOUND");
      if (pool._count.memberships >= pool.capacity) throw new Error("FULL");

      const existing = await tx.poolMembership.findUnique({
        where: { poolId_userId: { poolId, userId } },
      });
      if (existing) throw new Error("ALREADY_MEMBER");

      await tx.poolMembership.create({ data: { poolId, userId } });
    });
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    if (code === "FULL") return { error: "El pool está lleno." };
    if (code === "ALREADY_MEMBER") return { error: "Ya eres miembro de este pool." };
    if (code === "NOT_FOUND") return { error: "Pool no encontrado." };
    return { error: "No se pudo unir al pool." };
  }

  revalidatePath("/pools");
  revalidatePath(`/pools/${poolId}`);
  return { success: true };
}
