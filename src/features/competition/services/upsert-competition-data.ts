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
    await reconcileSeedTeam(team);
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

/**
 * Upserts a team keyed by {@link NormalizedTeam.fifaCode}. Used by the **sync** path, where the
 * provider supplies its own names (which differ from our canonical structure names), so `fifaCode`
 * is the only reliable key. The structure seed uses {@link reconcileSeedTeam} instead.
 */
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

type CanonicalSeedTeam = (typeof WORLD_CUP_2026_TEAMS)[number];

/**
 * Reconciles a canonical structure team into the DB, keyed by `name` (the stable identity of our
 * hand-maintained list) so a `fifaCode` correction updates the row **in place** instead of creating a
 * duplicate. If a stale duplicate already exists (e.g. an old code row alongside the corrected one), it
 * is merged into the canonical row: every FK pointing at the orphan is re-pointed before deleting it, so
 * no match/prediction is lost and no FK is left dangling.
 *
 * Idempotent: running it repeatedly converges to a single row per team with the canonical attributes.
 * Used only by the structure seed — the sync keeps resolving provider teams by `fifaCode` via
 * {@link upsertTeam}.
 */
export async function reconcileSeedTeam(team: CanonicalSeedTeam) {
  const [byCode, byName] = await Promise.all([
    prisma.team.findUnique({ where: { fifaCode: team.fifaCode }, select: { id: true } }),
    prisma.team.findMany({ where: { name: team.name }, select: { id: true } }),
  ]);

  const canonicalId = byCode?.id ?? byName[0]?.id ?? null;

  const data = {
    name: team.name,
    fifaCode: team.fifaCode,
    isoAlpha2: team.isoAlpha2,
    flagKey: team.flagKey,
    flagPath: team.flagPath,
    providerTeamId: team.providerTeamId,
  };

  if (!canonicalId) {
    return prisma.team.create({ data });
  }

  // Collect every other row that represents this same team (same name, and/or the row that already
  // holds the target fifaCode) so they can be merged into the canonical one.
  const orphanIds = new Set<string>();
  for (const row of byName) {
    if (row.id !== canonicalId) orphanIds.add(row.id);
  }
  if (byCode && byCode.id !== canonicalId) orphanIds.add(byCode.id);

  return prisma.$transaction(async (tx) => {
    for (const orphanId of orphanIds) {
      await tx.match.updateMany({
        where: { homeTeamId: orphanId },
        data: { homeTeamId: canonicalId },
      });
      await tx.match.updateMany({
        where: { awayTeamId: orphanId },
        data: { awayTeamId: canonicalId },
      });
      await tx.match.updateMany({
        where: { winnerTeamId: orphanId },
        data: { winnerTeamId: canonicalId },
      });
      await tx.prediction.updateMany({
        where: { penaltyWinnerTeamId: orphanId },
        data: { penaltyWinnerTeamId: canonicalId },
      });
      await tx.team.delete({ where: { id: orphanId } });
    }
    return tx.team.update({ where: { id: canonicalId }, data });
  });
}
