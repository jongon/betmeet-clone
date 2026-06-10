import { prisma } from "@/lib/prisma";

function getEnvCompetitionLockTime(): Date | null {
  const raw = process.env.WORLD_CUP_KICKOFF;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function getCompetitionLockTime(): Promise<Date | null> {
  const competition = await prisma.competition.findFirst({
    where: { isActive: true },
    select: { id: true, startsAt: true },
    orderBy: { createdAt: "desc" },
  });

  if (competition?.startsAt) return competition.startsAt;

  if (competition) {
    const firstMatch = await prisma.match.findFirst({
      where: { competitionId: competition.id, kickoffAt: { not: null } },
      select: { kickoffAt: true },
      orderBy: { kickoffAt: "asc" },
    });
    if (firstMatch?.kickoffAt) return firstMatch.kickoffAt;
  }

  return getEnvCompetitionLockTime();
}
