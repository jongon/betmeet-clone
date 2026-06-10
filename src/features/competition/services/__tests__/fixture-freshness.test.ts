import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    providerSyncRun: { findFirst: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { getFixtureFreshness } from "../fixture-freshness";

describe("getFixtureFreshness", () => {
  beforeEach(() => vi.clearAllMocks());

  it("reports no successful sync", async () => {
    vi.mocked(prisma.providerSyncRun.findFirst).mockResolvedValue(null);
    const result = await getFixtureFreshness(new Date("2026-06-11T19:10:00Z"));
    expect(result).toEqual({ isStale: false, lastSyncedAt: null, reason: "NO_SUCCESSFUL_SYNC" });
  });

  it("reports stale when live window is missed", async () => {
    vi.mocked(prisma.providerSyncRun.findFirst)
      .mockResolvedValueOnce({ finishedAt: new Date("2026-06-11T19:00:00Z") } as never)
      .mockResolvedValueOnce(null);
    const result = await getFixtureFreshness(new Date("2026-06-11T19:10:00Z"));
    expect(result.isStale).toBe(true);
    expect(result.reason).toBe("LIVE_WINDOW_MISSED");
  });
});
