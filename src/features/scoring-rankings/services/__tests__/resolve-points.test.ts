import { describe, expect, it } from "vitest";
import { resolvePoints, type ScoreRow, toBreakdown } from "../resolve-points";

const score: ScoreRow = {
  matchedCase: "EXACT",
  basePoints: 5,
  penaltyApplied: false,
  penaltyPoints: 0,
  totalPoints: 5,
};

describe("toBreakdown (Unit 36 component derivation)", () => {
  it("derives no components for EXACT case", () => {
    const b = toBreakdown(score);
    expect(b.components).toBeUndefined();
    expect(b.totalPoints).toBe(5);
  });

  it("derives result-only components for RESULT case with base 2", () => {
    const b = toBreakdown({ ...score, matchedCase: "RESULT", basePoints: 2, totalPoints: 2 });
    expect(b.components).toEqual({ resultPoints: 2, homeGoalPoints: 0, awayGoalPoints: 0 });
  });

  it("derives result+goal components for RESULT case with base 3", () => {
    const b = toBreakdown({ ...score, matchedCase: "RESULT", basePoints: 3, totalPoints: 3 });
    expect(b.components).toEqual({ resultPoints: 2, homeGoalPoints: 1, awayGoalPoints: 0 });
  });

  it("derives result+2goals components for RESULT case with base 4", () => {
    const b = toBreakdown({ ...score, matchedCase: "RESULT", basePoints: 4, totalPoints: 4 });
    expect(b.components).toEqual({ resultPoints: 2, homeGoalPoints: 1, awayGoalPoints: 1 });
  });

  it("derives single-goal component for PARTIAL case with base 1", () => {
    const b = toBreakdown({ ...score, matchedCase: "PARTIAL", basePoints: 1, totalPoints: 1 });
    expect(b.components).toEqual({ resultPoints: 0, homeGoalPoints: 1, awayGoalPoints: 0 });
  });

  it("derives two-goal components for PARTIAL case with base 2", () => {
    const b = toBreakdown({ ...score, matchedCase: "PARTIAL", basePoints: 2, totalPoints: 2 });
    expect(b.components).toEqual({ resultPoints: 0, homeGoalPoints: 1, awayGoalPoints: 1 });
  });

  it("derives zero components for MISS case", () => {
    const b = toBreakdown({ ...score, matchedCase: "MISS", basePoints: 0, totalPoints: 0 });
    expect(b.components).toEqual({ resultPoints: 0, homeGoalPoints: 0, awayGoalPoints: 0 });
  });

  it("preserves penalty fields in breakdown", () => {
    const b = toBreakdown({ ...score, penaltyApplied: true, penaltyPoints: 1, totalPoints: 6 });
    expect(b.penaltyApplied).toBe(true);
    expect(b.penaltyPoints).toBe(1);
    expect(b.totalPoints).toBe(6);
  });
});

describe("resolvePoints (BR-6.9)", () => {
  it("SCORED with points + breakdown when a score exists", () => {
    const r = resolvePoints({ hasPrediction: true, matchStatus: "FINISHED", score });
    expect(r.status).toBe("SCORED");
    expect(r.points).toBe(5);
    expect(r.breakdown?.matchedCase).toBe("EXACT");
  });

  it("NOT_SCORED for cancelled/postponed matches even with a prediction", () => {
    expect(
      resolvePoints({ hasPrediction: true, matchStatus: "CANCELLED", score: null }).status,
    ).toBe("NOT_SCORED");
    expect(
      resolvePoints({ hasPrediction: true, matchStatus: "POSTPONED", score: null }).status,
    ).toBe("NOT_SCORED");
  });

  it("PENDING_SCORING when a prediction exists but no score yet", () => {
    const r = resolvePoints({ hasPrediction: true, matchStatus: "SCHEDULED", score: null });
    expect(r.status).toBe("PENDING_SCORING");
    expect(r.points).toBeNull();
  });

  it("NOT_SCORED when there is no prediction", () => {
    expect(
      resolvePoints({ hasPrediction: false, matchStatus: "FINISHED", score: null }).status,
    ).toBe("NOT_SCORED");
  });
});
