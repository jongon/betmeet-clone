import { describe, expect, it } from "vitest";
import { resolvePoints, type ScoreRow } from "../resolve-points";

const score: ScoreRow = {
  matchedCase: "EXACT",
  basePoints: 5,
  penaltyApplied: false,
  penaltyPoints: 0,
  totalPoints: 5,
};

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
