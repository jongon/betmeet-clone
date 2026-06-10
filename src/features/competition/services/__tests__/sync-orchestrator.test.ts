import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    providerSyncRun: { upsert: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    team: { upsert: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { cleanupOldSyncRuns, runCompetitionSync } from "../sync-orchestrator";

describe("sync orchestrator", () => {
  beforeEach(() => vi.clearAllMocks());

  it("validates and persists normalized teams", async () => {
    vi.mocked(prisma.providerSyncRun.upsert).mockResolvedValue({ id: "run-1" } as never);
    vi.mocked(prisma.team.upsert).mockResolvedValue({} as never);
    const provider = {
      fetch: vi.fn().mockResolvedValue({
        teams: [
          {
            name: "Canada",
            fifaCode: "CAN",
            isoAlpha2: "ca",
            flagKey: "ca",
            flagPath: "/flags/ca.svg",
            providerTeamId: null,
          },
        ],
        matches: [],
      }),
    };

    await runCompetitionSync(provider, "TEAMS", { windowKey: "test" });

    expect(prisma.team.upsert).toHaveBeenCalled();
    expect(prisma.providerSyncRun.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "SUCCESS" }) }),
    );
  });

  it("cleans up runs older than 90 days", async () => {
    await cleanupOldSyncRuns(new Date("2026-06-10T00:00:00Z"));
    expect(prisma.providerSyncRun.deleteMany).toHaveBeenCalled();
  });
});
