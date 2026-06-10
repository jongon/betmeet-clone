import { prisma } from "@/lib/prisma";
import { isFrozen } from "./services/competition-lock";
import { formatNickname, getCurrentUserId } from "./services/session";
import type {
  MyPoolSummary,
  PoolDetail,
  PoolMemberSummary,
  PoolPreviewItem,
  PoolType,
} from "./types";

const DIRECTORY_PAGE_SIZE = 20;

/** Pools the current user belongs to (active + archived) — MyPoolsPage. */
export async function getMyPools(): Promise<MyPoolSummary[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const memberships = await prisma.poolMembership.findMany({
    where: { userId },
    include: { pool: { include: { _count: { select: { memberships: true } } } } },
    orderBy: { joinedAt: "desc" },
  });

  const frozen = await isFrozen();

  return memberships.map((m) => ({
    id: m.pool.id,
    name: m.pool.name,
    type: m.pool.type as PoolType,
    memberCount: m.pool._count.memberships,
    capacity: m.pool.capacity,
    isOwner: m.pool.ownerId === userId,
    isArchived: m.archivedAt !== null,
    isFrozen: frozen,
  }));
}

/** Full pool detail — only members may view it (BR-3.28). Returns null otherwise. */
export async function getPoolDetail(poolId: string): Promise<PoolDetail | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const pool = await prisma.pool.findUnique({
    where: { id: poolId },
    include: {
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
    isFrozen: await isFrozen(),
    isArchived: own.archivedAt !== null,
    members,
  };
}

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
