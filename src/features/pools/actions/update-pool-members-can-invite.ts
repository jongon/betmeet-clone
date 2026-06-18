"use server";

import { revalidatePath } from "next/cache";
import { getOnboardedUserId } from "@/features/profile/queries";
import { logAuthEvent } from "@/lib/auth-logger";
import { prisma } from "@/lib/prisma";
import { UpdatePoolMembersCanInviteSchema } from "../schemas";

/**
 * Update a pool's `membersCanInvite` flag.
 *
 * Authorization (BR-3.35, BR-45.4, SECURITY-08): only the pool owner can change
 * this setting. The check happens server-side, after onboarding is verified
 * (FR-REFINE-16.1) and the pool's `ownerId` is fetched.
 */
export async function updatePoolMembersCanInvite(input: unknown) {
  const userId = await getOnboardedUserId();
  if (!userId) {
    return { error: "Completa tu perfil para cambiar la configuración." };
  }

  const parsed = UpdatePoolMembersCanInviteSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const pool = await prisma.pool.findUnique({
    where: { id: parsed.data.poolId },
    select: { id: true, ownerId: true, type: true },
  });
  if (!pool) {
    return { error: "Liga no encontrada" };
  }

  if (pool.ownerId !== userId) {
    return { error: "Solo el administrador puede cambiar esta configuración" };
  }

  // Unit 47: el toggle solo aplica a pools PRIVATE. Los PUBLIC siempre permiten
  // invitar/compartir por definición, no necesitan toggle.
  if (pool.type !== "PRIVATE") {
    return { error: "Esta configuración solo aplica a ligas privadas" };
  }

  await prisma.pool.update({
    where: { id: pool.id },
    data: { membersCanInvite: parsed.data.membersCanInvite },
  });

  logAuthEvent("pool.settings_changed", {
    userId,
    poolId: pool.id,
    membersCanInvite: parsed.data.membersCanInvite,
  });

  revalidatePath(`/pools/${pool.id}`);

  return { success: true, membersCanInvite: parsed.data.membersCanInvite };
}
