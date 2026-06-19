import { dispatchPendingNotifications } from "@/features/notifications/services/dispatcher";
import { scoreFinishedUnscoredMatches } from "@/features/scoring-rankings/services/score-sweeper";
import type { ProviderSyncScope } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { FootballDataProvider } from "./providers/football-data";
import { cleanupOldSyncRuns, runCompetitionSync } from "./sync-orchestrator";

/**
 * Scopes that fetch from the provider (football-data.org). `CLEANUP` is handled
 * separately (no provider call) and `TEAMS` is not exposed to schedulers.
 */
export const SYNC_PROVIDER_SCOPES: ProviderSyncScope[] = [
  "FIXTURES",
  "LIVE_STATUS",
  "RESULTS",
  "FULL",
];

export type ScheduledSyncResult = { ok: boolean; error?: string };

type RunScheduledSyncOptions = {
  /** Tags the ProviderSyncRun window so manual vs. automated runs are distinguishable. */
  source?: "manual" | "cron";
};

/**
 * Shared orchestration behind both the admin "Sincronizar ahora" action and the
 * automated crons (Unit 50): provider sync → scoring sweeper → notification
 * dispatch. The terminal-status / manual-override guards (Unit 46) and the
 * ProviderSyncRun lock (Unit 4) live inside `runCompetitionSync`, so callers do
 * not reimplement them. Cache revalidation stays at the caller boundary
 * (Server Action / Route Handler).
 */
export async function runScheduledSync(
  scope: ProviderSyncScope,
  { source = "cron" }: RunScheduledSyncOptions = {},
): Promise<ScheduledSyncResult> {
  if (scope === "CLEANUP") {
    await cleanupOldSyncRuns(new Date());
    return { ok: true };
  }

  if (!SYNC_PROVIDER_SCOPES.includes(scope)) {
    return { ok: false, error: "Scope inválido" };
  }

  try {
    const provider = new FootballDataProvider();
    const windowKey = `${source}-${scope}-${new Date().toISOString().slice(0, 10)}`;
    await runCompetitionSync(provider, scope, { windowKey });
    await scoreFinishedUnscoredMatches();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "FOOTBALL_DATA_KEY_MISSING") {
      return { ok: false, error: "Falta configurar FOOTBALL_DATA_KEY para el proveedor." };
    }
    return { ok: false, error: "La sincronización falló. Revisa los runs recientes." };
  }

  // Best-effort: sync/scoring already succeeded, do not fail the run on dispatch.
  try {
    await dispatchPendingNotifications();
  } catch {
    // notification outbox dispatch is non-critical
  }

  return { ok: true };
}

const LIVE_WINDOW_MS = 3 * 60 * 60 * 1000;

/**
 * Whether there is a match worth polling for live status right now: a match
 * already LIVE/LOCKED, or one whose kickoff is within ±3h. Lets the LIVE_STATUS
 * cron skip the provider call (and its rate-limit quota) when nothing is on.
 */
export async function hasActiveMatchWindow(now = new Date()): Promise<boolean> {
  const count = await prisma.match.count({
    where: {
      OR: [
        { status: { in: ["LIVE", "LOCKED"] } },
        {
          kickoffAt: {
            gte: new Date(now.getTime() - LIVE_WINDOW_MS),
            lte: new Date(now.getTime() + LIVE_WINDOW_MS),
          },
        },
      ],
    },
  });
  return count > 0;
}
