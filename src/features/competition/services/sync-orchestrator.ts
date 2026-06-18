import { emitMatchNotificationEvents } from "@/features/notifications/services/match-events";
import type { MatchStatus, ProviderSyncScope } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { NormalizedMatch } from "../schemas";
import { NormalizedMatchSchema, NormalizedTeamSchema } from "../schemas";
import type { CompetitionProvider, ProviderSyncWindow } from "./providers/types";
import { upsertTeam } from "./upsert-competition-data";

// Terminal states a match should never leave on its own. Football-data.org's
// live/unfiltered feed can lag and report a just-finished match as IN_PLAY,
// which would otherwise regress FINISHED → LIVE on the next sync.
const TERMINAL_STATUSES = new Set<MatchStatus>(["FINISHED", "CANCELLED"]);
const REGRESSION_STATUSES = new Set<MatchStatus>(["SCHEDULED", "LOCKED", "LIVE"]);

function isStatusRegression(
  current: MatchStatus | null | undefined,
  incoming: MatchStatus,
): boolean {
  return !!current && TERMINAL_STATUSES.has(current) && REGRESSION_STATUSES.has(incoming);
}

async function findActiveCompetition() {
  return prisma.competition.findFirst({
    where: { slug: "world-cup-2026" },
    select: { id: true },
  });
}

async function buildPhaseMap(competitionId: string): Promise<Map<string, string>> {
  const phases = await prisma.competitionPhase.findMany({
    where: { competitionId },
    select: { id: true, name: true },
  });
  return new Map(phases.map((p) => [p.name, p.id]));
}

async function syncMatchesToDB(
  matches: NormalizedMatch[],
  competitionId: string,
  phaseMap: Map<string, string>,
): Promise<number> {
  let count = 0;
  for (const match of matches) {
    if (!match.providerMatchId) continue;

    const [homeTeam, awayTeam] = await Promise.all([
      match.homeFifaCode
        ? prisma.team.findUnique({ where: { fifaCode: match.homeFifaCode } })
        : null,
      match.awayFifaCode
        ? prisma.team.findUnique({ where: { fifaCode: match.awayFifaCode } })
        : null,
    ]);

    const existing = await prisma.match.findFirst({
      where: { providerMatchId: match.providerMatchId },
      include: { homeTeam: true, awayTeam: true },
    });

    if (existing) {
      // Freeze status/score for matches the admin corrected manually — the
      // provider must never overwrite a manual override (even FINISHED →
      // FINISHED with a different score). Otherwise guard against provider lag
      // regressing a terminal match (e.g. the live feed still reporting a
      // finished match as IN_PLAY): keep the recorded status and score instead
      // of overwriting them with stale data.
      const frozen = existing.manualOverride || isStatusRegression(existing.status, match.status);
      const nextStatus = frozen ? existing.status : match.status;
      const nextHomeScore = frozen ? existing.homeScore : (match.homeScore ?? null);
      const nextAwayScore = frozen ? existing.awayScore : (match.awayScore ?? null);

      const saved = await prisma.match.update({
        where: { id: existing.id },
        data: {
          status: nextStatus,
          homeScore: nextHomeScore,
          awayScore: nextAwayScore,
          ...(match.kickoffAt !== null ? { kickoffAt: new Date(match.kickoffAt) } : {}),
          homeTeamId: homeTeam?.id ?? null,
          awayTeamId: awayTeam?.id ?? null,
          homePlaceholder: match.homePlaceholder ?? null,
          awayPlaceholder: match.awayPlaceholder ?? null,
        },
        include: { homeTeam: true, awayTeam: true },
      });
      try {
        await emitMatchNotificationEvents(existing, saved);
      } catch {
        // Notification outbox is best-effort and must not block match sync.
      }
      count++;
    } else if (match.status === "SCHEDULED" || match.status === "LIVE") {
      const phaseId = phaseMap.get(match.phaseName);
      if (!phaseId) {
        console.warn(
          `[sync] Phase "${match.phaseName}" not found for match ${match.providerMatchId} — skipping`,
        );
        continue;
      }
      await prisma.match.create({
        data: {
          competitionId,
          phaseId,
          providerMatchId: match.providerMatchId,
          matchNumber: null,
          status: match.status,
          kickoffAt: match.kickoffAt ? new Date(match.kickoffAt) : null,
          homeTeamId: homeTeam?.id ?? null,
          awayTeamId: awayTeam?.id ?? null,
          homePlaceholder: match.homePlaceholder ?? null,
          awayPlaceholder: match.awayPlaceholder ?? null,
          homeScore: match.homeScore ?? null,
          awayScore: match.awayScore ?? null,
        },
      });
      count++;
    }
  }
  return count;
}

export async function runCompetitionSync(
  provider: CompetitionProvider,
  scope: ProviderSyncScope,
  window: ProviderSyncWindow,
) {
  const run = await prisma.providerSyncRun.upsert({
    where: {
      provider_scope_windowKey: { provider: "FOOTBALL_DATA", scope, windowKey: window.windowKey },
    },
    update: { status: "STARTED", startedAt: new Date(), finishedAt: null, errorMessage: null },
    create: { provider: "FOOTBALL_DATA", scope, windowKey: window.windowKey, status: "STARTED" },
  });

  try {
    const payload = await provider.fetch(scope, window);
    const teams = payload.teams.map((team) => NormalizedTeamSchema.parse(team));
    const matches = payload.matches.map((match) => NormalizedMatchSchema.parse(match));

    for (const team of teams) {
      await upsertTeam(team);
    }

    const competition = await findActiveCompetition();
    let updatedCount = 0;
    if (competition) {
      const phaseMap = await buildPhaseMap(competition.id);
      updatedCount = await syncMatchesToDB(matches, competition.id, phaseMap);
    } else {
      console.warn("[sync] Active competition not found — match sync skipped");
    }

    await prisma.providerSyncRun.update({
      where: { id: run.id },
      data: {
        status: "SUCCESS",
        finishedAt: new Date(),
        itemsFetched: teams.length + matches.length,
        itemsUpdated: updatedCount,
        providerRequestId: payload.providerRequestId,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    await prisma.providerSyncRun.update({
      where: { id: run.id },
      data: {
        status: message.includes("RATE_LIMIT") ? "RATE_LIMITED" : "FAILED",
        finishedAt: new Date(),
        errorMessage: message.slice(0, 1000),
      },
    });
    throw error;
  }
}

export async function cleanupOldSyncRuns(now = new Date()) {
  const cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  return prisma.providerSyncRun.deleteMany({ where: { startedAt: { lt: cutoff } } });
}
