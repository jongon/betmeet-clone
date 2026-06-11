import { assignDensePositions } from "@/features/scoring-rankings/services/ranking";
import { prisma } from "@/lib/prisma";
import { queueNotificationEvents } from "./events";

export async function getGlobalRankSnapshot() {
  const rows = await prisma.profile.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      predictionScores: { select: { totalPoints: true } },
    },
  });

  const sorted = rows
    .map((row) => ({
      userId: row.id,
      totalPoints: row.predictionScores.reduce((sum, score) => sum + score.totalPoints, 0),
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
