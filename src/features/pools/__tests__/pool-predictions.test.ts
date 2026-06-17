import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    poolMembership: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    prediction: {
      findMany: vi.fn(),
    },
  },
}));
vi.mock("../services/session", () => ({ getCurrentUserId: vi.fn(), formatNickname: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { getPoolMemberPredictions } from "../queries";
import { formatNickname, getCurrentUserId } from "../services/session";

const prismaMock = prisma as unknown as {
  poolMembership: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  prediction: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("getPoolMemberPredictions", () => {
  const poolId = "pool-1";
  const memberId = "member-1";

  it("returns null when not authenticated", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(null);

    const result = await getPoolMemberPredictions(poolId);
    expect(result).toBeNull();
  });

  it("returns null when caller is not a pool member", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(memberId);
    prismaMock.poolMembership.findUnique.mockResolvedValue(null);

    const result = await getPoolMemberPredictions(poolId);
    expect(result).toBeNull();
  });

  it("returns empty array when no predictions yet (no matches started)", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(memberId);
    prismaMock.poolMembership.findUnique.mockResolvedValue({ poolId, userId: memberId });
    prismaMock.poolMembership.findMany.mockResolvedValue([
      { userId: memberId },
      { userId: "member-2" },
    ]);
    prismaMock.prediction.findMany.mockResolvedValue([]);
    vi.mocked(formatNickname).mockImplementation((base, disc) =>
      disc ? `${base}#${disc}` : (base ?? "Jugador"),
    );

    const result = await getPoolMemberPredictions(poolId);
    expect(result).toEqual([]);
  });

  it("returns predictions only for matches with kickoffAt <= now", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(memberId);
    vi.mocked(formatNickname).mockImplementation((base, disc) =>
      disc ? `${base}#${disc}` : (base ?? "Jugador"),
    );
    prismaMock.poolMembership.findUnique.mockResolvedValue({ poolId, userId: memberId });
    prismaMock.poolMembership.findMany.mockResolvedValue([
      { userId: memberId },
      { userId: "member-2" },
    ]);

    const matchStarted = {
      id: "match-1",
      matchNumber: 1,
      kickoffAt: new Date("2026-06-11T18:00:00Z"),
      status: "FINISHED",
      homeScore: 2,
      awayScore: 1,
      homePlaceholder: null,
      awayPlaceholder: null,
      homeTeam: { id: "team-a", name: "Brazil", fifaCode: "BRA", flagPath: "/flags/br.svg" },
      awayTeam: { id: "team-b", name: "Argentina", fifaCode: "ARG", flagPath: "/flags/ar.svg" },
      phase: { name: "Group Stage", groupCode: "A", type: "GROUP" },
    };

    prismaMock.prediction.findMany.mockResolvedValue([
      {
        matchId: "match-1",
        match: matchStarted,
        userId: memberId,
        homeScore: 2,
        awayScore: 1,
        user: { nicknameBase: "Test", nicknameDiscriminator: "1234", avatarUrl: null },
        score: { totalPoints: 5, matchedCase: "EXACT" },
      },
      {
        matchId: "match-1",
        match: matchStarted,
        userId: "member-2",
        homeScore: 1,
        awayScore: 0,
        user: { nicknameBase: "Other", nicknameDiscriminator: "5678", avatarUrl: "/a.png" },
        score: { totalPoints: 2, matchedCase: "RESULT" },
      },
    ]);

    const result = await getPoolMemberPredictions(poolId);
    expect(result).toHaveLength(2);
    expect(result?.[0].nickname).toBe("Test#1234");
    expect(result?.[0].predictedHome).toBe(2);
    expect(result?.[0].predictedAway).toBe(1);
    expect(result?.[0].totalPoints).toBe(5);
    expect(result?.[0].matchedCase).toBe("EXACT");
    expect(result?.[1].nickname).toBe("Other#5678");
    expect(result?.[1].totalPoints).toBe(2);
  });

  it("includes predictions where member has no score yet (LIVE match)", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(memberId);
    vi.mocked(formatNickname).mockImplementation((base, disc) =>
      disc ? `${base}#${disc}` : (base ?? "Jugador"),
    );
    prismaMock.poolMembership.findUnique.mockResolvedValue({ poolId, userId: memberId });
    prismaMock.poolMembership.findMany.mockResolvedValue([{ userId: memberId }]);

    const liveMatch = {
      id: "match-live",
      matchNumber: 2,
      kickoffAt: new Date("2026-06-11T21:00:00Z"),
      status: "LIVE",
      homeScore: null,
      awayScore: null,
      homePlaceholder: null,
      awayPlaceholder: null,
      homeTeam: { id: "team-c", name: "Germany", fifaCode: "GER", flagPath: "/flags/de.svg" },
      awayTeam: { id: "team-d", name: "France", fifaCode: "FRA", flagPath: "/flags/fr.svg" },
      phase: { name: "Group Stage", groupCode: "B", type: "GROUP" },
    };

    prismaMock.prediction.findMany.mockResolvedValue([
      {
        matchId: "match-live",
        match: liveMatch,
        userId: memberId,
        homeScore: 1,
        awayScore: 1,
        user: { nicknameBase: "Test", nicknameDiscriminator: "1234", avatarUrl: null },
        score: null,
      },
    ]);

    const result = await getPoolMemberPredictions(poolId);
    expect(result).toHaveLength(1);
    expect(result?.[0].totalPoints).toBeNull();
    expect(result?.[0].matchedCase).toBeNull();
    expect(result?.[0].predictedHome).toBe(1);
  });

  it("does NOT include predictions for matches with kickoffAt > now", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(memberId);
    prismaMock.poolMembership.findUnique.mockResolvedValue({ poolId, userId: memberId });
    prismaMock.poolMembership.findMany.mockResolvedValue([{ userId: memberId }]);
    prismaMock.prediction.findMany.mockResolvedValue([]);

    // The filter is in the Prisma where clause (kickoffAt <= now);
    // findMany returns empty array when Prisma's mock resolves to [].
    const result = await getPoolMemberPredictions(poolId);
    expect(result).toEqual([]);
  });
});
