"use server";

import { revalidatePath } from "next/cache";
import { getOnboardedUserId } from "@/features/profile/queries";
import { logAuthEvent } from "@/lib/auth-logger";
import { prisma } from "@/lib/prisma";
import { RenamePoolSchema } from "../schemas";

/**
 * Rename a pool (Unit 54, FR-REFINE-54.1).
 *
 * Authorization (BR-54.1, SECURITY-08): only the pool owner can rename it. The
 * check happens server-side, after onboarding is verified (FR-REFINE-16.1) and
 * the pool's `ownerId` is fetched. Applies to both PUBLIC and PRIVATE pools
 * (BR-54.3). The name is validated to 3–60 chars, trimmed (BR-54.2).
 */
export async function renamePool(input: unknown) {
  const userId = await getOnboardedUserId();
  if (!userId) {
    return { error: "Completa tu perfil para cambiar la configuración." };
  }

  const parsed = RenamePoolSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const pool = await prisma.pool.findUnique({
    where: { id: parsed.data.poolId },
    select: { id: true, ownerId: true, name: true, type: true },
  });
  if (!pool) {
    return { error: "Liga no encontrada" };
  }

  if (pool.ownerId !== userId) {
    return { error: "Solo el administrador puede cambiar esta configuración" };
  }

  // BR-54.6: el nombre es único entre pools públicos (BR-3.2, índice parcial
  // `pools_public_name_unique`). Pre-check amigable; el índice es la guardia
  // final ante carreras. Los pools privados pueden repetir nombre.
  if (pool.type === "PUBLIC") {
    const clash = await prisma.pool.findFirst({
      where: { type: "PUBLIC", name: parsed.data.name, id: { not: pool.id } },
    });
    if (clash) {
      return { error: "Ya existe una liga pública con ese nombre" };
    }
  }

  try {
    await prisma.pool.update({
      where: { id: pool.id },
      data: { name: parsed.data.name },
    });
  } catch {
    return { error: "Ya existe una liga pública con ese nombre" };
  }

  logAuthEvent("pool.settings_changed", {
    userId,
    poolId: pool.id,
    renamedTo: parsed.data.name,
  });

  // El nombre se muestra en la lista (/pools) y en el detalle (/pools/[id]).
  // No afecta rankings, así que no se invalida RANKINGS_TAG.
  revalidatePath(`/pools/${pool.id}`);
  revalidatePath("/pools");

  return { success: true, name: parsed.data.name };
}
