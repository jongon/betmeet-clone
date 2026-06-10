import { describe, expect, it } from "vitest";
import { computeScore } from "@/features/scoring/compute-score";
import { type ScoreableMatch, teamToSide, toScoringExample } from "../score-adapter";

const knockoutTie: ScoreableMatch = {
  homeTeamId: "H",
  awayTeamId: "A",
  homeScore: 1,
  awayScore: 1,
  winnerTeamId: "H",
  isKnockout: true,
};

describe("teamToSide (BR-6.4)", () => {
  it("maps team ids to home/away/null", () => {
    expect(teamToSide("H", knockoutTie)).toBe("home");
    expect(teamToSide("A", knockoutTie)).toBe("away");
    expect(teamToSide(null, knockoutTie)).toBe(null);
    expect(teamToSide("X", knockoutTie)).toBe(null);
  });
});

describe("toScoringExample feeds the shared engine (invariant BR-6.1)", () => {
  it("exact score yields 5", () => {
    const ex = toScoringExample(
      { homeScore: 2, awayScore: 0, penaltyWinnerTeamId: null },
      { ...knockoutTie, homeScore: 2, awayScore: 0, isKnockout: false, winnerTeamId: "H" },
    );
    expect(computeScore(ex).totalPoints).toBe(5);
  });

  it("knockout tie + correct penalty winner yields exact + bonus (6)", () => {
    const ex = toScoringExample(
      { homeScore: 1, awayScore: 1, penaltyWinnerTeamId: "H" },
      knockoutTie,
    );
    const breakdown = computeScore(ex);
    expect(breakdown.penaltyApplied).toBe(true);
    expect(breakdown.totalPoints).toBe(6);
  });

  it("knockout tie + wrong penalty winner yields no bonus (exact 5)", () => {
    const ex = toScoringExample(
      { homeScore: 1, awayScore: 1, penaltyWinnerTeamId: "A" },
      knockoutTie,
    );
    const breakdown = computeScore(ex);
    expect(breakdown.penaltyApplied).toBe(false);
    expect(breakdown.totalPoints).toBe(5);
  });
});
