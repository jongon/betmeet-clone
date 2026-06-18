import { unstable_cache } from "next/cache";
import { formatNickname } from "@/features/pools/services/session";
import { prisma } from "@/lib/prisma";
import { POOL_LEADERBOARD_TAG_PREFIX, RANKINGS_TAG } from "./cache-tags";
import { assignDensePositions } from "./services/ranking";
import type { LeaderboardRow } from "./types";

const getGlobalRankingRows = unstable_cache(
  async (): Promise<LeaderboardRow[]> => {
    const scores = await prisma.predictionScore.findMany({
      where: { prediction: { poolId: null } },
      select: { userId: true, totalPoints: true },
    });

    if (scores.length === 0) return [];

    const totals = new Map<string, number>();
    for (const s of scores) {
      totals.set(s.userId, (totals.get(s.userId) ?? 0) + s.totalPoints);
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
        user: {
          select: { nicknameBase: true, nicknameDiscriminator: true, avatarUrl: true },
        },
      },
    });

    const memberIds = members.map((m) => m.userId);

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
        prediction: { select: { poolId: true, matchId: true } },
      },
    });

    const totals = new Map<string, number>();

    for (const row of scoreRows) {
      const userId = row.userId;
      const isOverride = row.prediction.poolId === poolId;

      if (isOverride) {
        totals.set(userId, (totals.get(userId) ?? 0) + row.totalPoints);
        continue;
      }

      const overridden = scoreRows.some(
        (r) =>
          r.userId === userId &&
          r.prediction.matchId === row.prediction.matchId &&
          r.prediction.poolId === poolId,
      );

      if (!overridden) {
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
