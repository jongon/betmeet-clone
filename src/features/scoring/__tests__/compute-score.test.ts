import { describe, expect, it } from "vitest";
import { computeScore, derivePenaltyWinner, type ScoringExample } from "../compute-score";
import { ScoringRuleSet } from "../scoring-rules";

function example(overrides: Partial<ScoringExample> = {}): ScoringExample {
  return {
    predictedHome: 0,
    predictedAway: 0,
    actualHome: 0,
    actualAway: 0,
    isKnockout: false,
    predictedPenaltyWinner: null,
    actualPenaltyWinner: null,
    ...overrides,
  };
}

describe("computeScore — base cases (BR-2.1..BR-2.4)", () => {
  it("EXACT: exact score gives 5", () => {
    const b = computeScore(
      example({ predictedHome: 2, predictedAway: 1, actualHome: 2, actualAway: 1 }),
    );
    expect(b.matchedCase).toBe("EXACT");
    expect(b.totalPoints).toBe(ScoringRuleSet.EXACT_SCORE);
  });

  it("RESULT: correct winner without exact score gives 2", () => {
    const b = computeScore(
      example({ predictedHome: 3, predictedAway: 1, actualHome: 2, actualAway: 0 }),
    );
    expect(b.matchedCase).toBe("RESULT");
    expect(b.totalPoints).toBe(ScoringRuleSet.CORRECT_RESULT);
  });

  it("RESULT: correct draw without exact score gives 2", () => {
    const b = computeScore(
      example({ predictedHome: 1, predictedAway: 1, actualHome: 2, actualAway: 2 }),
    );
    expect(b.matchedCase).toBe("RESULT");
    expect(b.totalPoints).toBe(ScoringRuleSet.CORRECT_RESULT);
  });

  it("PARTIAL: one team's goals right but wrong result gives 1", () => {
    // predicted home win 2-0, actual away win 2-3 → home goals match (2), result wrong
    const b = computeScore(
      example({ predictedHome: 2, predictedAway: 0, actualHome: 2, actualAway: 3 }),
    );
    expect(b.matchedCase).toBe("PARTIAL");
    expect(b.totalPoints).toBe(ScoringRuleSet.PARTIAL_GOAL_COUNT);
  });

  it("MISS: nothing right gives 0", () => {
    const b = computeScore(
      example({ predictedHome: 0, predictedAway: 0, actualHome: 1, actualAway: 3 }),
    );
    expect(b.matchedCase).toBe("MISS");
    expect(b.totalPoints).toBe(ScoringRuleSet.MISS);
  });
});

describe("computeScore — penalty bonus (BR-2.5, BR-2.6)", () => {
  it("adds +1 when knockout, tied score, and penalty winner predicted correctly", () => {
    const b = computeScore(
      example({
        predictedHome: 1,
        predictedAway: 1,
        actualHome: 1,
        actualAway: 1,
        isKnockout: true,
        predictedPenaltyWinner: "home",
        actualPenaltyWinner: "home",
      }),
    );
    expect(b.penaltyApplied).toBe(true);
    expect(b.totalPoints).toBe(ScoringRuleSet.EXACT_SCORE + ScoringRuleSet.PENALTY_BONUS);
  });

  it("no bonus when penalty winner predicted wrong", () => {
    const b = computeScore(
      example({
        predictedHome: 0,
        predictedAway: 0,
        actualHome: 0,
        actualAway: 0,
        isKnockout: true,
        predictedPenaltyWinner: "away",
        actualPenaltyWinner: "home",
      }),
    );
    expect(b.penaltyApplied).toBe(false);
    expect(b.penaltyPoints).toBe(0);
  });

  it("no bonus when not knockout even if tied and winner matches", () => {
    const b = computeScore(
      example({
        predictedHome: 1,
        predictedAway: 1,
        actualHome: 1,
        actualAway: 1,
        isKnockout: false,
        predictedPenaltyWinner: "home",
        actualPenaltyWinner: "home",
      }),
    );
    expect(b.penaltyApplied).toBe(false);
  });

  it("no bonus when actual score is not a draw", () => {
    const b = computeScore(
      example({
        predictedHome: 2,
        predictedAway: 1,
        actualHome: 2,
        actualAway: 1,
        isKnockout: true,
        predictedPenaltyWinner: "home",
        actualPenaltyWinner: "home",
      }),
    );
    expect(b.penaltyApplied).toBe(false);
  });
});

describe("derivePenaltyWinner (FR-REFINE-14.4)", () => {
  it("derives the winner from the shootout score", () => {
    expect(derivePenaltyWinner(4, 3)).toBe("home");
    expect(derivePenaltyWinner(3, 5)).toBe("away");
  });

  it("returns null for an (invalid) tied shootout", () => {
    expect(derivePenaltyWinner(3, 3)).toBeNull();
  });
});
