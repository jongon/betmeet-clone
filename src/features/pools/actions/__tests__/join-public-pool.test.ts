import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: vi.fn() } }));
vi.mock("../../services/competition-lock", () => ({ isFrozen: vi.fn() }));
vi.mock("../../services/session", () => ({ getCurrentUserId: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { isFrozen } from "../../services/competition-lock";
import { getCurrentUserId } from "../../services/session";
import { joinPublicPool } from "../join-public-pool";

describe("joinPublicPool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUserId).mockResolvedValue("user-1");
    vi.mocked(isFrozen).mockResolvedValue(false);
  });

  it("returns success with poolId on a successful join (FR-REFINE-13.5)", async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue(undefined as never);
    const result = await joinPublicPool("pool-1");
    expect(result).toEqual({ success: true, poolId: "pool-1" });
  });

  it("returns alreadyMember (not error) when already a member (FR-REFINE-13.6)", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("ALREADY_MEMBER"));
    const result = await joinPublicPool("pool-1");
    expect(result).toEqual({ alreadyMember: true, poolId: "pool-1" });
    expect("error" in result).toBe(false);
  });

  it("returns an error when the pool is full", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("FULL"));
    const result = await joinPublicPool("pool-1");
    expect(result).toEqual({ error: "La liga está llena." });
  });

  it("returns an error when the pool is not found", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("NOT_FOUND"));
    const result = await joinPublicPool("pool-1");
    expect(result).toEqual({ error: "Liga no encontrada." });
  });

  it("requires authentication", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(null);
    const result = await joinPublicPool("pool-1");
    expect(result).toEqual({ error: "No autenticado" });
  });
});
