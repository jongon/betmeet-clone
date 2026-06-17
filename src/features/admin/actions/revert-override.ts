"use server";

import { scoreMatch } from "@/features/scoring-rankings/services/score-match";
import { logAuthEvent } from "@/lib/auth-logger";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "../services/require-admin";
import { revalidateResultViews } from "../services/revalidate-result-views";

/**
 * Reverts a manual override, returning control to the API (BL-3, BR-7.8/7.9,
 * FR-REFINE-31.1). Clears the manually-entered result (scores/penalties/winner)
 * and resets the match to SCHEDULED so it is no longer scoreable. `scoreMatch`
 * then removes the PredictionScore rows, reverting the points users earned from
 * the manual result. The next API sync repopulates the real result and re-scores.
 * The original API result is NOT snapshotted, so this clears rather than restores.
 */
export async function revertMatchOverride(matchId: string) {
  const adminId = await getAdminUserId();
  if (!adminId) return { error: "No autorizado" };

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return { error: "Partido no encontrado" };

  await prisma.match.update({
    where: { id: matchId },
    data: {
      homeScore: null,
      awayScore: null,
      homePenaltyScore: null,
      awayPenaltyScore: null,
      winnerTeamId: null,
      status: "SCHEDULED",
      manualOverride: false,
      manualOverrideReason: null,
      overriddenByUserId: null,
      overriddenAt: null,
    },
  });

  await scoreMatch(matchId); // match is no longer scoreable → removes PredictionScore (BR-6.7)

  logAuthEvent("admin.override_reverted", { userId: adminId, matchId });
  revalidateResultViews({ adminMatches: true });
  return { success: true };
}
