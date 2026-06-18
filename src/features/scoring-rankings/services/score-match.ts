import { randomUUID } from "node:crypto";
import {
  emitGlobalRankImprovedEvents,
  getGlobalRankSnapshot,
} from "@/features/notifications/services/ranking-events";
import { computeScore } from "@/features/scoring/compute-score";
import { Prisma } from "@/generated/prisma/client";
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

  const previousGlobalRanks = await getGlobalRankSnapshot().catch(() => null);

  const scoreableMatch: ScoreableMatch = {
    homeTeamId: match.homeTeamId,
    awayTeamId: match.awayTeamId,
    homeScore: match.homeScore as number,
    awayScore: match.awayScore as number,
    winnerTeamId: match.winnerTeamId,
    isKnockout: match.phase.type === "KNOCKOUT",
  };

  if (match.predictions.length > 0) {
    // One atomic `INSERT ... ON CONFLICT` for the whole match instead of N
    // upserts inside a transaction: still all-or-nothing (a single statement),
    // but a single round-trip that scales with match size. Still idempotent —
    // re-running overwrites every row (safe after an admin override, BR-6.6).
    const scoredAt = new Date();
    const valueRows = match.predictions.map((prediction) => {
      const breakdown = computeScore(toScoringExample(prediction, scoreableMatch));
      return Prisma.sql`(${randomUUID()}::uuid, ${prediction.id}::uuid, ${matchId}::uuid, ${prediction.userId}::uuid, ${breakdown.matchedCase}::"ScoreMatchedCase", ${breakdown.basePoints}, ${breakdown.penaltyApplied}, ${breakdown.penaltyPoints}, ${breakdown.totalPoints}, ${scoredAt})`;
    });

    await prisma.$executeRaw`
      INSERT INTO prediction_scores
        (id, prediction_id, match_id, user_id, matched_case, base_points, penalty_applied, penalty_points, total_points, scored_at)
      VALUES ${Prisma.join(valueRows)}
      ON CONFLICT (prediction_id) DO UPDATE SET
        match_id = EXCLUDED.match_id,
        user_id = EXCLUDED.user_id,
        matched_case = EXCLUDED.matched_case,
        base_points = EXCLUDED.base_points,
        penalty_applied = EXCLUDED.penalty_applied,
        penalty_points = EXCLUDED.penalty_points,
        total_points = EXCLUDED.total_points,
        scored_at = EXCLUDED.scored_at
    `;
  }

  if (previousGlobalRanks) {
    try {
      await emitGlobalRankImprovedEvents(previousGlobalRanks, matchId);
    } catch {
      // Notification outbox is best-effort and must not block scoring.
    }
  }

  return { scored: match.predictions.length };
}
