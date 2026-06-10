import { computeScore } from "@/features/scoring/compute-score";
import type { ScoreMatchedCase } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { type ScoreableMatch, toScoringExample } from "./score-adapter";

/**
 * Scores every prediction of a match against its result (BL-2, US-5.1).
 * Idempotent: re-running upserts and overwrites — safe after an admin override
 * (US-6.2, BR-6.6). If the match is not scoreable (not FINISHED, missing score,
 * cancelled/postponed) any existing scores for it are removed (BR-6.7).
 */
export async function scoreMatch(matchId: string): Promise<{ scored: number }> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { phase: true, predictions: true },
  });
  if (!match) return { scored: 0 };

  const scoreable =
    match.status === "FINISHED" && match.homeScore !== null && match.awayScore !== null;

  if (!scoreable) {
    await prisma.predictionScore.deleteMany({ where: { matchId } });
    return { scored: 0 };
  }

  const scoreableMatch: ScoreableMatch = {
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    homeScore: match.homeScore as number,
    awayScore: match.awayScore as number,
    winnerTeamId: match.winnerTeamId,
    isKnockout: match.phase.type === "KNOCKOUT",
  };

  await prisma.$transaction(
    match.predictions.map((prediction) => {
      const breakdown = computeScore(toScoringExample(prediction, scoreableMatch));
      const data = {
        matchId,
        userId: prediction.userId,
        matchedCase: breakdown.matchedCase as ScoreMatchedCase,
        basePoints: breakdown.basePoints,
        penaltyApplied: breakdown.penaltyApplied,
        penaltyPoints: breakdown.penaltyPoints,
        totalPoints: breakdown.totalPoints,
        scoredAt: new Date(),
      };
      return prisma.predictionScore.upsert({
        where: { predictionId: prediction.id },
        create: { predictionId: prediction.id, ...data },
        update: data,
      });
    }),
  );

  return { scored: match.predictions.length };
}
