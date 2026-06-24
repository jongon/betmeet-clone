"use server";

import { revalidatePath } from "next/cache";
import { getOnboardedUserId } from "@/features/profile/queries";
import { logAuthEvent } from "@/lib/auth-logger";
import { prisma } from "@/lib/prisma";
import { UpdatePoolVisibilitySchema } from "../schemas";

/**
 * Change a pool's visibility public↔private (Unit 65, FR-REFINE-65.1).
 *
 * Authorization (BR-65.1, BR-3.28, SECURITY-08): only the pool owner can change
 * the visibility. The check happens server-side, after onboarding is verified
 * (FR-REFINE-16.1) and the pool's `ownerId` is fetched.
 *
 * BR-65.2: switching PRIVATE→PUBLIC must respect public-name uniqueness (BR-3.2,
 * partial index `pools_public_name_unique`). PUBLIC→PRIVATE is always allowed:
 * the pool just leaves the directory (`listPublicPools` filters `type:"PUBLIC"`)
 * and `joinPublicPool` rejects it; members and `inviteToken` are preserved
 * (BR-65.3). The call is idempotent when the target type already matches
 * (BR-65.4).
 */
export async function updatePoolVisibility(input: unknown) {
  const userId = await getOnboardedUserId();
  if (!userId) {
    return { error: "Completa tu perfil para cambiar la configuración." };
  }

  const parsed = UpdatePoolVisibilitySchema.safeParse(input);
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

  // BR-65.4: idempotente. Si ya está en la visibilidad pedida, no hay nada que hacer.
  if (pool.type === parsed.data.type) {
    return { success: true, type: pool.type };
  }

  // BR-65.2: al pasar a PUBLIC, el nombre debe ser único entre pools públicos
  // (BR-3.2, índice parcial `pools_public_name_unique`). Pre-check amigable; el
  // índice es la guardia final ante carreras.
  if (parsed.data.type === "PUBLIC") {
    const clash = await prisma.pool.findFirst({
      where: { type: "PUBLIC", name: pool.name, id: { not: pool.id } },
    });
    if (clash) {
      return { error: "Ya existe una liga pública con ese nombre" };
    }
  }

  try {
    await prisma.pool.update({
      where: { id: pool.id },
      data: { type: parsed.data.type },
    });
  } catch {
    return { error: "Ya existe una liga pública con ese nombre" };
  }

  logAuthEvent("pool.settings_changed", {
    userId,
    poolId: pool.id,
    visibility: parsed.data.type,
  });

  // La visibilidad afecta el detalle, la lista del usuario y el directorio
  // público (/pools/discover). No toca rankings.
  revalidatePath(`/pools/${pool.id}`);
  revalidatePath("/pools");
  revalidatePath("/pools/discover");

  return { success: true, type: parsed.data.type };
}
