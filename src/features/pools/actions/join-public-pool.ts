"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "../services/session";

/**
 * Join a public pool from the directory (BL-2).
 * FR-REFINE-23: joining is allowed at any time, even after the competition has
 * started (no `isFrozen()` gate). Capacity (BR-3.7) and uniqueness (BR-3.6) still apply.
 */
export async function joinPublicPool(poolId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  try {
    await prisma.$transaction(async (tx) => {
      const pool = await tx.pool.findUnique({
        where: { id: poolId },
        include: { _count: { select: { memberships: true } } },
      });
      if (pool?.type !== "PUBLIC") throw new Error("NOT_FOUND");

      const existing = await tx.poolMembership.findUnique({
        where: { poolId_userId: { poolId, userId } },
      });
      // Already a member is not an error (FR-REFINE-13.6): surface it as info.
      if (existing) throw new Error("ALREADY_MEMBER");

      if (pool._count.memberships >= pool.capacity) throw new Error("FULL");

      await tx.poolMembership.create({ data: { poolId, userId } });
    });
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    // Informational, not a fatal error: the user stays in the directory but can
    // navigate to the pool they already belong to (FR-REFINE-13.6).
    if (code === "ALREADY_MEMBER") return { alreadyMember: true as const, poolId };
    if (code === "FULL") return { error: "La liga está llena." };
    if (code === "NOT_FOUND") return { error: "Liga no encontrada." };
    return { error: "No se pudo unir a la liga." };
  }

  revalidatePath("/pools");
  revalidatePath(`/pools/${poolId}`);
  // Successful join redirects straight to the pool page (FR-REFINE-13.5).
  return { success: true as const, poolId };
}
