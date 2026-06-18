import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { profile: { findMany: vi.fn() } },
}));
vi.mock("../../services/session", () => ({ getCurrentUserId: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "../../services/session";
import type { SearchNicknameResult } from "../../types";
import { searchNicknames } from "../search-nicknames";

describe("searchNicknames (FR-REFINE-44.6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUserId).mockResolvedValue(null);
  });

  it("returns results for 2+ char query", async () => {
    vi.mocked(prisma.profile.findMany).mockResolvedValue([
      {
        id: "u1",
        nicknameBase: "Pepe",
        nicknameDiscriminator: "1234",
        avatarUrl: "/avatars/1.png",
      },
    ] as never);
    const result = await searchNicknames({ query: "Pe" });
    expect("error" in result).toBe(false);
    expect((result as SearchNicknameResult[]).length).toBe(1);
    expect((result as SearchNicknameResult[])[0].nicknameBase).toBe("Pepe");
  });

  it("rejects 1-char query", async () => {
    const result = await searchNicknames({ query: "P" });
    expect("error" in result).toBe(true);
    expect(prisma.profile.findMany).not.toHaveBeenCalled();
  });

  it("rejects query with #", async () => {
    const result = await searchNicknames({ query: "Pe#12" });
    expect("error" in result).toBe(true);
  });

  it("rejects query with @", async () => {
    const result = await searchNicknames({ query: "pe@pe" });
    expect("error" in result).toBe(true);
  });

  it("returns empty array for no matches", async () => {
    vi.mocked(prisma.profile.findMany).mockResolvedValue([] as never);
    const result = await searchNicknames({ query: "Xyz" });
    expect(result).toEqual([]);
  });

  it("excludes deleted profiles", async () => {
    vi.mocked(prisma.profile.findMany).mockResolvedValue([] as never);
    await searchNicknames({ query: "Pe" });
    expect(prisma.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ deletedAt: null }) }),
    );
  });

  it("uses case-insensitive startsWith", async () => {
    vi.mocked(prisma.profile.findMany).mockResolvedValue([] as never);
    await searchNicknames({ query: "pepe" });
    expect(prisma.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          nicknameBase: { startsWith: "pepe", mode: "insensitive" },
        }),
      }),
    );
  });

  it("caps at 8 results", async () => {
    vi.mocked(prisma.profile.findMany).mockResolvedValue([] as never);
    await searchNicknames({ query: "Pe" });
    expect(prisma.profile.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 8 }));
  });

  it("excludes the current user from results", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue("current-user");
    vi.mocked(prisma.profile.findMany).mockResolvedValue([] as never);
    await searchNicknames({ query: "Pe" });
    expect(prisma.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { not: "current-user" } }),
      }),
    );
  });
});
