// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import type { PoolMemberPrediction } from "../../types";
import {
  buildDayGroups,
  buildMatchLabel,
  DAYS_PER_PAGE,
  paginateDays,
} from "../pool-predictions-view-helpers";

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
  }) as NonNullable<PoolMemberPrediction["homeTeam"]>;

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
  it("groups matches in chronological order (oldest first)", () => {
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
    expect(groups[0].dayKey).toBe("2026-06-11");
    expect(groups[1].dayKey).toBe("2026-06-12");
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

  it("sorts matches chronologically within a day (oldest first)", () => {
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

  it("deduplicates matches across predictions", () => {
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

  it("returns empty array when no predictions and no matches", () => {
    const groups = buildDayGroups([], members, "es", "UTC");
    expect(groups).toEqual([]);
  });

  it("groups by local day when a timezone is provided", () => {
    const p = makePrediction({ kickoffAt: "2026-06-17T23:00:00.000Z" });

    expect(buildDayGroups([p], members, "es", "UTC")[0].dayKey).toBe("2026-06-17");
    expect(buildDayGroups([p], members, "es", "Europe/Madrid")[0].dayKey).toBe("2026-06-18");
  });

  it("uses allMatches as column source when provided (FR-REFINE-48.9)", () => {
    const matches = [
      {
        matchId: "m-future",
        matchNumber: 45,
        kickoffAt: "2026-06-20T00:00:00Z",
        matchStatus: "SCHEDULED",
        homeTeam: teamView("ESP"),
        awayTeam: teamView("ITA"),
        homePlaceholder: null,
        awayPlaceholder: null,
        homeScore: null,
        awayScore: null,
        phaseName: "Semi-final",
        phaseType: "KNOCKOUT",
      },
    ];
    const groups = buildDayGroups([], members, "es", "UTC", matches);
    expect(groups).toHaveLength(1);
    expect(groups[0].matches).toHaveLength(1);
    expect(groups[0].matches[0].matchId).toBe("m-future");
  });
});

const makeDayGroup = (dayKey: string) => ({
  dayKey,
  label: `Label ${dayKey}`,
  matches: [],
  memberRows: [],
});

describe("paginateDays", () => {
  it("returns empty result for no days", () => {
    const result = paginateDays([], "UTC", 0);
    expect(result.visibleDays).toEqual([]);
    expect(result.totalPages).toBe(0);
    expect(result.hasPrev).toBe(false);
    expect(result.hasNext).toBe(false);
  });

  it("paginates 10 days into 10 pages of 1", () => {
    const days = Array.from({ length: 10 }, (_, i) =>
      makeDayGroup(`2026-06-${(i + 1).toString().padStart(2, "0")}`),
    );
    const result = paginateDays(days, "UTC", 0);
    expect(result.visibleDays).toHaveLength(1);
    expect(result.totalPages).toBe(10);
    expect(result.currentPage).toBe(0);
    expect(result.hasPrev).toBe(false);
    expect(result.hasNext).toBe(true);

    const result2 = paginateDays(days, "UTC", 1);
    expect(result2.visibleDays).toHaveLength(1);
    expect(result2.currentPage).toBe(1);
    expect(result2.hasPrev).toBe(true);
    expect(result2.hasNext).toBe(true);

    const result3 = paginateDays(days, "UTC", 9);
    expect(result3.currentPage).toBe(9);
    expect(result3.hasPrev).toBe(true);
    expect(result3.hasNext).toBe(false);
  });

  it("clamps page to valid range", () => {
    const days = Array.from({ length: 5 }, (_, i) =>
      makeDayGroup(`2026-06-${(i + 1).toString().padStart(2, "0")}`),
    );
    const result = paginateDays(days, "UTC", 99);
    expect(result.currentPage).toBe(4);
    expect(result.totalPages).toBe(5);
    expect(result.hasPrev).toBe(true);
    expect(result.hasNext).toBe(false);

    const result2 = paginateDays(days, "UTC", -5);
    expect(result2.currentPage).toBe(0);
  });

  it("defaults to page that contains today", () => {
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(2026, 5, 1 + i);
      const key = d.toISOString().slice(0, 10);
      return makeDayGroup(key);
    });

    const result = paginateDays(days, "UTC", Number.NaN);
    const todayKey = new Date().toISOString().slice(0, 10);
    const isTodayVisible = result.visibleDays.some((d) => d.dayKey === todayKey);
    // 30 days = 30 pages of 1; today (~June 18) should be visible on its page
    expect(result.totalPages).toBe(30);
    expect(isTodayVisible).toBe(true);
    expect(result.visibleDays).toHaveLength(1);
  });

  it("DAYS_PER_PAGE constant is 1", () => {
    expect(DAYS_PER_PAGE).toBe(1);
  });
});
