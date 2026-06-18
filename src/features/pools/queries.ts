import { cache } from "react";
import { toTeamView } from "@/features/competition/queries";
import { prisma } from "@/lib/prisma";
import { formatNickname, getCurrentUserId } from "./services/session";
import type {
  MyPoolSummary,
  PoolDetail,
  PoolMemberPrediction,
  PoolMemberSummary,
  PoolPreviewItem,
  PoolType,
} from "./types";

const DIRECTORY_PAGE_SIZE = 20;

/** Pools the current user belongs to (active + archived) — MyPoolsPage. */
export const getMyPools = cache(async (): Promise<MyPoolSummary[]> => {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const memberships = await prisma.poolMembership.findMany({
    where: { userId },
    include: { pool: { include: { _count: { select: { memberships: true } } } } },
    orderBy: { joinedAt: "desc" },
  });

  return memberships.map((m) => ({
    id: m.pool.id,
    name: m.pool.name,
    type: m.pool.type as PoolType,
    memberCount: m.pool._count.memberships,
    capacity: m.pool.capacity,
    isOwner: m.pool.ownerId === userId,
    isArchived: m.archivedAt !== null,
    membersCanInvite: m.pool.membersCanInvite, // Unit 45: BR-45.9
  }));
});

/** Full pool detail — only members may view it (BR-3.28). Returns null otherwise. */
export const getPoolDetail = cache(async (poolId: string): Promise<PoolDetail | null> => {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    select: {
      id: true,
      name: true,
      type: true,
      capacity: true,
      inviteToken: true,
      ownerId: true,
      membersCanInvite: true, // Unit 45: BR-45.9
      memberships: {
        include: { user: true },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
  if (!pool) return null;

  const own = pool.memberships.find((m) => m.userId === userId);
  if (!own) return null; // not a member → no access

  const members: PoolMemberSummary[] = pool.memberships.map((m) => ({
    userId: m.userId,
    nickname: formatNickname(m.user.nicknameBase, m.user.nicknameDiscriminator),
    avatarUrl: m.user.avatarUrl,
    isOwner: m.userId === pool.ownerId,
    joinedAt: m.joinedAt.toISOString(),
  }));

  return {
    id: pool.id,
    name: pool.name,
    type: pool.type as PoolType,
    capacity: pool.capacity,
    memberCount: members.length,
    inviteToken: pool.inviteToken,
    isOwner: pool.ownerId === userId,
    isArchived: own.archivedAt !== null,
    membersCanInvite: pool.membersCanInvite, // Unit 45: FR-REFINE-45.5
    members,
  };
});

interface ListPublicPoolsParams {
  query?: string;
  onlyWithCapacity?: boolean;
  page?: number;
}

/** Public pool directory (BL-8). Feeds the landing PoolPreview (PoolPreviewItem). */
export async function listPublicPools(
  params: ListPublicPoolsParams = {},
): Promise<PoolPreviewItem[]> {
  const { query, onlyWithCapacity = false, page = 0 } = params;

  const pools = await prisma.pool.findMany({
    where: {
      type: "PUBLIC",
      ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
    },
    include: { _count: { select: { memberships: true } } },
    orderBy: { createdAt: "desc" },
    skip: page * DIRECTORY_PAGE_SIZE,
    take: DIRECTORY_PAGE_SIZE,
  });

  return pools
    .map((p) => ({
      id: p.id,
      name: p.name,
      memberCount: p._count.memberships,
      capacity: p.capacity,
      isPublic: true,
    }))
    .filter((p) => !onlyWithCapacity || p.memberCount < p.capacity);
}

/** Fetches predictions for all pool members for matches that have started.
 *  Returns null if caller is not a pool member (defense-in-depth, BR-41.1).
 *  Visibility window: match.kickoffAt <= now (BR-41.2). */
export async function getPoolMemberPredictions(
  poolId: string,
): Promise<PoolMemberPrediction[] | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const membership = await prisma.poolMembership.findUnique({
    where: { poolId_userId: { poolId, userId } },
  });
  if (!membership) return null;

  const memberIds = (
    await prisma.poolMembership.findMany({
      where: { poolId },
      select: { userId: true },
    })
  ).map((m) => m.userId);

  const now = new Date();

  const rows = await prisma.prediction.findMany({
    where: {
      userId: { in: memberIds },
      match: { kickoffAt: { lte: now } },
    },
    include: {
      match: {
        include: {
          homeTeam: true,
          awayTeam: true,
          phase: true,
        },
      },
      user: { select: { nicknameBase: true, nicknameDiscriminator: true, avatarUrl: true } },
      score: { select: { totalPoints: true, matchedCase: true } },
    },
    orderBy: { match: { kickoffAt: "asc" } },
  });

  return rows.map((row) => ({
    matchId: row.matchId,
    matchNumber: row.match.matchNumber,
    kickoffAt: row.match.kickoffAt?.toISOString() ?? null,
    matchStatus: row.match.status,
    homeTeam: toTeamView(row.match.homeTeam),
    awayTeam: toTeamView(row.match.awayTeam),
    homePlaceholder: row.match.homePlaceholder,
    awayPlaceholder: row.match.awayPlaceholder,
    homeScore: row.match.homeScore,
    awayScore: row.match.awayScore,
    phaseName: row.match.phase.groupCode
      ? `Grupo ${row.match.phase.groupCode}`
      : row.match.phase.name,
    phaseType: row.match.phase.type,
    userId: row.userId,
    nickname: formatNickname(row.user.nicknameBase, row.user.nicknameDiscriminator),
    avatarUrl: row.user.avatarUrl,
    predictedHome: row.homeScore,
    predictedAway: row.awayScore,
    totalPoints: row.score?.totalPoints ?? null,
    matchedCase: row.score?.matchedCase ?? null,
  }));
}
