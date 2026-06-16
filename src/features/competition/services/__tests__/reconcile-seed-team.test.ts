import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    team: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    match: { updateMany: vi.fn() },
    prediction: { updateMany: vi.fn() },
    // Interactive transaction runs the callback against the same mocked client.
    $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(prisma)),
  },
}));

import { prisma } from "@/lib/prisma";
import { reconcileSeedTeam } from "../upsert-competition-data";

const uruguay = {
  name: "Uruguay",
  fifaCode: "URY",
  isoAlpha2: "uy",
  flagKey: "uy",
  flagPath: "/flags/uy.svg",
  providerTeamId: null,
} as const;

const canonicalData = {
  name: "Uruguay",
  fifaCode: "URY",
  isoAlpha2: "uy",
  flagKey: "uy",
  flagPath: "/flags/uy.svg",
  providerTeamId: null,
};

describe("reconcileSeedTeam", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates the team when none exists", async () => {
    vi.mocked(prisma.team.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.team.findMany).mockResolvedValue([] as never);

    await reconcileSeedTeam(uruguay);

    expect(prisma.team.create).toHaveBeenCalledWith({ data: canonicalData });
    expect(prisma.team.update).not.toHaveBeenCalled();
    expect(prisma.team.delete).not.toHaveBeenCalled();
  });

  it("corrects the fifaCode in place without creating a duplicate", async () => {
    // Existing row found by name (old URU code), nothing yet holds the new URY code.
    vi.mocked(prisma.team.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.team.findMany).mockResolvedValue([{ id: "uru-row" }] as never);

    await reconcileSeedTeam(uruguay);

    expect(prisma.team.create).not.toHaveBeenCalled();
    expect(prisma.team.delete).not.toHaveBeenCalled();
    expect(prisma.team.update).toHaveBeenCalledWith({
      where: { id: "uru-row" },
      data: canonicalData,
    });
  });

  it("merges a stale duplicate, re-pointing every FK before deleting the orphan", async () => {
    // A duplicate already exists: orphan URU row by name + canonical URY row by code.
    vi.mocked(prisma.team.findUnique).mockResolvedValue({ id: "ury-row" } as never);
    vi.mocked(prisma.team.findMany).mockResolvedValue([
      { id: "uru-row" },
      { id: "ury-row" },
    ] as never);

    await reconcileSeedTeam(uruguay);

    // All four incoming FKs re-pointed from the orphan to the canonical row.
    expect(prisma.match.updateMany).toHaveBeenCalledWith({
      where: { homeTeamId: "uru-row" },
      data: { homeTeamId: "ury-row" },
    });
    expect(prisma.match.updateMany).toHaveBeenCalledWith({
      where: { awayTeamId: "uru-row" },
      data: { awayTeamId: "ury-row" },
    });
    expect(prisma.match.updateMany).toHaveBeenCalledWith({
      where: { winnerTeamId: "uru-row" },
      data: { winnerTeamId: "ury-row" },
    });
    expect(prisma.prediction.updateMany).toHaveBeenCalledWith({
      where: { penaltyWinnerTeamId: "uru-row" },
      data: { penaltyWinnerTeamId: "ury-row" },
    });
    // Orphan deleted, canonical updated.
    expect(prisma.team.delete).toHaveBeenCalledWith({ where: { id: "uru-row" } });
    expect(prisma.team.update).toHaveBeenCalledWith({
      where: { id: "ury-row" },
      data: canonicalData,
    });
  });

  it("is a no-op update when the canonical row already matches (idempotent)", async () => {
    vi.mocked(prisma.team.findUnique).mockResolvedValue({ id: "ury-row" } as never);
    vi.mocked(prisma.team.findMany).mockResolvedValue([{ id: "ury-row" }] as never);

    await reconcileSeedTeam(uruguay);

    expect(prisma.team.delete).not.toHaveBeenCalled();
    expect(prisma.match.updateMany).not.toHaveBeenCalled();
    expect(prisma.prediction.updateMany).not.toHaveBeenCalled();
    expect(prisma.team.update).toHaveBeenCalledWith({
      where: { id: "ury-row" },
      data: canonicalData,
    });
  });
});
