import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    pool: {
      findMany: vi.fn(),
    },
    poolMembership: {
      findMany: vi.fn(),
    },
  },
}));
vi.mock("../services/session", () => ({
  getCurrentUserId: vi.fn(),
  formatNickname: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { listPublicPools } from "../queries";
import { getCurrentUserId } from "../services/session";

const prismaMock = prisma as unknown as {
  pool: { findMany: ReturnType<typeof vi.fn> };
  poolMembership: { findMany: ReturnType<typeof vi.fn> };
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("listPublicPools — Unit 63 isMember annotation (FR-REFINE-63.1)", () => {
  it("annotates isMember=true for pools the user belongs to, false otherwise", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user-1");
    prismaMock.pool.findMany.mockResolvedValue([
      { id: "pool-a", name: "Liga A", capacity: 100, _count: { memberships: 10 } },
      { id: "pool-b", name: "Liga B", capacity: 100, _count: { memberships: 5 } },
      { id: "pool-c", name: "Liga C", capacity: 100, _count: { memberships: 1 } },
    ]);
    prismaMock.poolMembership.findMany.mockResolvedValue([{ poolId: "pool-b" }]);

    const result = await listPublicPools();

    expect(prismaMock.poolMembership.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1", poolId: { in: ["pool-a", "pool-b", "pool-c"] } },
      select: { poolId: true },
    });
    expect(result).toEqual([
      {
        id: "pool-a",
        name: "Liga A",
        memberCount: 10,
        capacity: 100,
        isPublic: true,
        isMember: false,
      },
      {
        id: "pool-b",
        name: "Liga B",
        memberCount: 5,
        capacity: 100,
        isPublic: true,
        isMember: true,
      },
      {
        id: "pool-c",
        name: "Liga C",
        memberCount: 1,
        capacity: 100,
        isPublic: true,
        isMember: false,
      },
    ]);
  });

  it("marks all pools isMember=false for an anonymous user (no membership lookup)", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(null);
    prismaMock.pool.findMany.mockResolvedValue([
      { id: "pool-a", name: "Liga A", capacity: 100, _count: { memberships: 10 } },
    ]);

    const result = await listPublicPools();

    expect(prismaMock.poolMembership.findMany).not.toHaveBeenCalled();
    expect(result).toEqual([
      {
        id: "pool-a",
        name: "Liga A",
        memberCount: 10,
        capacity: 100,
        isPublic: true,
        isMember: false,
      },
    ]);
  });

  it("skips the membership lookup when the directory is empty", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user-1");
    prismaMock.pool.findMany.mockResolvedValue([]);

    const result = await listPublicPools();

    expect(prismaMock.poolMembership.findMany).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it("respects onlyWithCapacity filter after isMember annotation", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue("user-1");
    prismaMock.pool.findMany.mockResolvedValue([
      { id: "pool-a", name: "Liga A", capacity: 10, _count: { memberships: 10 } },
      { id: "pool-b", name: "Liga B", capacity: 10, _count: { memberships: 5 } },
    ]);
    prismaMock.poolMembership.findMany.mockResolvedValue([{ poolId: "pool-a" }]);

    const result = await listPublicPools({ onlyWithCapacity: true });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("pool-b");
    expect(result[0].isMember).toBe(false);
  });
});
