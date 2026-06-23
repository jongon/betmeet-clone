"use client";

import type { ReactNode } from "react";
import { useLiveResults } from "@/features/competition/hooks/use-live-results";

/**
 * Unit 62 — Thin client wrapper that mounts `useLiveResults` (Unit 58) so the
 * projected leaderboard refreshes in place when a broadcast `results-updated`
 * arrives from the cron/admin mutations. Used by `/rankings`, `/pools/[id]`
 * (the Clasificación tab — the grid on `Predicciones` already subscribes on its
 * own), and `/pools/[id]/leaderboard`.
 *
 * Degrades cleanly if Realtime isn't available (BR-58.6) — the hook is a no-op.
 * No new servers: the channel/transport already exists.
 */
export function LeaderboardLiveRefresh({ children }: { children: ReactNode }) {
  useLiveResults();
  return <>{children}</>;
}
