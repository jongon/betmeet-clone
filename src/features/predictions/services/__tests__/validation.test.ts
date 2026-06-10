import { describe, expect, it } from "vitest";
import { validatePredictionInput } from "../validation";

const knockMatch = {
  phaseType: "KNOCKOUT",
  homeTeamId: "team-h",
  awayTeamId: "team-a",
};

const groupMatch = {
  phaseType: "GROUP",
  homeTeamId: "team-h",
  awayTeamId: "team-a",
};

describe("validatePredictionInput", () => {
  it("accepts valid non-draw group prediction", () => {
    const result = validatePredictionInput(groupMatch, {
      homeScore: 2,
      awayScore: 1,
      penaltyWinnerTeamId: null,
    });
    expect(result.errors).toEqual([]);
    expect(result.valid).toEqual({ homeScore: 2, awayScore: 1, penaltyWinnerTeamId: null });
  });

  it("rejects homeScore above 20", () => {
    const result = validatePredictionInput(groupMatch, {
      homeScore: 21,
      awayScore: 1,
      penaltyWinnerTeamId: null,
    });
    expect(result.valid).toBeNull();
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe("homeScore");
  });

  it("rejects awayScore below 0", () => {
    const result = validatePredictionInput(groupMatch, {
      homeScore: 1,
      awayScore: -1,
      penaltyWinnerTeamId: null,
    });
    expect(result.valid).toBeNull();
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe("awayScore");
  });

  it("rejects non-integer awayScore", () => {
    const result = validatePredictionInput(groupMatch, {
      homeScore: 1,
      awayScore: 1.5,
      penaltyWinnerTeamId: null,
    });
    expect(result.valid).toBeNull();
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe("awayScore");
  });

  it("forbids penalty winner in group stage", () => {
    const result = validatePredictionInput(groupMatch, {
      homeScore: 1,
      awayScore: 1,
      penaltyWinnerTeamId: "team-h",
    });
    expect(result.valid).toBeNull();
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe("penaltyWinnerTeamId");
  });

  it("forbids penalty winner in group stage non-draw", () => {
    const result = validatePredictionInput(groupMatch, {
      homeScore: 2,
      awayScore: 1,
      penaltyWinnerTeamId: "team-h",
    });
    expect(result.valid).toBeNull();
    expect(result.errors[0].field).toBe("penaltyWinnerTeamId");
  });

  it("requires penalty winner for knockout draw", () => {
    const result = validatePredictionInput(knockMatch, {
      homeScore: 1,
      awayScore: 1,
      penaltyWinnerTeamId: null,
    });
    expect(result.valid).toBeNull();
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe("penaltyWinnerTeamId");
  });

  it("accepts valid knockout draw with penalty winner", () => {
    const result = validatePredictionInput(knockMatch, {
      homeScore: 2,
      awayScore: 2,
      penaltyWinnerTeamId: "team-h",
    });
    expect(result.errors).toEqual([]);
    expect(result.valid).toEqual({
      homeScore: 2,
      awayScore: 2,
      penaltyWinnerTeamId: "team-h",
    });
  });

  it("rejects penalty winner not matching either team", () => {
    const result = validatePredictionInput(knockMatch, {
      homeScore: 2,
      awayScore: 2,
      penaltyWinnerTeamId: "team-x",
    });
    expect(result.valid).toBeNull();
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe("penaltyWinnerTeamId");
  });

  it("forbids penalty winner for knockout non-draw", () => {
    const result = validatePredictionInput(knockMatch, {
      homeScore: 2,
      awayScore: 1,
      penaltyWinnerTeamId: "team-h",
    });
    expect(result.valid).toBeNull();
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe("penaltyWinnerTeamId");
  });

  it("accepts knockout non-draw without penalty winner", () => {
    const result = validatePredictionInput(knockMatch, {
      homeScore: 2,
      awayScore: 1,
      penaltyWinnerTeamId: null,
    });
    expect(result.errors).toEqual([]);
    expect(result.valid).toEqual({
      homeScore: 2,
      awayScore: 1,
      penaltyWinnerTeamId: null,
    });
  });

  it("rejects multiple field errors at once", () => {
    const result = validatePredictionInput(groupMatch, {
      homeScore: 25,
      awayScore: -3,
      penaltyWinnerTeamId: "team-h",
    });
    expect(result.valid).toBeNull();
    expect(result.errors.length).toBeGreaterThanOrEqual(3);
  });
});
