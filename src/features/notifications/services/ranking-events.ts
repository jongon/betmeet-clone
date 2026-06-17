import { assignDensePositions } from "@/features/scoring-rankings/services/ranking";
import { prisma } from "@/lib/prisma";
import { queueNotificationEvents } from "./events";

export async function getGlobalRankSnapshot() {
  // Sum points in the DB (one aggregated groupBy) instead of fetching every
  // profile joined with all its prediction scores and reducing in JS. We still
  // include all non-deleted profiles (even those with zero points, which share
  // the last dense position) so rank positions match the previous behaviour.
  const [profiles, totalsByUser] = await Promise.all([
    prisma.profile.findMany({ where: { deletedAt: null }, select: { id: true } }),
    prisma.predictionScore.groupBy({ by: ["userId"], _sum: { totalPoints: true } }),
  ]);

  const totals = new Map(totalsByUser.map((t) => [t.userId, t._sum.totalPoints ?? 0]));

  const sorted = profiles
    .map((profile) => ({
      userId: profile.id,
      totalPoints: totals.get(profile.id) ?? 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints || a.userId.localeCompare(b.userId));

  return new Map(
    assignDensePositions(sorted).map((row) => [
      row.userId,
      { position: row.position, totalPoints: row.totalPoints },
    ]),
  );
}

export async function emitGlobalRankImprovedEvents(
  previous: Awaited<ReturnType<typeof getGlobalRankSnapshot>>,
  matchId: string,
) {
  const current = await getGlobalRankSnapshot();
  const events = [];

  for (const [userId, next] of current) {
    const before = previous.get(userId);
    if (!before || next.position >= before.position) continue;
    events.push({
      type: "GLOBAL_RANK_IMPROVED" as const,
      dedupeKey: `global-rank:${userId}:${matchId}:${next.position}`,
      recipientUserId: userId,
      payload: {
        title: "Subiste en el ranking global",
        body: `Ahora estás en la posición #${next.position}`,
        url: "/pools",
      },
    });
  }

  await queueNotificationEvents(events);
}
