import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    poolMembership: { findMany: vi.fn(), findUnique: vi.fn() },
    predictionScore: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { getPoolLeaderboard } from "../queries";

const membershipFindMany = () => vi.mocked(prisma.poolMembership.findMany);
const membershipFindUnique = () => vi.mocked(prisma.poolMembership.findUnique);
const scoreFindMany = () => vi.mocked(prisma.predictionScore.findMany);

function member(userId: string, base: string) {
  return {
    userId,
    user: { nicknameBase: base, nicknameDiscriminator: "0001", avatarUrl: "/a.png" },
  };
}

// Score row as selected by getPoolLeaderboardRows.
function score(userId: string, totalPoints: number, matchId: string, poolId: string | null) {
  return { userId, totalPoints, prediction: { poolId, matchId } };
}

const POOL = "pool-1";

describe("getPoolLeaderboard override resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Viewer is a member so the wrapper does not short-circuit.
    membershipFindUnique().mockResolvedValue({ poolId: POOL, userId: "u1" } as never);
  });

  it("prefers the pool override over the global score for the same match", async () => {
    membershipFindMany().mockResolvedValue([member("u1", "Ana")] as never);
    scoreFindMany().mockResolvedValue([
      score("u1", 5, "m1", null), // global for m1 — must be ignored
      score("u1", 2, "m1", POOL), // pool override for m1 — counts
      score("u1", 5, "m2", null), // global for m2 — counts (no override)
    ] as never);

    const rows = await getPoolLeaderboard(POOL, "u1");
    expect(rows?.find((r) => r.userId === "u1")?.totalPoints).toBe(7); // 2 + 5, not 5 + 2 + 5
  });

  it("falls back to the global score when there is no override", async () => {
    membershipFindMany().mockResolvedValue([member("u1", "Ana")] as never);
    scoreFindMany().mockResolvedValue([
      score("u1", 5, "m1", null),
      score("u1", 3, "m2", null),
    ] as never);

    const rows = await getPoolLeaderboard(POOL, "u1");
    expect(rows?.find((r) => r.userId === "u1")?.totalPoints).toBe(8);
  });

  it("ranks members by resolved points and marks the viewer", async () => {
    membershipFindMany().mockResolvedValue([member("u1", "Ana"), member("u2", "Beto")] as never);
    scoreFindMany().mockResolvedValue([
      score("u1", 5, "m1", null),
      score("u2", 2, "m1", POOL),
      score("u2", 5, "m1", null), // overridden, ignored
    ] as never);

    const rows = await getPoolLeaderboard(POOL, "u1");
    expect(rows?.map((r) => r.userId)).toEqual(["u1", "u2"]); // 5 vs 2
    expect(rows?.map((r) => r.position)).toEqual([1, 2]);
    expect(rows?.find((r) => r.userId === "u1")?.isViewer).toBe(true);
  });

  it("returns null when the viewer is not a member", async () => {
    membershipFindUnique().mockResolvedValue(null);
    expect(await getPoolLeaderboard(POOL, "stranger")).toBeNull();
  });
});
