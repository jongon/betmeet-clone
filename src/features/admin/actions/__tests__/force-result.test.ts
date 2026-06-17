import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { match: { findUnique: vi.fn(), update: vi.fn() } },
}));
vi.mock("@/features/scoring-rankings/services/score-match", () => ({ scoreMatch: vi.fn() }));
vi.mock("@/lib/auth-logger", () => ({ logAuthEvent: vi.fn() }));
vi.mock("../../services/revalidate-result-views", () => ({ revalidateResultViews: vi.fn() }));
vi.mock("../../services/require-admin", () => ({ getAdminUserId: vi.fn() }));

import { scoreMatch } from "@/features/scoring-rankings/services/score-match";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "../../services/require-admin";
import { revalidateResultViews } from "../../services/revalidate-result-views";
import { forceMatchResult } from "../force-result";

const homeTeamId = "11111111-1111-4111-8111-111111111111";
const awayTeamId = "22222222-2222-4222-8222-222222222222";

function validInput(overrides: Record<string, unknown> = {}) {
  return { homeScore: 2, awayScore: 1, reason: "Correccion manual", ...overrides };
}

describe("forceMatchResult (Unit 35)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAdminUserId).mockResolvedValue("admin-1");
    vi.mocked(prisma.match.findUnique).mockResolvedValue({
      id: "m-1",
      phase: { type: "GROUP" },
      homeTeamId,
      awayTeamId,
    } as never);
    vi.mocked(prisma.match.update).mockResolvedValue({} as never);
    vi.mocked(scoreMatch).mockResolvedValue({ scored: 0 });
  });

  it("forces the result, scores the match, and revalidates result views", async () => {
    const result = await forceMatchResult("m-1", validInput());

    expect(result).toEqual({ success: true });
    expect(prisma.match.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "m-1" },
        data: expect.objectContaining({
          homeScore: 2,
          awayScore: 1,
          winnerTeamId: homeTeamId,
          status: "FINISHED",
          manualOverride: true,
        }),
      }),
    );
    expect(scoreMatch).toHaveBeenCalledWith("m-1");
    expect(revalidateResultViews).toHaveBeenCalledWith({ adminMatches: true });
  });

  it("rejects non-admin callers without revalidating", async () => {
    vi.mocked(getAdminUserId).mockResolvedValue(null);

    const result = await forceMatchResult("m-1", validInput());

    expect(result).toEqual({ error: "No autorizado" });
    expect(prisma.match.update).not.toHaveBeenCalled();
    expect(scoreMatch).not.toHaveBeenCalled();
    expect(revalidateResultViews).not.toHaveBeenCalled();
  });

  it("rejects invalid input without revalidating", async () => {
    const result = await forceMatchResult("m-1", { homeScore: 1, awayScore: 0, reason: "" });

    expect(result).toEqual({ error: "El motivo es obligatorio" });
    expect(prisma.match.update).not.toHaveBeenCalled();
    expect(revalidateResultViews).not.toHaveBeenCalled();
  });

  it("rejects unresolved matches without revalidating", async () => {
    vi.mocked(prisma.match.findUnique).mockResolvedValue({
      id: "m-1",
      phase: { type: "GROUP" },
      homeTeamId: null,
      awayTeamId,
    } as never);

    const result = await forceMatchResult("m-1", validInput());

    expect(result).toEqual({ error: "El partido no tiene equipos definidos." });
    expect(prisma.match.update).not.toHaveBeenCalled();
    expect(revalidateResultViews).not.toHaveBeenCalled();
  });
});
