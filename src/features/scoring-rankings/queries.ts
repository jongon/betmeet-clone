import { unstable_cache } from "next/cache";
import { formatNickname } from "@/features/pools/services/session";
import { prisma } from "@/lib/prisma";
import { POOL_LEADERBOARD_TAG_PREFIX, RANKINGS_TAG } from "./cache-tags";
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
