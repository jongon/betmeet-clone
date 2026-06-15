"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { COMPETITION_FIXTURE_TAG } from "@/features/competition/cache-tags";
import { RANKINGS_TAG } from "@/features/scoring-rankings/cache-tags";
import { scoreMatch } from "@/features/scoring-rankings/services/score-match";
import { logAuthEvent } from "@/lib/auth-logger";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "../services/require-admin";

/**
 * Reverts a manual override, returning control to the API (BL-3, BR-7.8/7.9).
 * Keeps the last score, clears the override flag/audit, and re-scores.
 */
export async function revertMatchOverride(matchId: string) {
  const adminId = await getAdminUserId();
  if (!adminId) return { error: "No autorizado" };

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return { error: "Partido no encontrado" };

  await prisma.match.update({
    where: { id: matchId },
    data: {
      manualOverride: false,
      manualOverrideReason: null,
      overriddenByUserId: null,
      overriddenAt: null,
    },
  });

  await scoreMatch(matchId);

  logAuthEvent("admin.override_reverted", { userId: adminId, matchId });
  revalidatePath("/admin/matches");
  revalidateTag(COMPETITION_FIXTURE_TAG, "max"); // refresh the cached /matches fixture
  revalidateTag(RANKINGS_TAG, "max"); // scoreMatch rescored → refresh /rankings
  return { success: true };
}
