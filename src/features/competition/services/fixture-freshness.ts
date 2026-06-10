import { prisma } from "@/lib/prisma";
import type { FixtureFreshness } from "../types";

const LIVE_STALE_MS = 5 * 60 * 1000;

export async function getFixtureFreshness(now = new Date()): Promise<FixtureFreshness> {
  const [latestSuccess, latestRateLimit] = await Promise.all([
    prisma.providerSyncRun.findFirst({
      where: { scope: { in: ["LIVE_STATUS", "RESULTS", "FIXTURES", "FULL"] }, status: "SUCCESS" },
      orderBy: { finishedAt: "desc" },
    }),
    prisma.providerSyncRun.findFirst({
      where: { status: "RATE_LIMITED" },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  if (!latestSuccess?.finishedAt) {
    return {
      isStale: latestRateLimit !== null,
      lastSyncedAt: null,
      reason: latestRateLimit ? "RATE_LIMITED" : "NO_SUCCESSFUL_SYNC",
    };
  }

  const age = now.getTime() - latestSuccess.finishedAt.getTime();
  return {
    isStale: age > LIVE_STALE_MS,
    lastSyncedAt: latestSuccess.finishedAt.toISOString(),
    reason: age > LIVE_STALE_MS ? "LIVE_WINDOW_MISSED" : null,
  };
}
