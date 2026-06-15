import type { ProviderSyncScope } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "./services/require-admin";
import type { AdminMatchRow, SyncRunRow, SyncStatusView } from "./types";

const RECENT_RUNS_LIMIT = 25;
const SYNC_SCOPES: ProviderSyncScope[] = [
  "TEAMS",
  "FIXTURES",
  "LIVE_STATUS",
  "RESULTS",
  "FULL",
  "CLEANUP",
];

function toRunRow(run: {
  id: string;
  scope: ProviderSyncScope;
  status: SyncRunRow["status"];
  startedAt: Date;
  finishedAt: Date | null;
  itemsFetched: number;
  itemsUpdated: number;
  errorMessage: string | null;
}): SyncRunRow {
  return {
    id: run.id,
    scope: run.scope,
    status: run.status,
    startedAt: run.startedAt.toISOString(),
    finishedAt: run.finishedAt?.toISOString() ?? null,
    itemsFetched: run.itemsFetched,
    itemsUpdated: run.itemsUpdated,
    errorMessage: run.errorMessage,
  };
}

/** Sync dashboard read model (BL-4, US-6.1). Returns null for non-admins. */
export async function getSyncDashboard(): Promise<SyncStatusView | null> {
  if (!(await getAdminUserId())) return null;

  const [recent, allSuccesses] = await Promise.all([
    prisma.providerSyncRun.findMany({ orderBy: { startedAt: "desc" }, take: RECENT_RUNS_LIMIT }),
    prisma.providerSyncRun.findMany({
      where: { scope: { in: SYNC_SCOPES }, status: "SUCCESS" },
      orderBy: { finishedAt: "desc" },
    }),
  ]);

  // Keep only the most recent SUCCESS per scope (replaces N+1 sequential queries).
  const latestByScope = new Map<string, (typeof allSuccesses)[number]>();
  for (const run of allSuccesses) {
    if (!latestByScope.has(run.scope)) {
      latestByScope.set(run.scope, run);
    }
  }

  return {
    lastSuccessByScope: SYNC_SCOPES.map((scope) => {
      const run = latestByScope.get(scope);
      return {
        scope,
        finishedAt: run?.finishedAt?.toISOString() ?? null,
        itemsUpdated: run?.itemsUpdated ?? 0,
      };
    }).filter((s) => s.finishedAt !== null),
    recentRuns: recent.map(toRunRow),
  };
}

/** Matches of the active competition for the override UI (BL-6). Null for non-admins. */
export async function getAdminMatches(): Promise<AdminMatchRow[] | null> {
  if (!(await getAdminUserId())) return null;

  const matches = await prisma.match.findMany({
    where: { competition: { isActive: true } },
    include: { homeTeam: true, awayTeam: true, phase: true },
    orderBy: [{ kickoffAt: "asc" }, { matchNumber: "asc" }],
  });

  return matches.map((m) => ({
    id: m.id,
    label: `${m.homeTeam?.name ?? m.homePlaceholder ?? "?"} vs ${m.awayTeam?.name ?? m.awayPlaceholder ?? "?"}`,
    phaseType: m.phase.type,
    status: m.status,
    homeTeamId: m.homeTeamId,
    awayTeamId: m.awayTeamId,
    homeTeamName: m.homeTeam?.name ?? null,
    awayTeamName: m.awayTeam?.name ?? null,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    isOverridden: m.manualOverride,
    overriddenAt: m.overriddenAt?.toISOString() ?? null,
    kickoffAt: m.kickoffAt?.toISOString() ?? null,
  }));
}
