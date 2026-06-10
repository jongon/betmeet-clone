import type { ScoreBreakdown } from "@/features/scoring/compute-score";
import type { ScoreMatchedCase } from "@/generated/prisma/enums";

export type PredictionPointsStatus = "PENDING_SCORING" | "NOT_SCORED" | "SCORED";

/** Persisted score fields needed to build a ScoreBreakdown. */
export interface ScoreRow {
  matchedCase: ScoreMatchedCase;
  basePoints: number;
  penaltyApplied: boolean;
  penaltyPoints: number;
  totalPoints: number;
}

/** Maps a persisted PredictionScore to the Unit 2 ScoreBreakdown shape. */
export function toBreakdown(score: ScoreRow): ScoreBreakdown {
  return {
    matchedCase: score.matchedCase,
    basePoints: score.basePoints,
    penaltyApplied: score.penaltyApplied,
    penaltyPoints: score.penaltyPoints,
    totalPoints: score.totalPoints,
    explanationKey: score.matchedCase,
  };
}

/**
 * Resolves the points/status/breakdown for a prediction's match (BL-7, BR-6.9).
 * Replaces the Unit 5 stub.
 */
export function resolvePoints(params: {
  hasPrediction: boolean;
  matchStatus: string;
  score: ScoreRow | null;
}): { points: number | null; status: PredictionPointsStatus; breakdown?: ScoreBreakdown } {
  if (params.score) {
    return {
      points: params.score.totalPoints,
      status: "SCORED",
      breakdown: toBreakdown(params.score),
    };
  }
  if (params.matchStatus === "CANCELLED" || params.matchStatus === "POSTPONED") {
    return { points: null, status: "NOT_SCORED" };
  }
  if (params.hasPrediction) {
    return { points: null, status: "PENDING_SCORING" };
  }
  return { points: null, status: "NOT_SCORED" };
}
