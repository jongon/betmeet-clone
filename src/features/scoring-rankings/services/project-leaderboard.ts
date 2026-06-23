import type {
  MatchView as PoolMatchView,
  PoolMemberPrediction,
  PoolMemberSummary,
} from "@/features/pools/types";
import { computeScore } from "@/features/scoring/compute-score";
import type { LeaderboardRow } from "../types";
import { assignDensePositions } from "./ranking";
import type { ScoreableMatch, ScoreablePrediction } from "./score-adapter";
import { toScoringExample } from "./score-adapter";

/**
 * Unit 62 — projected leaderboard against the current LIVE scoreboard.
 *
 * Pure (no IO / no React cache): consumes the cached confirmed rows + a tiny
 * slice of LIVE matches/predictions and emits a re-ordered, projected ranking.
 * Nothing is persisted (BR-41.5 / BR-62.7): `PredictionScore` for LIVE matches
 * still doesn't exist; the projection is recomputed per render.
 */

/** A LIVE match with the data needed to `computeScore` (BR-62.2). */
export interface LiveMatchForProjection {
  matchId: string;
  kickoffAt: Date | null;
  match: ScoreableMatch;
}

/**
 * A user's prediction for a LIVE match in the relevant scope. The override-vs-
 * global resolution is done by the caller (so this stays pure and reusable).
 */
export interface LivePredictionForProjection {
  userId: string;
  matchId: string;
  prediction: ScoreablePrediction;
  /** Identity to synthesize a row for users with no confirmed points (BR-62.4). */
  nickname?: string;
  avatarUrl?: string | null;
}

/** Extended leaderboard row carrying the projection against the live scoreboard. */
export interface ProjectedLeaderboardRow extends LeaderboardRow {
  /** Points contributed by LIVE matches (projected, not persisted). */
  livePoints: number;
  /** Confirmed total + live projection. */
  projectedPoints: number;
  /** Position in the confirmed ranking (before projection); null = new entry. */
  previousPosition: number | null;
  /** Position in the projected ranking (dense, BR-6.13). */
  projectedPosition: number;
  /** `previousPosition - projectedPosition`: positive=rose, negative=fell, null=new. */
  positionDelta: number | null;
  /** True when the user was synthesized (no confirmed `PredictionScore`). */
  isNew: boolean;
}

export interface ProjectLeaderboardParams {
  rows: LeaderboardRow[];
  liveMatches: LiveMatchForProjection[];
  livePredictions: LivePredictionForProjection[];
  /** Optional skipper (e.g. `preJoin` for pool: `kickoff < joinedAt`). */
  shouldSkipPrediction?: (
    pred: LivePredictionForProjection,
    match: LiveMatchForProjection,
  ) => boolean;
}

/**
 * Projects a confirmed leaderboard against the current LIVE scoreboard
 * (BR-62.1 / BR-62.2 / BR-62.4 / BR-62.5).
 *
 * - Sums `computeScore(prediction, liveMatch)` per (user, LIVE match) where the
 *   prediction isn't skipped, into each row's `livePoints` / `projectedPoints`.
 * - Synthesizes rows for users with LIVE predictions but no confirmed row.
 * - Reorders by `projectedPoints` desc, then nickname asc (matches existing order).
 * - Assigns `projectedPosition` via dense ranking (`assignDensePositions`).
 * - Computes `positionDelta = previousPosition - projectedPosition`.
 */
export function projectLeaderboard({
  rows,
  liveMatches,
  livePredictions,
  shouldSkipPrediction,
}: ProjectLeaderboardParams): ProjectedLeaderboardRow[] {
  const matchesByLiveId = new Map(liveMatches.map((m) => [m.matchId, m]));

  const confirmedByUser = new Map(rows.map((r) => [r.userId, r]));

  const accumulated = new Map<
    string,
    {
      userId: string;
      nickname: string;
      avatarUrl: string;
      confirmed: number;
      previousPosition: number | null;
      livePoints: number;
      isNew: boolean;
    }
  >();

  for (const row of rows) {
    accumulated.set(row.userId, {
      userId: row.userId,
      nickname: row.nickname,
      avatarUrl: row.avatarUrl,
      confirmed: row.totalPoints,
      previousPosition: row.position,
      livePoints: 0,
      isNew: false,
    });
  }

  for (const pred of livePredictions) {
    const match = matchesByLiveId.get(pred.matchId);
    if (!match) continue;
    if (shouldSkipPrediction?.(pred, match)) continue;

    const breakdown = computeScore(toScoringExample(pred.prediction, match.match));

    let entry = accumulated.get(pred.userId);
    if (!entry) {
      entry = {
        userId: pred.userId,
        nickname: pred.nickname ?? "—",
        avatarUrl: pred.avatarUrl ?? "",
        confirmed: 0,
        previousPosition: null,
        livePoints: 0,
        isNew: true,
      };
      accumulated.set(pred.userId, entry);
    }
    entry.livePoints += breakdown.totalPoints;
  }

  const projected: ProjectedLeaderboardRow[] = [...accumulated.values()]
    .map((e) => ({
      userId: e.userId,
      nickname: e.nickname,
      avatarUrl: e.avatarUrl,
      totalPoints: e.confirmed,
      isViewer: confirmedByUser.get(e.userId)?.isViewer ?? false,
      isTied: false,
      position: e.previousPosition ?? 0,
      previousPosition: e.previousPosition,
      livePoints: e.livePoints,
      projectedPoints: e.confirmed + e.livePoints,
      projectedPosition: 0,
      positionDelta: null as number | null,
      isNew: e.isNew,
    }))
    .sort((a, b) => b.projectedPoints - a.projectedPoints || a.nickname.localeCompare(b.nickname));

  // `assignDensePositions` keys off `totalPoints`; trick it into ranking by
  // `projectedPoints` by wrapping each row with that field name aliased.
  const ranked = assignDensePositions(
    projected.map((r) => ({ totalPoints: r.projectedPoints, row: r })),
  );

  return ranked.map((r) => {
    const row = r.row;
    row.projectedPosition = r.position;
    row.isTied = r.isTied;
    row.positionDelta =
      row.previousPosition !== null ? row.previousPosition - row.projectedPosition : null;
    return row;
  });
}

/**
 * Adapts the data already loaded by `getPoolMemberPredictions` for `/pools/[id]`
 * (BL-62.3/BL-62.4): avoids a second DB hit by reusing the matches/predictions
 * the page already fetched. Resolves override ?? global and `preJoin` here.
 */
export function projectPoolLeaderboardFromLoaded(params: {
  rows: LeaderboardRow[];
  matches: PoolMatchView[];
  predictions: PoolMemberPrediction[];
  members: PoolMemberSummary[];
}): ProjectedLeaderboardRow[] {
  const { rows, matches, predictions, members } = params;

  const liveMatchesView = matches.filter((m) => m.matchStatus === "LIVE");
  if (liveMatchesView.length === 0) {
    // No LIVE → return rows as-is (the caller will skip projection rendering).
    return rows.map((r) => ({
      ...r,
      livePoints: 0,
      projectedPoints: r.totalPoints,
      previousPosition: r.position,
      projectedPosition: r.position,
      positionDelta: 0,
      isNew: false,
    }));
  }

  const liveMatchIds = new Set(liveMatchesView.map((m) => m.matchId));
  const liveMatches: LiveMatchForProjection[] = liveMatchesView.map((m) => ({
    matchId: m.matchId,
    kickoffAt: m.kickoffAt ? new Date(m.kickoffAt) : null,
    match: {
      homeTeamId: m.homeTeam?.id ?? null,
      awayTeamId: m.awayTeam?.id ?? null,
      homeScore: m.homeScore ?? 0,
      awayScore: m.awayScore ?? 0,
      // Unit 62 BR-62.3: winnerTeamId is null while LIVE → penalty bonus never
      // applies (the bonus is granted at FINISHED via `scoreMatch`).
      winnerTeamId: null,
      isKnockout: m.phaseType === "KNOCKOUT",
    },
  }));

  const joinedAtByUser = new Map(members.map((m) => [m.userId, new Date(m.joinedAt)]));

  // Override ?? global resolution by (userId, matchId) — same pattern as
  // `getPoolLeaderboardRows` (queries.ts): a Set of override keys; iterate and
  // prefer the override, fall back to the global when absent.
  const overrideKeys = new Set<string>();
  for (const p of predictions) {
    if (p.isOverride && liveMatchIds.has(p.matchId) && !p.hidden) {
      overrideKeys.add(`${p.userId}:${p.matchId}`);
    }
  }

  const livePredictions: LivePredictionForProjection[] = [];
  for (const p of predictions) {
    if (!liveMatchIds.has(p.matchId)) continue;
    if (p.hidden) continue; // Unit 53 safety (LIVE ⇒ started ⇒ never hidden)
    if (p.predictedHome === null || p.predictedAway === null) continue;

    // Skip preJoin: pool doesn't count matches kicked off before the member
    // joined (Unit 55/56, BR-62.2 pool).
    const match = liveMatches.find((m) => m.matchId === p.matchId);
    if (!match) continue;
    const joined = joinedAtByUser.get(p.userId);
    if (joined && match.kickoffAt && match.kickoffAt < joined) continue;

    // Prefer the override prediction for this (user, match); skip the global
    // when an override exists (we already counted its points).
    if (!p.isOverride && overrideKeys.has(`${p.userId}:${p.matchId}`)) continue;

    livePredictions.push({
      userId: p.userId,
      matchId: p.matchId,
      prediction: {
        homeScore: p.predictedHome,
        awayScore: p.predictedAway,
        penaltyWinnerTeamId: null, // PoolMemberPrediction doesn't carry this; harmless (BR-62.3).
      },
      // Identity not strictly needed here — members already in `rows`; but in
      // case a user is missing from rows, supply from the prediction record.
      nickname: p.nickname,
      avatarUrl: p.avatarUrl,
    });
  }

  return projectLeaderboard({ rows, liveMatches, livePredictions });
}

/** Helper: empty-projection identity (used when there are no LIVE matches). */
export function identityProjection(rows: LeaderboardRow[]): ProjectedLeaderboardRow[] {
  return rows.map((r) => ({
    ...r,
    livePoints: 0,
    projectedPoints: r.totalPoints,
    previousPosition: r.position,
    projectedPosition: r.position,
    positionDelta: 0,
    isNew: false,
  }));
}
