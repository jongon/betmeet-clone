// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import type { PoolMemberPrediction } from "../../types";
import { buildDayGroups, buildMatchLabel } from "../pool-predictions-view-helpers";

const members = [
  {
    userId: "user-1",
    nickname: "Test#1234",
    avatarUrl: "",
    isOwner: true,
    joinedAt: "2026-06-01T00:00:00.000Z",
  },
];

const teamView = (fifaCode: string) =>
  ({
    id: `t-${fifaCode}`,
    name: `Team ${fifaCode}`,
    fifaCode,
    flagPath: `/flags/${fifaCode.toLowerCase()}.svg`,
  }) as PoolMemberPrediction["homeTeam"];

const makePrediction = (overrides: Partial<PoolMemberPrediction> = {}): PoolMemberPrediction =>
  ({
    matchId: "m-1",
    matchNumber: 1,
    kickoffAt: "2026-06-11T18:00:00Z",
    matchStatus: "FINISHED",
    homeTeam: teamView("BRA"),
    awayTeam: teamView("ARG"),
    homePlaceholder: null,
    awayPlaceholder: null,
    homeScore: 2,
    awayScore: 1,
    phaseName: "Grupo A",
    phaseType: "GROUP",
    userId: "user-1",
    nickname: "Test#1234",
    avatarUrl: null,
    predictedHome: 2,
    predictedAway: 1,
    totalPoints: 5,
    matchedCase: "EXACT",
    ...overrides,
  }) as PoolMemberPrediction;

describe("buildMatchLabel", () => {
  it("uses fifaCode for resolved teams", () => {
    const p = makePrediction();
    expect(buildMatchLabel(p)).toEqual({ label: "BRA vs ARG", sublabel: "2 - 1" });
  });

  it("shows sublabel only for FINISHED with scores", () => {
    const live = makePrediction({ matchStatus: "LIVE", homeScore: 1, awayScore: 0 });
    expect(buildMatchLabel(live).sublabel).toBeNull();
  });

  it("fallback to placeholders when no team", () => {
    const p = makePrediction({
      homeTeam: null,
      awayTeam: null,
      homePlaceholder: "Winner A",
      awayPlaceholder: "Runner-up B",
    });
    expect(buildMatchLabel(p).label).toBe("Winner A vs Runner-up B");
  });

  it("shows '?' for missing team and placeholder", () => {
    const p = makePrediction({ homeTeam: null, homePlaceholder: null, awayTeam: teamView("FRA") });
    expect(buildMatchLabel(p).label).toBe("? vs FRA");
  });
});

describe("buildDayGroups", () => {
  it("groups matches by UTC day", () => {
    const day1 = makePrediction({
      matchId: "m-1",
      kickoffAt: "2026-06-11T18:00:00Z",
      matchNumber: 1,
    });
    const day2 = makePrediction({
      matchId: "m-2",
      kickoffAt: "2026-06-12T15:00:00Z",
      matchNumber: 2,
    });
    const groups = buildDayGroups([day1, day2], members, "es", "UTC");
    expect(groups).toHaveLength(2);
    expect(groups[0].dayKey).toBe("2026-06-12");
    expect(groups[1].dayKey).toBe("2026-06-11");
  });

  it("keeps matches on same day in one group", () => {
    const m1 = makePrediction({
      matchId: "m-1",
      kickoffAt: "2026-06-11T13:00:00Z",
      matchNumber: 1,
    });
    const m2 = makePrediction({
      matchId: "m-2",
      kickoffAt: "2026-06-11T21:00:00Z",
      matchNumber: 2,
    });
    const groups = buildDayGroups([m1, m2], members, "es", "UTC");
    expect(groups).toHaveLength(1);
    expect(groups[0].matches).toHaveLength(2);
  });

  it("sorts matches chronologically within a day", () => {
    const later = makePrediction({
      matchId: "m-1",
      kickoffAt: "2026-06-11T21:00:00Z",
      matchNumber: 2,
    });
    const earlier = makePrediction({
      matchId: "m-2",
      kickoffAt: "2026-06-11T13:00:00Z",
      matchNumber: 1,
    });
    const groups = buildDayGroups([later, earlier], members, "es", "UTC");
    expect(groups[0].matches[0].matchId).toBe("m-2");
    expect(groups[0].matches[1].matchId).toBe("m-1");
  });

  it("deduplicates predictions for same match across users", () => {
    const p1 = makePrediction({ userId: "user-1" });
    const p2 = makePrediction({ userId: "user-2" });
    const groups = buildDayGroups([p1, p2], members, "es", "UTC");
    expect(groups[0].matches).toHaveLength(1);
  });

  it("handles matches with null kickoffAt", () => {
    const p = makePrediction({ kickoffAt: null });
    const groups = buildDayGroups([p], members, "es", "UTC");
    expect(groups[0].dayKey).toBe("__tbd__");
  });

  it("returns empty array when no predictions", () => {
    const groups = buildDayGroups([], members, "es", "UTC");
    expect(groups).toEqual([]);
  });

  it("groups by local day when a timezone is provided", () => {
    const p = makePrediction({ kickoffAt: "2026-06-17T23:00:00.000Z" });

    expect(buildDayGroups([p], members, "es", "UTC")[0].dayKey).toBe("2026-06-17");
    expect(buildDayGroups([p], members, "es", "Europe/Madrid")[0].dayKey).toBe("2026-06-18");
  });
});
