import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/competition/services/providers/football-data", () => ({
  FootballDataProvider: vi.fn(function FootballDataProvider() {}),
}));
vi.mock("@/features/competition/services/sync-orchestrator", () => ({
  runCompetitionSync: vi.fn(),
}));
vi.mock("@/features/scoring-rankings/services/score-sweeper", () => ({
  scoreFinishedUnscoredMatches: vi.fn(),
}));
const { dispatchPendingNotifications } = vi.hoisted(() => ({
  dispatchPendingNotifications: vi.fn(),
}));
vi.mock("@/features/notifications/services/dispatcher", () => ({ dispatchPendingNotifications }));

vi.mock("@/lib/auth-logger", () => ({ logAuthEvent: vi.fn() }));
vi.mock("../../services/revalidate-result-views", () => ({ revalidateResultViews: vi.fn() }));
vi.mock("../../services/require-admin", () => ({ getAdminUserId: vi.fn() }));

import { runCompetitionSync } from "@/features/competition/services/sync-orchestrator";
import { scoreFinishedUnscoredMatches } from "@/features/scoring-rankings/services/score-sweeper";
import { getAdminUserId } from "../../services/require-admin";
import { revalidateResultViews } from "../../services/revalidate-result-views";
import { triggerSync } from "../trigger-sync";

describe("triggerSync (Unit 35)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAdminUserId).mockResolvedValue("admin-1");
    vi.mocked(runCompetitionSync).mockResolvedValue(undefined);
    vi.mocked(scoreFinishedUnscoredMatches).mockResolvedValue({ matches: 0 });
  });

  it("runs sync, scores finished matches, and revalidates result views", async () => {
    const result = await triggerSync("FULL");

    expect(result).toEqual({ success: true });
    expect(runCompetitionSync).toHaveBeenCalledWith(expect.anything(), "FULL", {
      windowKey: expect.stringMatching(/^manual-FULL-\d{4}-\d{2}-\d{2}$/),
    });
    expect(scoreFinishedUnscoredMatches).toHaveBeenCalled();
    expect(revalidateResultViews).toHaveBeenCalledWith({ adminDashboard: true });
  });

  it("rejects missing admin without revalidating", async () => {
    vi.mocked(getAdminUserId).mockResolvedValue(null);

    const result = await triggerSync("FULL");

    expect(result).toEqual({ error: "No autorizado" });
    expect(runCompetitionSync).not.toHaveBeenCalled();
    expect(revalidateResultViews).not.toHaveBeenCalled();
  });

  it("rejects invalid scope without revalidating", async () => {
    const result = await triggerSync("BAD" as never);

    expect(result).toEqual({ error: "Scope inválido" });
    expect(runCompetitionSync).not.toHaveBeenCalled();
    expect(revalidateResultViews).not.toHaveBeenCalled();
  });

  it("returns provider configuration errors without revalidating", async () => {
    vi.mocked(runCompetitionSync).mockRejectedValue(new Error("FOOTBALL_DATA_KEY_MISSING"));

    const result = await triggerSync("FULL");

    expect(result).toEqual({ error: "Falta configurar FOOTBALL_DATA_KEY para el proveedor." });
    expect(scoreFinishedUnscoredMatches).not.toHaveBeenCalled();
    expect(revalidateResultViews).not.toHaveBeenCalled();
  });

  it("returns generic provider errors without revalidating", async () => {
    vi.mocked(runCompetitionSync).mockRejectedValue(new Error("RATE_LIMIT"));

    const result = await triggerSync("FULL");

    expect(result).toEqual({ error: "La sincronización falló. Revisa los runs recientes." });
    expect(revalidateResultViews).not.toHaveBeenCalled();
  });

  it("dispatches pending notifications after successful sync and scoring", async () => {
    vi.mocked(dispatchPendingNotifications).mockResolvedValue({ sent: 3, failed: 0, skipped: 0 });

    const result = await triggerSync("FULL");

    expect(result).toEqual({ success: true });
    expect(dispatchPendingNotifications).toHaveBeenCalled();
  });

  it("returns success even when dispatch throws (best-effort)", async () => {
    vi.mocked(dispatchPendingNotifications).mockRejectedValue(new Error("VAPID keys missing"));

    const result = await triggerSync("FULL");

    expect(result).toEqual({ success: true });
    expect(dispatchPendingNotifications).toHaveBeenCalled();
    expect(revalidateResultViews).toHaveBeenCalledWith({ adminDashboard: true });
  });
});
