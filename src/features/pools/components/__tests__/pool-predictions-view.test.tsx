// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import type { PoolMemberPrediction } from "../../types";

// Inline the pure transform logic from pool-predictions-view.tsx for unit-testability.
// The component itself is an async server component that calls these transforms.
// This test validates the grouping and cell-building logic independently.

interface MatchColumn {
  matchId: string;
  label: string;
  sublabel: string | null;
}

interface DayGroup {
  dayKey: string;
  label: string;
  matches: MatchColumn[];
}

function buildMatchLabel(p: PoolMemberPrediction): { label: string; sublabel: string | null } {
  const home = p.homeTeam?.fifaCode ?? p.homePlaceholder ?? "?";
  const away = p.awayTeam?.fifaCode ?? p.awayPlaceholder ?? "?";
  const label = `${home} vs ${away}`;
  const scored = p.matchStatus === "FINISHED" && p.homeScore != null && p.awayScore != null;
  const sublabel = scored ? `${p.homeScore} - ${p.awayScore}` : null;
  return { label, sublabel };
}

function buildDayGroups(predictions: PoolMemberPrediction[]): DayGroup[] {
  const matchSet = new Map<string, PoolMemberPrediction>();
  for (const p of predictions) matchSet.set(p.matchId, p);

  const uniqueMatches = [...matchSet.values()].sort((a, b) => {
    const ta = a.kickoffAt ? Date.parse(a.kickoffAt) : Number.POSITIVE_INFINITY;
    const tb = b.kickoffAt ? Date.parse(b.kickoffAt) : Number.POSITIVE_INFINITY;
    if (ta !== tb) return ta - tb;
    return (a.matchNumber ?? 0) - (b.matchNumber ?? 0);
  });

  const byDay = new Map<string, DayGroup>();
  for (const match of uniqueMatches) {
    const dayKey = match.kickoffAt?.slice(0, 10) ?? "__tbd__";
    let group = byDay.get(dayKey);
    if (!group) {
      group = { dayKey, label: dayKey, matches: [] };
      byDay.set(dayKey, group);
    }
    group.matches.push({ matchId: match.matchId, ...buildMatchLabel(match) });
  }

  return [...byDay.values()].reverse();
}

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
    const groups = buildDayGroups([day1, day2]);
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
    const groups = buildDayGroups([m1, m2]);
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
    const groups = buildDayGroups([later, earlier]);
    expect(groups[0].matches[0].matchId).toBe("m-2");
    expect(groups[0].matches[1].matchId).toBe("m-1");
  });

  it("deduplicates predictions for same match across users", () => {
    const p1 = makePrediction({ userId: "user-1" });
    const p2 = makePrediction({ userId: "user-2" });
    const groups = buildDayGroups([p1, p2]);
    expect(groups[0].matches).toHaveLength(1);
  });

  it("handles matches with null kickoffAt", () => {
    const p = makePrediction({ kickoffAt: null });
    const groups = buildDayGroups([p]);
    expect(groups[0].dayKey).toBe("__tbd__");
  });

  it("returns empty array when no predictions", () => {
    const groups = buildDayGroups([]);
    expect(groups).toEqual([]);
  });
});
