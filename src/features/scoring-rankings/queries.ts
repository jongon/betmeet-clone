import { unstable_cache } from "next/cache";
import { formatNickname } from "@/features/pools/services/session";
import { prisma } from "@/lib/prisma";
import { POOL_LEADERBOARD_TAG_PREFIX, RANKINGS_TAG } from "./cache-tags";
import {
  identityProjection,
  type LiveMatchForProjection,
  type LivePredictionForProjection,
  type ProjectedLeaderboardRow,
  projectLeaderboard,
} from "./services/project-leaderboard";
import { assignDensePositions } from "./services/ranking";
import type { LeaderboardRow } from "./types";

const getGlobalRankingRows = unstable_cache(
  async (): Promise<LeaderboardRow[]> => {
    // Aggregate per user in the database (SUM ... GROUP BY user_id) instead of
    // streaming every (user, match) score row into the process and summing in
    // JS — keeps the payload to one row per user as the table grows.
    const grouped = await prisma.predictionScore.groupBy({
      by: ["userId"],
      where: { prediction: { poolId: null } },
      _sum: { totalPoints: true },
    });

    if (grouped.length === 0) return [];

    const totals = new Map<string, number>();
    for (const g of grouped) {
      totals.set(g.userId, g._sum.totalPoints ?? 0);
    }

    const profiles = await prisma.profile.findMany({
      where: {
        id: { in: [...totals.keys()] },
        verificationStatus: { not: "UNVERIFIED" },
        deletedAt: null,
      },
      select: { id: true, nicknameBase: true, nicknameDiscriminator: true, avatarUrl: true },
    });

    const rows = profiles
      .map((p) => ({
        userId: p.id,
        nickname: formatNickname(p.nicknameBase, p.nicknameDiscriminator),
        avatarUrl: p.avatarUrl,
        totalPoints: totals.get(p.id) ?? 0,
        isViewer: false as boolean,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints || a.nickname.localeCompare(b.nickname));

    return assignDensePositions(rows);
  },
  ["global-ranking"],
  { tags: [RANKINGS_TAG], revalidate: 300 },
);

export async function getGlobalRanking(viewerId: string | null): Promise<LeaderboardRow[]> {
  const rows = await getGlobalRankingRows();
  if (!viewerId) return rows;
  return rows.map((row) => ({ ...row, isViewer: row.userId === viewerId }));
}

const getPoolLeaderboardRows = unstable_cache(
  async (poolId: string): Promise<LeaderboardRow[]> => {
    const members = await prisma.poolMembership.findMany({
      where: { poolId },
      select: {
        userId: true,
        joinedAt: true,
        user: {
          select: { nicknameBase: true, nicknameDiscriminator: true, avatarUrl: true },
        },
      },
    });

    const memberIds = members.map((m) => m.userId);

    // Unit 55: the pool leaderboard only counts matches played after each member
    // joined this pool, so a member's pool total is what they accumulated *here*
    // (not their full global history). The global ranking stays unaffected.
    const joinedAt = new Map(members.map((m) => [m.userId, m.joinedAt]));

    const scoreRows = await prisma.predictionScore.findMany({
      where: {
        prediction: {
          userId: { in: memberIds },
          OR: [{ poolId }, { poolId: null }],
        },
      },
      select: {
        userId: true,
        totalPoints: true,
        prediction: {
          select: { poolId: true, matchId: true, match: { select: { kickoffAt: true } } },
        },
      },
    });

    // Pre-index which (user, match) pairs have a pool-scoped override in one
    // pass, so the global-vs-override resolution below is O(n) instead of the
    // previous O(n²) `.some()` scan per row.
    const overrideKeys = new Set<string>();
    for (const row of scoreRows) {
      if (row.prediction.poolId === poolId) {
        overrideKeys.add(`${row.userId}:${row.prediction.matchId}`);
      }
    }

    const totals = new Map<string, number>();

    for (const row of scoreRows) {
      const userId = row.userId;

      // Unit 55: skip matches that kicked off before this member joined the pool.
      // The kickoff is identical for a member's global row and their pool override
      // of the same match, so this stays consistent with the override dedup below.
      const joined = joinedAt.get(userId);
      const kickoff = row.prediction.match.kickoffAt;
      if (!joined || !kickoff || kickoff < joined) continue;

      const isOverride = row.prediction.poolId === poolId;

      if (isOverride) {
        totals.set(userId, (totals.get(userId) ?? 0) + row.totalPoints);
        continue;
      }

      // Global score: count it only when this member has no pool override for
      // the same match (the override already added its points above).
      if (!overrideKeys.has(`${userId}:${row.prediction.matchId}`)) {
        totals.set(userId, (totals.get(userId) ?? 0) + row.totalPoints);
      }
    }

    const rows = members
      .map((m) => ({
        userId: m.userId,
        nickname: formatNickname(m.user.nicknameBase, m.user.nicknameDiscriminator),
        avatarUrl: m.user.avatarUrl,
        totalPoints: totals.get(m.userId) ?? 0,
        isViewer: false as boolean,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);

    return assignDensePositions(rows);
  },
  ["pool-leaderboard"],
  { tags: [POOL_LEADERBOARD_TAG_PREFIX, RANKINGS_TAG], revalidate: 300 },
);

export async function getPoolLeaderboard(
  poolId: string,
  viewerId: string,
): Promise<LeaderboardRow[] | null> {
  const viewerMembership = await prisma.poolMembership.findUnique({
    where: { poolId_userId: { poolId, userId: viewerId } },
  });
  if (!viewerMembership) return null;

  const rows = await getPoolLeaderboardRows(poolId);
  return rows.map((row) => ({ ...row, isViewer: row.userId === viewerId }));
}

// ---------------------------------------------------------------------------
// Unit 62 — Live leaderboard projection (NOT cached).
//
// Reuses the cached confirmed rows (`getGlobalRanking` / `getPoolLeaderboard`)
// and overlays a `computeScore` projection for matches currently `LIVE`. The
// confirmed cache stays untouched (BR-62.7); the projection is recomputed per
// render against the fresh `Match.homeScore/awayScore` written by the cron
// `LIVE_STATUS` (Unit 50) and refreshed client-side via `useLiveResults`
// (Unit 58).
// ---------------------------------------------------------------------------

interface LiveDbMatch {
  id: string;
  matchNumber: number | null;
  kickoffAt: Date | null;
  homeScore: number | null;
  awayScore: number | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  winnerTeamId: string | null;
  phase: { type: string };
}

async function findLiveMatches(): Promise<LiveDbMatch[]> {
  return prisma.match.findMany({
    where: { status: "LIVE" },
    select: {
      id: true,
      matchNumber: true,
      kickoffAt: true,
      homeScore: true,
      awayScore: true,
      homeTeamId: true,
      awayTeamId: true,
      winnerTeamId: true,
      phase: { select: { type: true } },
    },
  });
}

function toLiveMatchForProjection(m: LiveDbMatch): LiveMatchForProjection {
  return {
    matchId: m.id,
    kickoffAt: m.kickoffAt,
    // BR-62.3: while LIVE, `winnerTeamId` is null → penalty bonus never granted.
    match: {
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      homeScore: m.homeScore ?? 0,
      awayScore: m.awayScore ?? 0,
      winnerTeamId: null,
      isKnockout: m.phase.type === "KNOCKOUT",
    },
  };
}

/** Projection for `/rankings`. Returns `{ rows, hasLive }`. */
export async function getGlobalRankingProjection(
  viewerId: string | null,
): Promise<{ rows: ProjectedLeaderboardRow[]; hasLive: boolean }> {
  const rows = await getGlobalRanking(viewerId);

  const liveDb = await findLiveMatches();
  if (liveDb.length === 0) {
    return { rows: identityProjection(rows), hasLive: false };
  }

  const liveMatches = liveDb.map(toLiveMatchForProjection);
  const liveMatchIds = liveMatches.map((m) => m.matchId);

  // Global scope: poolId IS NULL (BR-62.2 global). Filter unverified / soft-
  // deleted users to mirror the confirmed ranking (`getGlobalRankingRows`).
  const livePreds = await prisma.prediction.findMany({
    where: {
      matchId: { in: liveMatchIds },
      poolId: null,
      user: {
        verificationStatus: { not: "UNVERIFIED" },
        deletedAt: null,
      },
    },
    select: {
      userId: true,
      matchId: true,
      homeScore: true,
      awayScore: true,
      penaltyWinnerTeamId: true,
      user: {
        select: { nicknameBase: true, nicknameDiscriminator: true, avatarUrl: true },
      },
    },
  });

  const livePredictions: LivePredictionForProjection[] = livePreds.map((p) => ({
    userId: p.userId,
    matchId: p.matchId,
    prediction: {
      homeScore: p.homeScore,
      awayScore: p.awayScore,
      penaltyWinnerTeamId: p.penaltyWinnerTeamId,
    },
    nickname: formatNickname(p.user.nicknameBase, p.user.nicknameDiscriminator),
    avatarUrl: p.user.avatarUrl,
  }));

  return {
    rows: projectLeaderboard({ rows, liveMatches, livePredictions }),
    hasLive: true,
  };
}

/** Projection for `/pools/[id]/leaderboard`. Returns null when not a member. */
export async function getPoolLeaderboardProjection(
  poolId: string,
  viewerId: string,
): Promise<{ rows: ProjectedLeaderboardRow[]; hasLive: boolean } | null> {
  const rows = await getPoolLeaderboard(poolId, viewerId);
  if (rows === null) return null; // not a member

  const liveDb = await findLiveMatches();
  if (liveDb.length === 0) {
    return { rows: identityProjection(rows), hasLive: false };
  }

  const liveMatches = liveDb.map(toLiveMatchForProjection);
  const liveMatchIds = liveMatches.map((m) => m.matchId);

  const members = await prisma.poolMembership.findMany({
    where: { poolId },
    select: { userId: true, joinedAt: true },
  });
  const memberIds = members.map((m) => m.userId);
  const joinedAtByUser = new Map(members.map((m) => [m.userId, m.joinedAt]));

  const livePredsRaw = await prisma.prediction.findMany({
    where: {
      matchId: { in: liveMatchIds },
      userId: { in: memberIds },
      OR: [{ poolId }, { poolId: null }],
    },
    select: {
      userId: true,
      matchId: true,
      poolId: true,
      homeScore: true,
      awayScore: true,
      penaltyWinnerTeamId: true,
      user: {
        select: { nicknameBase: true, nicknameDiscriminator: true, avatarUrl: true },
      },
    },
  });

  // Resolve override ?? global per (userId, matchId) — same O(n) pattern as
  // `getPoolLeaderboardRows` (queries.ts:96-127). Override takes precedence; a
  // global is only counted when no override exists for that (user, match).
  const overrideKeys = new Set<string>();
  for (const p of livePredsRaw) {
    if (p.poolId === poolId) overrideKeys.add(`${p.userId}:${p.matchId}`);
  }

  const livePredictions: LivePredictionForProjection[] = [];
  for (const p of livePredsRaw) {
    const isOverride = p.poolId === poolId;
    if (!isOverride && overrideKeys.has(`${p.userId}:${p.matchId}`)) continue;

    const match = liveMatches.find((m) => m.matchId === p.matchId);
    if (!match) continue;

    // preJoin (Unit 55/56): matches kicked off before the member joined don't
    // count toward the pool leaderboard.
    const joined = joinedAtByUser.get(p.userId);
    if (joined && match.kickoffAt && match.kickoffAt < joined) continue;

    livePredictions.push({
      userId: p.userId,
      matchId: p.matchId,
      prediction: {
        homeScore: p.homeScore,
        awayScore: p.awayScore,
        penaltyWinnerTeamId: p.penaltyWinnerTeamId,
      },
      nickname: formatNickname(p.user.nicknameBase, p.user.nicknameDiscriminator),
      avatarUrl: p.user.avatarUrl,
    });
  }

  return {
    rows: projectLeaderboard({ rows, liveMatches, livePredictions }),
    hasLive: true,
  };
}
