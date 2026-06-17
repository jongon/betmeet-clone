/**
 * Canonical scoring constants — the single source of truth shared by the
 * educational calculator (Unit 2) and the authoritative scoring engine (Unit 6).
 *
 * BR-2.7 / invariant: neither unit defines its own constants; both import this
 * module so education and real scoring can never diverge. Origin: US-5.1.
 */
export const ScoringRuleSet = {
  /** Exact score (home and away) correct. Does not stack with result/goal components. */
  EXACT_SCORE: 5,
  /** Correct result (winner or draw) on a non-exact prediction. Adds to goal components. */
  CORRECT_RESULT: 2,
  /** Correct goal count for one team. Adds to result component.
   *  Both home and away goals can match independently (BR-36.2). */
  PARTIAL_GOAL_COUNT: 1,
  /** Nothing correct. */
  MISS: 0,
  /** Bonus for predicting the penalty-shootout winner in a tied knockout match. */
  PENALTY_BONUS: 1,
} as const;

export type ScoringRuleSet = typeof ScoringRuleSet;
