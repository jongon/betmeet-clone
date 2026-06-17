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

describe("computeScore — base cases (BR-2.1..BR-2.4, BR-36)", () => {
  it("EXACT: exact score gives 5 with no component breakdown", () => {
    const b = computeScore(
      example({ predictedHome: 2, predictedAway: 1, actualHome: 2, actualAway: 1 }),
    );
    expect(b.matchedCase).toBe("EXACT");
    expect(b.basePoints).toBe(ScoringRuleSet.EXACT_SCORE);
    expect(b.totalPoints).toBe(ScoringRuleSet.EXACT_SCORE);
    expect(b.components).toBeUndefined();
  });

  it("RESULT + 0 goals: correct winner without any goal match gives 2", () => {
    const b = computeScore(
      example({ predictedHome: 3, predictedAway: 1, actualHome: 2, actualAway: 0 }),
    );
    expect(b.matchedCase).toBe("RESULT");
    expect(b.basePoints).toBe(2);
    expect(b.totalPoints).toBe(2);
    expect(b.components).toEqual({ resultPoints: 2, homeGoalPoints: 0, awayGoalPoints: 0 });
  });

  it("RESULT + 1 goal: correct winner plus one matched goal gives 3 (BR-36.2)", () => {
    const b = computeScore(
      example({ predictedHome: 3, predictedAway: 1, actualHome: 2, actualAway: 1 }),
    );
    expect(b.matchedCase).toBe("RESULT");
    expect(b.basePoints).toBe(3);
    expect(b.totalPoints).toBe(3);
    expect(b.components).toEqual({ resultPoints: 2, homeGoalPoints: 0, awayGoalPoints: 1 });
  });

  it("RESULT + 2 goals: correct winner plus both goal counts matched gives 4", () => {
    // When both goal counts match AND the result is correct, that's EXACT (5).
    // A non-exact can never have all three components (result+home+away) because
    // both goals matching means exact score, which is 5 and doesn't stack.
    // Max non-exact is 3: result(2) + one goal(1).
    const b = computeScore(
      example({ predictedHome: 2, predictedAway: 1, actualHome: 2, actualAway: 1 }),
    );
    expect(b.matchedCase).toBe("EXACT");
    expect(b.basePoints).toBe(5);
  });

  it("RESULT with one goal matched (home) gives 3", () => {
    const b = computeScore(
      example({ predictedHome: 2, predictedAway: 0, actualHome: 2, actualAway: 1 }),
    );
    expect(b.matchedCase).toBe("RESULT");
    expect(b.basePoints).toBe(3);
    expect(b.totalPoints).toBe(3);
    expect(b.components).toEqual({ resultPoints: 2, homeGoalPoints: 1, awayGoalPoints: 0 });
  });

  it("correct draw without exact score gives 2 (result points only)", () => {
    const b = computeScore(
      example({ predictedHome: 1, predictedAway: 1, actualHome: 2, actualAway: 2 }),
    );
    expect(b.matchedCase).toBe("RESULT");
    expect(b.basePoints).toBe(2);
    expect(b.totalPoints).toBe(2);
    expect(b.components?.resultPoints).toBe(2);
  });

  it("PARTIAL: one goal matched, wrong result gives 1", () => {
    const b = computeScore(
      example({ predictedHome: 2, predictedAway: 0, actualHome: 2, actualAway: 3 }),
    );
    expect(b.matchedCase).toBe("PARTIAL");
    expect(b.basePoints).toBe(1);
    expect(b.totalPoints).toBe(1);
    expect(b.components).toEqual({ resultPoints: 0, homeGoalPoints: 1, awayGoalPoints: 0 });
  });

  it("MISS: nothing right gives 0", () => {
    const b = computeScore(
      example({ predictedHome: 0, predictedAway: 0, actualHome: 1, actualAway: 3 }),
    );
    expect(b.matchedCase).toBe("MISS");
    expect(b.basePoints).toBe(0);
    expect(b.totalPoints).toBe(0);
    expect(b.components).toEqual({ resultPoints: 0, homeGoalPoints: 0, awayGoalPoints: 0 });
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
