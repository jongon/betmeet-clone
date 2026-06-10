"use server";

import { revalidatePath } from "next/cache";
import { scoreMatch } from "@/features/scoring-rankings/services/score-match";
import { logAuthEvent } from "@/lib/auth-logger";
import { prisma } from "@/lib/prisma";
import { ForceResultSchema } from "../schemas";
import { getAdminUserId } from "../services/require-admin";
import { resolveWinner } from "../services/resolve-winner";

/**
 * Admin forces a match result (US-6.2, BL-2): persists the override + audit and
 * synchronously re-scores all predictions (BR-7.5).
 */
export async function forceMatchResult(matchId: string, input: unknown) {
  const adminId = await getAdminUserId();
  if (!adminId) return { error: "No autorizado" };

  const parsed = ForceResultSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  const data = parsed.data;

  const match = await prisma.match.findUnique({ where: { id: matchId }, include: { phase: true } });
  if (!match) return { error: "Partido no encontrado" };
  if (!match.homeTeamId || !match.awayTeamId) {
    return { error: "El partido no tiene equipos definidos." };
  }

  const isKnockout = match.phase.type === "KNOCKOUT";
  const tied = data.homeScore === data.awayScore;
  if (isKnockout && tied && !data.penaltyWinnerTeamId) {
    return { error: "En knockout empatado debes indicar el ganador de penales." };
  }
  if (
    data.penaltyWinnerTeamId &&
    data.penaltyWinnerTeamId !== match.homeTeamId &&
    data.penaltyWinnerTeamId !== match.awayTeamId
  ) {
    return { error: "El ganador de penales debe ser uno de los equipos." };
  }

  const winnerTeamId = resolveWinner({
    homeScore: data.homeScore,
    awayScore: data.awayScore,
    isKnockout,
    penaltyWinnerTeamId: data.penaltyWinnerTeamId ?? null,
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
  });

  await prisma.match.update({
    where: { id: matchId },
    data: {
      homeScore: data.homeScore,
      awayScore: data.awayScore,
      homePenaltyScore: isKnockout ? (data.homePenaltyScore ?? null) : null,
      awayPenaltyScore: isKnockout ? (data.awayPenaltyScore ?? null) : null,
      winnerTeamId,
      status: "FINISHED",
      manualOverride: true,
      manualOverrideReason: data.reason,
      overriddenByUserId: adminId,
      overriddenAt: new Date(),
    },
  });

  await scoreMatch(matchId); // synchronous re-score (BR-7.5)

  logAuthEvent("admin.match_overridden", { userId: adminId, matchId });
  revalidatePath("/admin/matches");
  return { success: true };
}
