import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/competition/services/providers/football-data", () => ({
  FootballDataProvider: vi.fn(function FootballDataProvider() {}),
}));
vi.mock("@/features/competition/services/sync-orchestrator", () => ({
  runCompetitionSync: vi.fn(),
  cleanupOldSyncRuns: vi.fn(),
}));
vi.mock("@/features/scoring-rankings/services/score-sweeper", () => ({
  scoreFinishedUnscoredMatches: vi.fn(),
}));
const { dispatchPendingNotifications } = vi.hoisted(() => ({
  dispatchPendingNotifications: vi.fn(),
}));
vi.mock("@/features/notifications/services/dispatcher", () => ({ dispatchPendingNotifications }));
vi.mock("@/lib/prisma", () => ({ prisma: { match: { count: vi.fn() } } }));

import {
  cleanupOldSyncRuns,
  runCompetitionSync,
} from "@/features/competition/services/sync-orchestrator";
import { dispatchPendingNotifications as dispatch } from "@/features/notifications/services/dispatcher";
import { scoreFinishedUnscoredMatches } from "@/features/scoring-rankings/services/score-sweeper";
import { prisma } from "@/lib/prisma";
import { hasActiveMatchWindow, runScheduledSync } from "../run-scheduled-sync";

describe("runScheduledSync (Unit 50)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(runCompetitionSync).mockResolvedValue(undefined);
    vi.mocked(scoreFinishedUnscoredMatches).mockResolvedValue({ matches: 0 });
    vi.mocked(cleanupOldSyncRuns).mockResolvedValue({ count: 0 } as never);
  });

  it("runs provider sync then scoring then dispatch for a provider scope", async () => {
    const result = await runScheduledSync("RESULTS");

    expect(result).toEqual({ ok: true });
    expect(runCompetitionSync).toHaveBeenCalledWith(expect.anything(), "RESULTS", {
      windowKey: expect.stringMatching(/^cron-RESULTS-\d{4}-\d{2}-\d{2}$/),
    });
    expect(scoreFinishedUnscoredMatches).toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalled();
    expect(cleanupOldSyncRuns).not.toHaveBeenCalled();
  });

  it("tags the window with the source (manual vs cron)", async () => {
    await runScheduledSync("FULL", { source: "manual" });

    expect(runCompetitionSync).toHaveBeenCalledWith(expect.anything(), "FULL", {
      windowKey: expect.stringMatching(/^manual-FULL-\d{4}-\d{2}-\d{2}$/),
    });
  });

  it("CLEANUP purges old runs without touching the provider", async () => {
    const result = await runScheduledSync("CLEANUP");

    expect(result).toEqual({ ok: true });
    expect(cleanupOldSyncRuns).toHaveBeenCalled();
    expect(runCompetitionSync).not.toHaveBeenCalled();
    expect(scoreFinishedUnscoredMatches).not.toHaveBeenCalled();
  });

  it("rejects scopes the scheduler may not run", async () => {
    const result = await runScheduledSync("TEAMS");

    expect(result).toEqual({ ok: false, error: "Scope inválido" });
    expect(runCompetitionSync).not.toHaveBeenCalled();
  });

  it("returns a config error when the provider key is missing", async () => {
    vi.mocked(runCompetitionSync).mockRejectedValue(new Error("FOOTBALL_DATA_KEY_MISSING"));

    const result = await runScheduledSync("LIVE_STATUS");

    expect(result).toEqual({
      ok: false,
      error: "Falta configurar FOOTBALL_DATA_KEY para el proveedor.",
    });
    expect(scoreFinishedUnscoredMatches).not.toHaveBeenCalled();
  });

  it("returns a generic error on other sync failures", async () => {
    vi.mocked(runCompetitionSync).mockRejectedValue(new Error("RATE_LIMIT"));

    const result = await runScheduledSync("LIVE_STATUS");

    expect(result).toEqual({
      ok: false,
      error: "La sincronización falló. Revisa los runs recientes.",
    });
  });

  it("stays ok when best-effort dispatch throws", async () => {
    vi.mocked(dispatch).mockRejectedValue(new Error("VAPID missing"));

    const result = await runScheduledSync("RESULTS");

    expect(result).toEqual({ ok: true });
  });
});

describe("hasActiveMatchWindow (Unit 50)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("is true when a match is live or imminent", async () => {
    vi.mocked(prisma.match.count).mockResolvedValue(2 as never);
    expect(await hasActiveMatchWindow()).toBe(true);
  });

  it("is false when nothing is live or imminent", async () => {
    vi.mocked(prisma.match.count).mockResolvedValue(0 as never);
    expect(await hasActiveMatchWindow()).toBe(false);
  });
});
