"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "../services/session";

/** Toggle the current member's personal archive state (BL-6, F1). No freeze gate. */
export async function setPoolArchived(poolId: string, archived: boolean) {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  const result = await prisma.poolMembership.updateMany({
    where: { poolId, userId },
    data: { archivedAt: archived ? new Date() : null },
  });
  if (result.count === 0) return { error: "No eres miembro de esta liga." };

  revalidatePath("/pools");
  return { success: true };
}
