"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/features/pools/services/session";
import { prisma } from "@/lib/prisma";
import { PredictionInputSchema } from "../schemas";
import { getPredictionEligibility } from "../services/eligibility";
import { lockExistingPrediction } from "../services/lock";
import { validatePredictionInput } from "../services/validation";

/**
 * BL-5.1: Create or update a prediction for the authenticated user.
 * Re-checks eligibility, validates input, upserts, and returns success or a domain error.
 */
export async function savePrediction(input: {
  matchId: string;
  homeScore: number;
  awayScore: number;
  penaltyWinnerTeamId: string | null;
}): Promise<{ success: true } | { error: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Debes iniciar sesión para predecir." };

  const parsed = PredictionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { matchId, homeScore, awayScore, penaltyWinnerTeamId } = parsed.data;

  // Load match with phase and teams for server-authoritative eligibility check
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      phase: { select: { type: true } },
      homeTeam: { select: { id: true } },
      awayTeam: { select: { id: true } },
      predictions: { where: { userId } },
    },
  });

  if (!match) return { error: "El partido no existe." };

  const existing = match.predictions[0] ?? null;

  // Re-check eligibility server-side (BL-5.0)
  const eligibility = getPredictionEligibility(
    {
      homeTeamId: match.homeTeam?.id ?? null,
      awayTeamId: match.awayTeam?.id ?? null,
      kickoffAt: match.kickoffAt,
      status: match.status,
    },
    new Date(),
  );

  if (!eligibility.editable) {
    // If not editable and user had an existing unlocked prediction, lock it (BL-5.3)
    if (existing && !existing.lockedAt) {
      await lockExistingPrediction(userId, matchId, eligibility.reason);
    }
    // Return 403-style domain error; do NOT create implicit prediction
    if (existing) {
      return {
        error: "El partido ya no acepta cambios. Se mantiene tu última predicción guardada.",
      };
    }
    return { error: "El partido ya no acepta predicciones. No suma puntos en este partido." };
  }

  // Validate input against match context (BL-5.2)
  const validation = validatePredictionInput(
    {
      phaseType: match.phase.type,
      homeTeamId: match.homeTeam?.id ?? null,
      awayTeamId: match.awayTeam?.id ?? null,
    },
    { homeScore, awayScore, penaltyWinnerTeamId },
  );

  if (!validation.valid) {
    return { error: validation.errors[0]?.message ?? "Datos inválidos." };
  }

  // Upsert: create or update the unlocked prediction
  try {
    await prisma.prediction.upsert({
      where: {
        userId_matchId: { userId, matchId },
      },
      create: {
        userId,
        matchId,
        homeScore: validation.valid.homeScore,
        awayScore: validation.valid.awayScore,
        penaltyWinnerTeamId: validation.valid.penaltyWinnerTeamId,
      },
      update: {
        homeScore: validation.valid.homeScore,
        awayScore: validation.valid.awayScore,
        penaltyWinnerTeamId: validation.valid.penaltyWinnerTeamId,
      },
    });
  } catch {
    return { error: "No se pudo guardar la predicción. Inténtalo de nuevo." };
  }

  revalidatePath("/matches");
  return { success: true };
}
