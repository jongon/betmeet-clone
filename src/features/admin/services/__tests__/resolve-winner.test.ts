import { describe, expect, it } from "vitest";
import { resolveWinner } from "../resolve-winner";

const base = { homeTeamId: "H", awayTeamId: "A", penaltyWinnerTeamId: null, isKnockout: false };

describe("resolveWinner (BR-7.3)", () => {
  it("home win → home team", () => {
    expect(resolveWinner({ ...base, homeScore: 2, awayScore: 1 })).toBe("H");
  });

  it("away win → away team", () => {
    expect(resolveWinner({ ...base, homeScore: 0, awayScore: 3 })).toBe("A");
  });

  it("group-stage tie → no winner", () => {
    expect(resolveWinner({ ...base, homeScore: 1, awayScore: 1 })).toBeNull();
  });

  it("knockout tie → penalty winner", () => {
    expect(
      resolveWinner({
        ...base,
        homeScore: 1,
        awayScore: 1,
        isKnockout: true,
        penaltyWinnerTeamId: "A",
      }),
    ).toBe("A");
  });

  it("knockout decided by score ignores penalty winner", () => {
    expect(
      resolveWinner({
        ...base,
        homeScore: 2,
        awayScore: 0,
        isKnockout: true,
        penaltyWinnerTeamId: "A",
      }),
    ).toBe("H");
  });
});
