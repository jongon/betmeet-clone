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

// Default join date: well before any match below, so existing cases that don't
// care about membership scoping keep their totals unchanged (Unit 55).
const EPOCH = new Date("2020-01-01T00:00:00Z");

function member(userId: string, base: string, joinedAt: Date = EPOCH) {
  return {
    userId,
    joinedAt,
    user: { nicknameBase: base, nicknameDiscriminator: "0001", avatarUrl: "/a.png" },
  };
}

// Score row as selected by getPoolLeaderboardRows. `kickoff` defaults to a date
// after EPOCH so scores count for members who joined at EPOCH.
function score(
  userId: string,
  totalPoints: number,
  matchId: string,
  poolId: string | null,
  kickoff: Date = new Date("2026-06-11T18:00:00Z"),
) {
  return { userId, totalPoints, prediction: { poolId, matchId, match: { kickoffAt: kickoff } } };
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

describe("getPoolLeaderboard membership-scoped totals (Unit 55)", () => {
  const JOINED = new Date("2026-06-20T00:00:00Z");
  const BEFORE_JOIN = new Date("2026-06-15T18:00:00Z");
  const AFTER_JOIN = new Date("2026-06-21T18:00:00Z");

  beforeEach(() => {
    vi.clearAllMocks();
    membershipFindUnique().mockResolvedValue({ poolId: POOL, userId: "u1" } as never);
  });

  it("excludes scores for matches that kicked off before the member joined", async () => {
    membershipFindMany().mockResolvedValue([member("u1", "Ana", JOINED)] as never);
    scoreFindMany().mockResolvedValue([
      score("u1", 5, "m1", null, BEFORE_JOIN), // pre-join — must NOT count
      score("u1", 3, "m2", null, AFTER_JOIN), // post-join — counts
    ] as never);

    const rows = await getPoolLeaderboard(POOL, "u1");
    expect(rows?.find((r) => r.userId === "u1")?.totalPoints).toBe(3);
  });

  it("excludes a pool override for a match played before the member joined", async () => {
    membershipFindMany().mockResolvedValue([member("u1", "Ana", JOINED)] as never);
    scoreFindMany().mockResolvedValue([
      score("u1", 2, "m1", POOL, BEFORE_JOIN), // pre-join override — must NOT count
      score("u1", 5, "m1", null, BEFORE_JOIN), // its global, also pre-join — must NOT count
    ] as never);

    const rows = await getPoolLeaderboard(POOL, "u1");
    expect(rows?.find((r) => r.userId === "u1")?.totalPoints).toBe(0);
  });

  it("ranks two members by their membership-scoped points", async () => {
    membershipFindMany().mockResolvedValue([
      member("u1", "Ana", EPOCH), // joined at the start
      member("u2", "Beto", JOINED), // joined mid-tournament
    ] as never);
    scoreFindMany().mockResolvedValue([
      score("u1", 5, "m1", null, BEFORE_JOIN), // counts for Ana
      score("u1", 4, "m2", null, AFTER_JOIN), // counts for Ana
      score("u2", 9, "m1", null, BEFORE_JOIN), // pre-join for Beto — excluded
      score("u2", 2, "m2", null, AFTER_JOIN), // post-join for Beto — counts
    ] as never);

    const rows = await getPoolLeaderboard(POOL, "u1");
    expect(rows?.map((r) => [r.userId, r.totalPoints])).toEqual([
      ["u1", 9],
      ["u2", 2],
    ]);
    expect(rows?.map((r) => r.position)).toEqual([1, 2]);
  });
});
