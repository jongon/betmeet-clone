import { describe, expect, it } from "vitest";
import { getPredictionEligibility } from "../eligibility";

const FUTURE = new Date("2026-06-01T12:00:00Z");
const PAST = new Date("2026-06-30T12:00:00Z");

const baseMatch = {
  homeTeamId: "team-a",
  awayTeamId: "team-b",
  kickoffAt: new Date("2026-06-10T18:00:00Z"),
  status: "SCHEDULED",
};

describe("getPredictionEligibility", () => {
  it("is editable when both teams defined, kickoff in future, SCHEDULED", () => {
    expect(getPredictionEligibility(baseMatch, FUTURE)).toEqual({ editable: true });
  });

  it("blocks when home team is missing", () => {
    const result = getPredictionEligibility({ ...baseMatch, homeTeamId: null }, FUTURE);
    expect(result).toEqual({ editable: false, reason: "MATCH_NOT_EDITABLE" });
  });

  it("blocks when away team is missing", () => {
    const result = getPredictionEligibility({ ...baseMatch, awayTeamId: null }, FUTURE);
    expect(result).toEqual({ editable: false, reason: "MATCH_NOT_EDITABLE" });
  });

  it("blocks when kickoff is null", () => {
    const result = getPredictionEligibility({ ...baseMatch, kickoffAt: null }, FUTURE);
    expect(result).toEqual({ editable: false, reason: "MATCH_NOT_EDITABLE" });
  });

  it("blocks when kickoff has been reached", () => {
    const result = getPredictionEligibility(baseMatch, PAST);
    expect(result).toEqual({ editable: false, reason: "KICKOFF_REACHED" });
  });

  it("blocks for LOCKED status even before kickoff", () => {
    const result = getPredictionEligibility({ ...baseMatch, status: "LOCKED" }, FUTURE);
    expect(result).toEqual({ editable: false, reason: "MATCH_STATUS_LOCKED" });
  });

  it("blocks for LIVE status", () => {
    const result = getPredictionEligibility({ ...baseMatch, status: "LIVE" }, FUTURE);
    expect(result).toEqual({ editable: false, reason: "MATCH_STATUS_LOCKED" });
  });

  it("blocks for FINISHED status", () => {
    const result = getPredictionEligibility({ ...baseMatch, status: "FINISHED" }, FUTURE);
    expect(result).toEqual({ editable: false, reason: "MATCH_STATUS_LOCKED" });
  });

  it("blocks CANCELLED with specific reason", () => {
    const result = getPredictionEligibility({ ...baseMatch, status: "CANCELLED" }, FUTURE);
    expect(result).toEqual({ editable: false, reason: "CANCELLED" });
  });

  it("blocks POSTPONED with specific reason", () => {
    const result = getPredictionEligibility({ ...baseMatch, status: "POSTPONED" }, FUTURE);
    expect(result).toEqual({ editable: false, reason: "POSTPONED" });
  });

  it("is editable exactly at the kickoff second", () => {
    // At the kickoff timestamp, should be blocked (>=)
    const atKickoff = new Date(baseMatch.kickoffAt?.getTime() ?? Date.now());
    expect(getPredictionEligibility(baseMatch, atKickoff)).toEqual({
      editable: false,
      reason: "KICKOFF_REACHED",
    });
  });

  it("is editable one second before kickoff", () => {
    const oneSecondBefore = new Date((baseMatch.kickoffAt?.getTime() ?? 0) - 1000);
    expect(getPredictionEligibility(baseMatch, oneSecondBefore)).toEqual({ editable: true });
  });
});
