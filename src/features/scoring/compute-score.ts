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
  /** Additive component breakdown for non-exact predictions (BR-36.2). */
  components?: {
    resultPoints: number;
    homeGoalPoints: number;
    awayGoalPoints: number;
  };
}

function sign(n: number): -1 | 0 | 1 {
  return n > 0 ? 1 : n < 0 ? -1 : 0;
}

/**
 * Derives the penalty-shootout winner from the shootout score (FR-REFINE-14.4).
 * A tie is invalid (a shootout cannot end level), so it maps to `null`.
 */
export function derivePenaltyWinner(home: number, away: number): PenaltyWinner {
  return home > away ? "home" : home < away ? "away" : null;
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
  let components:
    | { resultPoints: number; homeGoalPoints: number; awayGoalPoints: number }
    | undefined;

  if (predictedHome === actualHome && predictedAway === actualAway) {
    matchedCase = "EXACT";
    basePoints = ScoringRuleSet.EXACT_SCORE;
  } else {
    const resultPoints = predictedResult === actualResult ? ScoringRuleSet.CORRECT_RESULT : 0;
    const homeGoalPoints = predictedHome === actualHome ? ScoringRuleSet.PARTIAL_GOAL_COUNT : 0;
    const awayGoalPoints = predictedAway === actualAway ? ScoringRuleSet.PARTIAL_GOAL_COUNT : 0;
    basePoints = resultPoints + homeGoalPoints + awayGoalPoints;

    if (resultPoints > 0) {
      matchedCase = "RESULT";
    } else if (homeGoalPoints > 0 || awayGoalPoints > 0) {
      matchedCase = "PARTIAL";
    } else {
      matchedCase = "MISS";
    }

    components = { resultPoints, homeGoalPoints, awayGoalPoints };
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
    ...(components ? { components } : {}),
  };
}
