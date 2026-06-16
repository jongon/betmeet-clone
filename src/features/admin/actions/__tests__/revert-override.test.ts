import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { match: { findUnique: vi.fn(), update: vi.fn() } },
}));
vi.mock("@/features/scoring-rankings/services/score-match", () => ({ scoreMatch: vi.fn() }));
vi.mock("@/lib/auth-logger", () => ({ logAuthEvent: vi.fn() }));
vi.mock("../../services/require-admin", () => ({ getAdminUserId: vi.fn() }));

import { scoreMatch } from "@/features/scoring-rankings/services/score-match";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "../../services/require-admin";
import { revertMatchOverride } from "../revert-override";

describe("revertMatchOverride (FR-REFINE-31.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAdminUserId).mockResolvedValue("admin-1");
    vi.mocked(prisma.match.findUnique).mockResolvedValue({ id: "m-1" } as never);
    vi.mocked(prisma.match.update).mockResolvedValue({} as never);
    vi.mocked(scoreMatch).mockResolvedValue({ scored: 0 });
  });

  it("clears the manual result and resets status to SCHEDULED", async () => {
    const result = await revertMatchOverride("m-1");

    expect(result).toEqual({ success: true });
    expect(prisma.match.update).toHaveBeenCalledWith({
      where: { id: "m-1" },
      data: {
        homeScore: null,
        awayScore: null,
        homePenaltyScore: null,
        awayPenaltyScore: null,
        winnerTeamId: null,
        status: "SCHEDULED",
        manualOverride: false,
        manualOverrideReason: null,
        overriddenByUserId: null,
        overriddenAt: null,
      },
    });
  });

  it("re-scores the match so non-scoreable state removes user points", async () => {
    await revertMatchOverride("m-1");
    // scoreMatch deletes PredictionScore rows when the match is not scoreable (BR-6.7);
    // resetting to SCHEDULED + null scores makes it non-scoreable.
    expect(scoreMatch).toHaveBeenCalledWith("m-1");
  });

  it("rejects non-admin callers without touching the match", async () => {
    vi.mocked(getAdminUserId).mockResolvedValue(null);
    const result = await revertMatchOverride("m-1");
    expect(result).toEqual({ error: "No autorizado" });
    expect(prisma.match.update).not.toHaveBeenCalled();
    expect(scoreMatch).not.toHaveBeenCalled();
  });

  it("returns an error when the match does not exist", async () => {
    vi.mocked(prisma.match.findUnique).mockResolvedValue(null);
    const result = await revertMatchOverride("missing");
    expect(result).toEqual({ error: "Partido no encontrado" });
    expect(prisma.match.update).not.toHaveBeenCalled();
  });
});
