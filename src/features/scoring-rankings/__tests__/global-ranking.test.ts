import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    predictionScore: { groupBy: vi.fn() },
    profile: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { getGlobalRanking } from "../queries";

const groupBy = () => vi.mocked(prisma.predictionScore.groupBy);
const findMany = () => vi.mocked(prisma.profile.findMany);

function profile(id: string, base: string, avatarUrl = "/a.png") {
  return { id, nicknameBase: base, nicknameDiscriminator: "0001", avatarUrl };
}

describe("getGlobalRanking", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty when no one has scored", async () => {
    groupBy().mockResolvedValue([] as never);
    expect(await getGlobalRanking("viewer")).toEqual([]);
    expect(findMany()).not.toHaveBeenCalled();
  });

  it("only requests verified, non-deleted users with at least one score", async () => {
    groupBy().mockResolvedValue([
      { userId: "u1", _sum: { totalPoints: 10 } },
      { userId: "u2", _sum: { totalPoints: 7 } },
    ] as never);
    findMany().mockResolvedValue([profile("u1", "Ana"), profile("u2", "Beto")] as never);

    await getGlobalRanking("u1");

    expect(findMany()).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ["u1", "u2"] },
          verificationStatus: { not: "UNVERIFIED" },
          deletedAt: null,
        }),
        // Only safe fields — no email / private data (FR-REFINE-14.3).
        select: { id: true, nicknameBase: true, nicknameDiscriminator: true, avatarUrl: true },
      }),
    );
  });

  it("orders by points desc and marks the viewer", async () => {
    groupBy().mockResolvedValue([
      { userId: "u1", _sum: { totalPoints: 5 } },
      { userId: "u2", _sum: { totalPoints: 12 } },
    ] as never);
    findMany().mockResolvedValue([profile("u1", "Ana"), profile("u2", "Beto")] as never);

    const rows = await getGlobalRanking("u1");
    expect(rows.map((r) => r.userId)).toEqual(["u2", "u1"]);
    expect(rows.map((r) => r.position)).toEqual([1, 2]);
    expect(rows.find((r) => r.userId === "u1")?.isViewer).toBe(true);
  });

  it("breaks ties deterministically by nickname and shares the dense position", async () => {
    groupBy().mockResolvedValue([
      { userId: "u1", _sum: { totalPoints: 8 } },
      { userId: "u2", _sum: { totalPoints: 8 } },
      { userId: "u3", _sum: { totalPoints: 3 } },
    ] as never);
    findMany().mockResolvedValue([
      profile("u2", "Zoe"),
      profile("u1", "Ana"),
      profile("u3", "Bob"),
    ] as never);

    const rows = await getGlobalRanking(null);
    // Ana before Zoe (tie broken by nickname), both at position 1; Bob at 2.
    expect(rows.map((r) => r.nickname)).toEqual(["Ana#0001", "Zoe#0001", "Bob#0001"]);
    expect(rows.map((r) => r.position)).toEqual([1, 1, 2]);
    expect(rows[0]?.isTied).toBe(true);
  });
});
