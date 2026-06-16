import { prisma } from "@/lib/prisma";
import type { NormalizedTeam } from "../schemas";
import {
  WORLD_CUP_2026,
  WORLD_CUP_2026_PHASES,
  WORLD_CUP_2026_TEAMS,
} from "../seed/world-cup-2026";

export async function seedCompetitionStructure(): Promise<{
  competition: { id: string };
  phaseByName: Map<string, { id: string }>;
}> {
  const competition = await prisma.competition.upsert({
    where: { slug: WORLD_CUP_2026.slug },
    update: {
      name: WORLD_CUP_2026.name,
      season: WORLD_CUP_2026.season,
      startsAt: new Date(WORLD_CUP_2026.startsAt),
      endsAt: new Date(WORLD_CUP_2026.endsAt),
      timezone: WORLD_CUP_2026.timezone,
      provider: WORLD_CUP_2026.provider,
      providerCompetitionId: WORLD_CUP_2026.providerCompetitionId,
      isActive: WORLD_CUP_2026.isActive,
    },
    create: {
      slug: WORLD_CUP_2026.slug,
      name: WORLD_CUP_2026.name,
      season: WORLD_CUP_2026.season,
      startsAt: new Date(WORLD_CUP_2026.startsAt),
      endsAt: new Date(WORLD_CUP_2026.endsAt),
      timezone: WORLD_CUP_2026.timezone,
      provider: WORLD_CUP_2026.provider,
      providerCompetitionId: WORLD_CUP_2026.providerCompetitionId,
      isActive: WORLD_CUP_2026.isActive,
    },
    select: { id: true },
  });

  for (const team of WORLD_CUP_2026_TEAMS) {
    await upsertTeam(team);
  }

  const phaseByName = new Map<string, { id: string }>();
  for (const phase of WORLD_CUP_2026_PHASES) {
    const saved = await prisma.competitionPhase.upsert({
      where: {
        competitionId_displayOrder: {
          competitionId: competition.id,
          displayOrder: phase.displayOrder,
        },
      },
      update: {
        name: phase.name,
        type: phase.type,
        groupCode: phase.groupCode,
        providerPhaseId: phase.providerPhaseId,
      },
      create: {
        competitionId: competition.id,
        name: phase.name,
        type: phase.type,
        groupCode: phase.groupCode,
        displayOrder: phase.displayOrder,
        providerPhaseId: phase.providerPhaseId,
      },
      select: { id: true },
    });
    phaseByName.set(phase.name, saved);
  }

  return { competition, phaseByName };
}

export async function upsertTeam(team: NormalizedTeam | (typeof WORLD_CUP_2026_TEAMS)[number]) {
  return prisma.team.upsert({
    where: { fifaCode: team.fifaCode },
    update: {
      name: team.name,
      isoAlpha2: team.isoAlpha2,
      flagKey: team.flagKey,
      flagPath: team.flagPath,
      providerTeamId: team.providerTeamId,
    },
    create: {
      name: team.name,
      fifaCode: team.fifaCode,
      isoAlpha2: team.isoAlpha2,
      flagKey: team.flagKey,
      flagPath: team.flagPath,
      providerTeamId: team.providerTeamId,
    },
  });
}
