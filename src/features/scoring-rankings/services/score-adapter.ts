import type { ScoringExample } from "@/features/scoring/compute-score";

/**
 * Minimal match shape needed to score (BL-1). `homeScore`/`awayScore` are the
 * real result (non-null — the caller guards before adapting).
 */
export interface ScoreableMatch {
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number;
  awayScore: number;
  winnerTeamId: string | null;
  isKnockout: boolean;
}

export interface ScoreablePrediction {
  homeScore: number;
  awayScore: number;
  penaltyWinnerTeamId: string | null;
}

/** Translates a teamId into the home/away side of the match (BR-6.4). */
export function teamToSide(
  teamId: string | null,
  match: Pick<ScoreableMatch, "homeTeamId" | "awayTeamId">,
): "home" | "away" | null {
  if (teamId === null) return null;
  if (teamId === match.homeTeamId) return "home";
  if (teamId === match.awayTeamId) return "away";
  return null;
}

/**
 * Adapts a persisted prediction + match into the shared engine's input. Reuses
 * computeScore (Unit 2) — never redefines scoring rules (BR-6.1).
 */
export function toScoringExample(
  prediction: ScoreablePrediction,
  match: ScoreableMatch,
): ScoringExample {
  return {
    predictedHome: prediction.homeScore,
    predictedAway: prediction.awayScore,
    actualHome: match.homeScore,
    actualAway: match.awayScore,
    isKnockout: match.isKnockout,
    predictedPenaltyWinner: teamToSide(prediction.penaltyWinnerTeamId, match),
    actualPenaltyWinner: teamToSide(match.winnerTeamId, match),
  };
}
