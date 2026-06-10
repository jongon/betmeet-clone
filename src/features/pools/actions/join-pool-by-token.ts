"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { JoinByTokenSchema } from "../schemas";
import { isFrozen } from "../services/competition-lock";
import { getCurrentUserId } from "../services/session";

/** Join a pool via invite token / link (BL-3). */
export async function joinPoolByToken(token: string) {
  const parsed = JoinByTokenSchema.safeParse({ token });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Código inválido" };

  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  if (await isFrozen()) return { error: "Las listas están congeladas: ya no se puede unir." };

  let targetPoolId: string | null = null;
  try {
    targetPoolId = await prisma.$transaction(async (tx) => {
      const pool = await tx.pool.findUnique({
        where: { inviteToken: parsed.data.token.toUpperCase() },
        include: { _count: { select: { memberships: true } } },
      });
      if (!pool) throw new Error("NOT_FOUND");

      const existing = await tx.poolMembership.findUnique({
        where: { poolId_userId: { poolId: pool.id, userId } },
      });
      if (existing) return pool.id; // already a member → just navigate there

      if (pool._count.memberships >= pool.capacity) throw new Error("FULL");
      await tx.poolMembership.create({ data: { poolId: pool.id, userId } });
      return pool.id;
    });
  } catch (err) {
    const code = err instanceof Error ? err.message : "";
    if (code === "FULL") return { error: "La liga está llena." };
    if (code === "NOT_FOUND") return { error: "Código de invitación inválido." };
    return { error: "No se pudo unir a la liga." };
  }

  revalidatePath("/pools");
  redirect(`/pools/${targetPoolId}`);
}
