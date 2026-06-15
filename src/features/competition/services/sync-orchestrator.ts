import type { ProviderSyncScope } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { NormalizedMatchSchema, NormalizedTeamSchema } from "../schemas";
import type { CompetitionProvider, ProviderSyncWindow } from "./providers/types";
import { upsertTeam } from "./upsert-competition-data";

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

    await prisma.providerSyncRun.update({
      where: { id: run.id },
      data: {
        status: "SUCCESS",
        finishedAt: new Date(),
        itemsFetched: teams.length + matches.length,
        itemsUpdated: teams.length,
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
