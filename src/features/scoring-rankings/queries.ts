import { formatNickname } from "@/features/pools/services/session";
import { prisma } from "@/lib/prisma";
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
 * Pool leaderboard (BL-5, US-5.2). Only members may view it (BR-6.16); returns
 * null for non-members. Dense ranking, members with no scores show 0.
 */
export async function getPoolLeaderboard(
  poolId: string,
  viewerId: string,
): Promise<LeaderboardRow[] | null> {
  const viewerMembership = await prisma.poolMembership.findUnique({
    where: { poolId_userId: { poolId, userId: viewerId } },
  });
  if (!viewerMembership) return null;

  const members = await prisma.poolMembership.findMany({
    where: { poolId },
    include: { user: true },
  });

  const totals = await userTotals(members.map((m) => m.userId));

  const rows = members
    .map((m) => ({
      userId: m.userId,
      nickname: formatNickname(m.user.nicknameBase, m.user.nicknameDiscriminator),
      avatarUrl: m.user.avatarUrl,
      totalPoints: totals.get(m.userId) ?? 0,
      isViewer: m.userId === viewerId,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  return assignDensePositions(rows);
}
