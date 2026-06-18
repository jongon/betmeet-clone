import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    match: { findUnique: vi.fn() },
    predictionScore: { deleteMany: vi.fn() },
    $executeRaw: vi.fn(() => Promise.resolve(0)),
  },
}));

import { prisma } from "@/lib/prisma";
import { scoreMatch } from "../score-match";

const baseMatch = {
  id: "m1",
  status: "FINISHED",
  homeScore: 2,
  awayScore: 1,
  homeTeamId: "H",
  awayTeamId: "A",
  winnerTeamId: "H",
  phase: { type: "GROUP" },
  predictions: [
    { id: "p1", userId: "u1", homeScore: 2, awayScore: 1, penaltyWinnerTeamId: null }, // exact → 5
    { id: "p2", userId: "u2", homeScore: 1, awayScore: 0, penaltyWinnerTeamId: null }, // result → 2
  ],
};

describe("scoreMatch (BL-2)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("bulk-upserts every prediction of a finished match in one atomic write", async () => {
    vi.mocked(prisma.match.findUnique).mockResolvedValue(baseMatch as never);

    const result = await scoreMatch("m1");

    expect(result.scored).toBe(2);
    // Single INSERT ... ON CONFLICT for the whole match (all-or-nothing).
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    expect(prisma.predictionScore.deleteMany).not.toHaveBeenCalled();
  });

  it("removes existing scores when the match is not scoreable (BR-6.7)", async () => {
    vi.mocked(prisma.match.findUnique).mockResolvedValue({
      ...baseMatch,
      status: "CANCELLED",
    } as never);

    const result = await scoreMatch("m1");

    expect(result.scored).toBe(0);
    expect(prisma.predictionScore.deleteMany).toHaveBeenCalledWith({ where: { matchId: "m1" } });
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it("returns 0 when the match does not exist", async () => {
    vi.mocked(prisma.match.findUnique).mockResolvedValue(null);
    expect((await scoreMatch("missing")).scored).toBe(0);
  });
});
