import { describe, expect, it } from "vitest";
import type { LeaderboardRow } from "../../types";
import {
  identityProjection,
  type LiveMatchForProjection,
  type LivePredictionForProjection,
  projectLeaderboard,
} from "../project-leaderboard";

function match(
  matchId: string,
  homeScore: number,
  awayScore: number,
  kickoffAt: string | null = null,
): LiveMatchForProjection {
  return {
    matchId,
    kickoffAt: kickoffAt ? new Date(kickoffAt) : null,
    match: {
      homeTeamId: "home",
      awayTeamId: "away",
      homeScore,
      awayScore,
      // LIVE ⇒ winnerTeamId null ⇒ penalty bonus never granted (BR-62.3).
      winnerTeamId: null,
      isKnockout: false,
    },
  };
}

function pred(
  userId: string,
  matchId: string,
  predictedHome: number,
  predictedAway: number,
  extras: Partial<LivePredictionForProjection> = {},
): LivePredictionForProjection {
  return {
    userId,
    matchId,
    prediction: { homeScore: predictedHome, awayScore: predictedAway, penaltyWinnerTeamId: null },
    ...extras,
  };
}

function row(
  userId: string,
  nickname: string,
  totalPoints: number,
  position: number,
): LeaderboardRow {
  return {
    position,
    userId,
    nickname,
    avatarUrl: "/a.png",
    totalPoints,
    isViewer: false,
    isTied: false,
  };
}

describe("projectLeaderboard (Unit 62)", () => {
  it("returns identity rows when no LIVE matches", () => {
    const rows = [row("u1", "Ana", 14, 1), row("u2", "Bo", 10, 2)];
    const result = projectLeaderboard({ rows, liveMatches: [], livePredictions: [] });
    expect(result).toHaveLength(2);
    expect(result[0].livePoints).toBe(0);
    expect(result[0].projectedPoints).toBe(14);
    expect(result[0].projectedPosition).toBe(1);
    expect(result[0].previousPosition).toBe(1);
    expect(result[0].positionDelta).toBe(0);
  });

  it("does not change a row when user didn't predict the LIVE match", () => {
    const rows = [row("u1", "Ana", 14, 1)];
    const result = projectLeaderboard({
      rows,
      liveMatches: [match("m1", 2, 1)],
      livePredictions: [], // nobody predicted the LIVE
    });
    expect(result[0].livePoints).toBe(0);
    expect(result[0].projectedPoints).toBe(14);
    expect(result[0].projectedPosition).toBe(1);
    expect(result[0].positionDelta).toBe(0);
  });

  it("adds exact-score points to a user predicting the LIVE result", () => {
    const rows = [row("u1", "Ana", 14, 1)];
    const result = projectLeaderboard({
      rows,
      liveMatches: [match("m1", 2, 1)],
      livePredictions: [pred("u1", "m1", 2, 1)], // exact → 5pts
    });
    expect(result[0].livePoints).toBe(5);
    expect(result[0].projectedPoints).toBe(19); // 14 + 5
    expect(result[0].positionDelta).toBe(0); // only one user, position unchanged
    expect(result[0].projectedPosition).toBe(1);
  });

  it("re-orders by projectedPoints and reports position delta", () => {
    const rows = [
      row("u1", "Ana", 14, 1),
      row("u2", "Bo", 10, 2),
      row("u3", "Cal", 12, 2), // tied at 12 → same confirmed pos 2
    ];
    // Predictions vs actual 2-1:
    //  - Ana 3-1: result correct (+2) + away goal matched (+1) = +3 → 17
    //  - Bo  2-1: exact (+5) → 15
    //  - Cal 1-2: miss → +0 → 12
    const result = projectLeaderboard({
      rows,
      liveMatches: [match("m1", 2, 1)],
      livePredictions: [pred("u1", "m1", 3, 1), pred("u2", "m1", 2, 1), pred("u3", "m1", 1, 2)],
    });
    // Sorted desc: Ana=17, Bo=15, Cal=12 (all unique → dense 1,2,3)
    expect(result.map((r) => r.userId)).toEqual(["u1", "u2", "u3"]);
    expect(result.map((r) => r.projectedPoints)).toEqual([17, 15, 12]);
    expect(result.map((r) => r.projectedPosition)).toEqual([1, 2, 3]);
    // Ana: prev 1 → proj 1 → delta 0
    expect(result[0].positionDelta).toBe(0);
    // Bo: prev 2 → proj 2 → delta 0
    expect(result[1].positionDelta).toBe(0);
    // Cal: prev 2 → proj 3 → delta -1 (fell)
    expect(result[2].positionDelta).toBe(2 - 3);
  });

  it("computes delta sign: ▲ when rising, ▼ when falling, 0 when unchanged", () => {
    const rows = [
      row("u1", "Ana", 10, 1), // will fall to pos 2
      row("u2", "Bo", 5, 2), // will rise to pos 1
    ];
    const result = projectLeaderboard({
      rows,
      liveMatches: [match("m1", 2, 1)],
      livePredictions: [
        pred("u1", "m1", 0, 0), // miss → +0 → 10 (stays 10)
        pred("u2", "m1", 2, 1), // exact → +5 → 10 → tie!
      ],
    });
    // Both tie at 10 → dense positions 1,1 (alphabetical: Ana first)
    expect(result[0].userId).toBe("u1");
    expect(result[0].projectedPosition).toBe(1);
    // Ana was pos 1, stays pos 1 → delta 0
    expect(result[0].positionDelta).toBe(0);
    expect(result[1].userId).toBe("u2");
    // Bo was pos 2, now pos 1 → delta = 2-1 = 1 (rose)
    expect(result[1].projectedPosition).toBe(1);
    expect(result[1].positionDelta).toBe(2 - 1);
  });

  it("synthesizes a NEW row for a user with LIVE predictions but no confirmed points (BR-62.4)", () => {
    const rows = [row("u1", "Ana", 14, 1)];
    const result = projectLeaderboard({
      rows,
      liveMatches: [match("m1", 2, 1)],
      livePredictions: [
        pred("u2", "m1", 2, 1, { nickname: "Bobi", avatarUrl: "/b.png" }), // new user
      ],
    });
    // Sorted desc: Ana=14 (no pred), Bobi=5 (synthesized). → Ana 1, Bobi 2.
    expect(result).toHaveLength(2);
    const bobi = result.find((r) => r.userId === "u2");
    expect(bobi?.isNew).toBe(true);
    expect(bobi?.previousPosition).toBeNull();
    expect(bobi?.positionDelta).toBeNull();
    expect(bobi?.totalPoints).toBe(0);
    expect(bobi?.livePoints).toBe(5);
    expect(bobi?.projectedPoints).toBe(5);
    expect(bobi?.nickname).toBe("Bobi");
  });

  it("skips a prediction when shouldSkipPrediction returns true (preJoin pool)", () => {
    const rows = [row("u1", "Ana", 14, 1)];
    const result = projectLeaderboard({
      rows,
      liveMatches: [match("m1", 2, 1, "2026-01-01T00:00:00Z")], // old kickoff
      livePredictions: [pred("u1", "m1", 2, 1)],
      shouldSkipPrediction: (_p, m) =>
        m.kickoffAt != null && m.kickoffAt < new Date("2026-06-23T10:00:00Z"), // user joined after
    });
    expect(result[0].livePoints).toBe(0);
    expect(result[0].projectedPoints).toBe(14);
  });

  it("sums points across multiple LIVE matches", () => {
    const rows = [row("u1", "Ana", 10, 1)];
    const result = projectLeaderboard({
      rows,
      liveMatches: [match("m1", 2, 1), match("m2", 0, 0)],
      livePredictions: [
        pred("u1", "m1", 2, 1), // exact → 5
        pred("u1", "m2", 0, 0), // exact → 5
      ],
    });
    expect(result[0].livePoints).toBe(10);
    expect(result[0].projectedPoints).toBe(20);
  });

  it("ignores predictions for matches not in liveMatches", () => {
    const rows = [row("u1", "Ana", 10, 1)];
    const result = projectLeaderboard({
      rows,
      liveMatches: [match("m1", 2, 1)],
      livePredictions: [
        pred("u1", "m2", 5, 0), // m2 not in liveMatches → ignored
      ],
    });
    expect(result[0].livePoints).toBe(0);
    expect(result[0].projectedPoints).toBe(10);
  });

  it("penalty bonus is NOT granted during LIVE (BR-62.3)", () => {
    // Knockout match tied at LIVE (0-0); winnerTeamId null while LIVE.
    const liveMatch: LiveMatchForProjection = {
      matchId: "m1",
      kickoffAt: null,
      match: {
        homeTeamId: "home",
        awayTeamId: "away",
        homeScore: 0,
        awayScore: 0,
        winnerTeamId: null, // unknown at LIVE
        isKnockout: true,
      },
    };
    const result = projectLeaderboard({
      rows: [row("u1", "Ana", 10, 1)],
      liveMatches: [liveMatch],
      livePredictions: [
        {
          userId: "u1",
          matchId: "m1",
          prediction: {
            homeScore: 0,
            awayScore: 0, // exact score (0-0) → 5
            penaltyWinnerTeamId: "home", // would grant bonus at FINISHED
          },
        },
      ],
    });
    // Exact score → 5 points; penalty bonus (+1) NOT granted because
    // `actualPenaltyWinner` (mapped from winnerTeamId) is null at LIVE.
    expect(result[0].livePoints).toBe(5);
  });
});

describe("identityProjection", () => {
  it("returns rows with projectedPoints=totalPoints and positionDelta=0", () => {
    const rows = [row("u1", "Ana", 14, 1), row("u2", "Bo", 12, 1)];
    const out = identityProjection(rows);
    expect(out[0].projectedPoints).toBe(14);
    expect(out[0].projectedPosition).toBe(1);
    expect(out[0].positionDelta).toBe(0);
    expect(out[0].livePoints).toBe(0);
    expect(out[0].isNew).toBe(false);
  });
});
