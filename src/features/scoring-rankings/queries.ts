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
 * Global ranking across all pools (FR-REFINE-14.1 / US-13.1). Includes verified
 * users with at least one scored prediction. Only reads nickname, avatar and
 * total points — never emails, private pools or individual predictions
 * (FR-REFINE-14.3 security). Deterministic order: points desc, then nickname asc.
 */
export async function getGlobalRanking(viewerId: string | null): Promise<LeaderboardRow[]> {
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
      isViewer: p.id === viewerId,
    }))
    // Deterministic tiebreak by nickname (FR-REFINE-14.3).
    .sort((a, b) => b.totalPoints - a.totalPoints || a.nickname.localeCompare(b.nickname));

  return assignDensePositions(rows);
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
