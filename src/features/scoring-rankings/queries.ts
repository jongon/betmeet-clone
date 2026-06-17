import { unstable_cache } from "next/cache";
import { formatNickname } from "@/features/pools/services/session";
import { prisma } from "@/lib/prisma";
import { RANKINGS_TAG } from "./cache-tags";
import { assignDensePositions } from "./services/ranking";
import type { LeaderboardRow } from "./types";

/** Total points per user (global, BR-6.11). Absent users map to 0 by omission. */
export async function userTotals(userIds: string[]): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();
  const rows = await prisma.predictionScore.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds } },
    _sum: { totalPoints: true },
  });
  return new Map(rows.map((row) => [row.userId, row._sum.totalPoints ?? 0]));
}

/**
 * The global ranking WITHOUT the per-viewer `isViewer` flag (always false). It only
 * changes when prediction scores change, so it is cached and invalidated by
 * {@link RANKINGS_TAG} instead of re-running an unfiltered `groupBy` over the whole
 * `PredictionScore` table on every `/rankings` visit (NFR-PERF-REFINE-22.4). The
 * output is serializable, so it survives the cache boundary.
 */
const getGlobalRankingRows = unstable_cache(
  async (): Promise<LeaderboardRow[]> => {
    // Users with at least one scored prediction, with their global point totals.
    const totalsByUser = await prisma.predictionScore.groupBy({
      by: ["userId"],
      _sum: { totalPoints: true },
    });
    if (totalsByUser.length === 0) return [];

    // Keep only verified, non-deleted users (FR-REFINE-14.1).
    const profiles = await prisma.profile.findMany({
      where: {
        id: { in: totalsByUser.map((t) => t.userId) },
        verificationStatus: { not: "UNVERIFIED" },
        deletedAt: null,
      },
      select: { id: true, nicknameBase: true, nicknameDiscriminator: true, avatarUrl: true },
    });

    const totals = new Map(totalsByUser.map((t) => [t.userId, t._sum.totalPoints ?? 0]));

    const rows = profiles
      .map((p) => ({
        userId: p.id,
        nickname: formatNickname(p.nicknameBase, p.nicknameDiscriminator),
        avatarUrl: p.avatarUrl,
        totalPoints: totals.get(p.id) ?? 0,
        isViewer: false as boolean,
      }))
      // Deterministic tiebreak by nickname (FR-REFINE-14.3).
      .sort((a, b) => b.totalPoints - a.totalPoints || a.nickname.localeCompare(b.nickname));

    return assignDensePositions(rows);
  },
  ["global-ranking"],
  { tags: [RANKINGS_TAG], revalidate: 300 },
);

/**
 * Global ranking across all pools (FR-REFINE-14.1 / US-13.1). Includes verified
 * users with at least one scored prediction. Only reads nickname, avatar and
 * total points — never emails, private pools or individual predictions
 * (FR-REFINE-14.3 security). Deterministic order: points desc, then nickname asc.
 *
 * The ranking itself is cached ({@link getGlobalRankingRows}); only the per-viewer
 * `isViewer` flag is applied per request.
 */
export async function getGlobalRanking(viewerId: string | null): Promise<LeaderboardRow[]> {
  const rows = await getGlobalRankingRows();
  if (!viewerId) return rows;
  return rows.map((row) => ({ ...row, isViewer: row.userId === viewerId }));
}

/**
 * A pool's leaderboard WITHOUT the per-viewer `isViewer` flag (always false). Like
 * the global ranking it only changes when prediction scores or memberships change,
 * so it is cached per `poolId` and invalidated by {@link RANKINGS_TAG} instead of
 * re-querying every member (with a full profile row) and re-aggregating on every
 * pool/leaderboard view. The output is serializable, so it survives the cache
 * boundary. `unstable_cache` keys on the arguments, so each pool is cached
 * separately.
 */
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

    const totals = await userTotals(members.map((m) => m.userId));

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
  { tags: [RANKINGS_TAG], revalidate: 300 },
);

/**
 * Pool leaderboard (BL-5, US-5.2). Only members may view it (BR-6.16); returns
 * null for non-members. Dense ranking, members with no scores show 0.
 *
 * The ranking itself is cached ({@link getPoolLeaderboardRows}); only the
 * membership check and the per-viewer `isViewer` flag run per request.
 */
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
