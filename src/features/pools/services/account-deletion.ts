import { prisma } from "@/lib/prisma";
import type { OwnedPoolTransfer } from "../types";
import { formatNickname } from "./session";

/**
 * Pools owned by `userId` and the candidates to receive ownership on account
 * deletion (BL-9). Candidates are other members ordered oldest → newest (F2).
 * An empty `candidates` list means the pool will be deleted (F3).
 */
export async function getOwnedPoolsNeedingTransfer(userId: string): Promise<OwnedPoolTransfer[]> {
  const pools = await prisma.pool.findMany({
    where: { ownerId: userId },
    include: { memberships: { include: { user: true }, orderBy: { joinedAt: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  return pools.map((pool) => ({
    poolId: pool.id,
    poolName: pool.name,
    candidates: pool.memberships
      .filter((m) => m.userId !== userId)
      .map((m) => ({
        userId: m.userId,
        nickname: formatNickname(m.user.nicknameBase, m.user.nicknameDiscriminator),
      })),
  }));
}

/**
 * Transfers ownership of the user's pools (or deletes sole-member pools) and
 * removes the user's remaining memberships, as part of account deletion
 * (BR-3.22..3.25). Runs in a single transaction.
 */
export async function transferOwnedPoolsForAccountDeletion(
  userId: string,
  assignments: { poolId: string; newOwnerId: string }[],
): Promise<{ error?: string }> {
  const owned = await getOwnedPoolsNeedingTransfer(userId);
  const assignmentMap = new Map(assignments.map((a) => [a.poolId, a.newOwnerId]));

  try {
    await prisma.$transaction(async (tx) => {
      for (const pool of owned) {
        if (pool.candidates.length === 0) {
          await tx.pool.delete({ where: { id: pool.poolId } }); // F3
          continue;
        }
        const newOwnerId = assignmentMap.get(pool.poolId);
        if (!newOwnerId || !pool.candidates.some((c) => c.userId === newOwnerId)) {
          throw new Error(`MISSING_ASSIGNMENT:${pool.poolId}`);
        }
        await tx.pool.update({ where: { id: pool.poolId }, data: { ownerId: newOwnerId } }); // BR-3.23
        await tx.poolMembership.deleteMany({ where: { poolId: pool.poolId, userId } });
      }
      // Remove the user's remaining (non-owner) memberships (BR-3.22).
      await tx.poolMembership.deleteMany({ where: { userId } });
    });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("MISSING_ASSIGNMENT")) {
      return { error: "Elige un nuevo administrador para cada liga antes de eliminar la cuenta." };
    }
    return { error: "No se pudo transferir la propiedad de las ligas." };
  }

  return {};
}
