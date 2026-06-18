"use server";

import { revalidatePath } from "next/cache";
import { getOnboardedUserId } from "@/features/profile/queries";
import { prisma } from "@/lib/prisma";
import { PredictionInputSchema } from "../schemas";
import { getPredictionEligibility } from "../services/eligibility";
import { lockExistingPrediction } from "../services/lock";
import { validatePredictionInput } from "../services/validation";

export async function savePrediction(input: {
  matchId: string;
  homeScore: number;
  awayScore: number;
  penaltyWinnerTeamId: string | null;
  poolId?: string;
  alsoSaveAsGlobal?: boolean;
}): Promise<{ success: true } | { error: string }> {
  const userId = await getOnboardedUserId();
  if (!userId) return { error: "Completa tu perfil para predecir." };

  const parsed = PredictionInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { matchId, homeScore, awayScore, penaltyWinnerTeamId, poolId } = parsed.data;
  const alsoSaveAsGlobal = input.alsoSaveAsGlobal === true;

  try {
    if (poolId) {
      const membership = await prisma.poolMembership.findUnique({
        where: { poolId_userId: { poolId, userId } },
      });
      if (!membership) {
        return { error: "No eres miembro de esta liga." };
      }
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        phase: { select: { type: true } },
        homeTeam: { select: { id: true } },
        awayTeam: { select: { id: true } },
        predictions: {
          where: {
            userId,
            poolId: poolId ?? null,
          },
        },
      },
    });

    if (!match) return { error: "El partido no existe." };

    const existing = match.predictions[0] ?? null;

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
      if (existing && !existing.lockedAt) {
        await lockExistingPrediction(userId, matchId, eligibility.reason, poolId);
      }
      if (existing) {
        return {
          error: "El partido ya no acepta cambios. Se mantiene tu última predicción guardada.",
        };
      }
      return { error: "El partido ya no acepta predicciones. No suma puntos en este partido." };
    }

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

    const data = {
      homeScore: validation.valid.homeScore,
      awayScore: validation.valid.awayScore,
      penaltyWinnerTeamId: validation.valid.penaltyWinnerTeamId,
      lockedAt: null,
      lockReason: null,
    };

    if (alsoSaveAsGlobal && poolId) {
      const globalRow = await prisma.prediction.findFirst({
        where: { userId, matchId, poolId: null },
      });
      if (globalRow) {
        if (globalRow.lockedAt) {
          await prisma.prediction.update({
            where: { id: globalRow.id },
            data: { lockedAt: null, lockReason: null },
          });
        }
        await prisma.prediction.update({ where: { id: globalRow.id }, data });
      } else {
        await prisma.prediction.create({
          data: { userId, matchId, poolId: null, ...data },
        });
      }

      const overrideRow = await prisma.prediction.findFirst({
        where: { userId, matchId, poolId },
      });
      if (overrideRow) {
        if (overrideRow.lockedAt) {
          await prisma.prediction.update({
            where: { id: overrideRow.id },
            data: { lockedAt: null, lockReason: null },
          });
        }
        await prisma.prediction.update({ where: { id: overrideRow.id }, data });
      } else {
        await prisma.prediction.create({
          data: { userId, matchId, poolId, ...data },
        });
      }
    } else if (poolId) {
      const row = await prisma.prediction.findFirst({
        where: { userId, matchId, poolId },
      });
      if (row) {
        if (row.lockedAt) {
          await prisma.prediction.update({
            where: { id: row.id },
            data: { lockedAt: null, lockReason: null },
          });
        }
        await prisma.prediction.update({ where: { id: row.id }, data });
      } else {
        await prisma.prediction.create({
          data: { userId, matchId, poolId, ...data },
        });
      }
    } else {
      const row = await prisma.prediction.findFirst({
        where: { userId, matchId, poolId: null },
      });
      if (row) {
        if (row.lockedAt) {
          await prisma.prediction.update({
            where: { id: row.id },
            data: { lockedAt: null, lockReason: null },
          });
        }
        await prisma.prediction.update({ where: { id: row.id }, data });
      } else {
        await prisma.prediction.create({
          data: { userId, matchId, poolId: null, ...data },
        });
      }
    }
  } catch (err) {
    const detail =
      err instanceof Error
        ? { name: err.name, message: err.message, cause: err.cause }
        : String(err);
    console.error("savePrediction failed:", detail);
    return { error: "No se pudo guardar la predicción. Inténtalo de nuevo." };
  }

  revalidatePath("/matches", "page");
  if (poolId) {
    revalidatePath(`/pools/${poolId}`, "page");
  }
  return { success: true };
}
