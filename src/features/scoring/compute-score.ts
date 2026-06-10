import { ScoringRuleSet } from "./scoring-rules";

export type MatchedCase = "EXACT" | "RESULT" | "PARTIAL" | "MISS";

export type PenaltyWinner = "home" | "away" | null;

export interface ScoringExample {
  predictedHome: number;
  predictedAway: number;
  actualHome: number;
  actualAway: number;
  isKnockout: boolean;
  predictedPenaltyWinner?: PenaltyWinner;
  actualPenaltyWinner?: PenaltyWinner;
}

export interface ScoreBreakdown {
  matchedCase: MatchedCase;
  basePoints: number;
  penaltyApplied: boolean;
  penaltyPoints: number;
  totalPoints: number;
  /** i18n key describing the outcome, used by ScoreBreakdownExplainer. */
  explanationKey: MatchedCase;
}

function sign(n: number): -1 | 0 | 1 {
  return n > 0 ? 1 : n < 0 ? -1 : 0;
}

/**
 * Pure scoring function shared by Unit 2 (educational preview) and Unit 6
 * (authoritative scoring). Given a prediction + actual result, returns the
 * point breakdown using ScoringRuleSet (BL-1, BR-2.1..BR-2.6).
 *
 * This function must never define its own constants — it imports ScoringRuleSet
 * so the educational calculator and the real engine stay identical (BR-2.7).
 */
export function computeScore(example: ScoringExample): ScoreBreakdown {
  const { predictedHome, predictedAway, actualHome, actualAway } = example;

  const predictedResult = sign(predictedHome - predictedAway);
  const actualResult = sign(actualHome - actualAway);

  let matchedCase: MatchedCase;
  let basePoints: number;

  if (predictedHome === actualHome && predictedAway === actualAway) {
    matchedCase = "EXACT";
    basePoints = ScoringRuleSet.EXACT_SCORE;
  } else if (predictedResult === actualResult) {
    matchedCase = "RESULT";
    basePoints = ScoringRuleSet.CORRECT_RESULT;
  } else if (predictedHome === actualHome || predictedAway === actualAway) {
    matchedCase = "PARTIAL";
    basePoints = ScoringRuleSet.PARTIAL_GOAL_COUNT;
  } else {
    matchedCase = "MISS";
    basePoints = ScoringRuleSet.MISS;
  }

  let penaltyApplied = false;
  let penaltyPoints = 0;

  if (
    example.isKnockout &&
    actualHome === actualAway &&
    example.predictedPenaltyWinner != null &&
    example.predictedPenaltyWinner === example.actualPenaltyWinner
  ) {
    penaltyApplied = true;
    penaltyPoints = ScoringRuleSet.PENALTY_BONUS;
  }

  return {
    matchedCase,
    basePoints,
    penaltyApplied,
    penaltyPoints,
    totalPoints: basePoints + penaltyPoints,
    explanationKey: matchedCase,
  };
}
