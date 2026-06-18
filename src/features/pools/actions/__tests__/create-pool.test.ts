import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("REDIRECT");
  }),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    pool: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    poolMembership: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/features/profile/queries", () => ({ getOnboardedUserId: vi.fn() }));
vi.mock("../../services/invite-token", () => ({
  generateUniqueInviteToken: vi.fn().mockResolvedValue("INVITE123"),
}));

import { redirect } from "next/navigation";
import { getOnboardedUserId } from "@/features/profile/queries";
import { prisma } from "@/lib/prisma";
import { createPool } from "../create-pool";

const USER_ID = "user-1";
const POOL_ID = "11111111-1111-4111-8111-111111111111";

describe("createPool (Unit 45, FR-REFINE-45.1, BR-3.36, BR-45.3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOnboardedUserId).mockResolvedValue(USER_ID);
    vi.mocked(prisma.pool.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      // simulate a successful transaction that creates the pool
      const tx = {
        pool: {
          create: vi.fn().mockResolvedValue({ id: POOL_ID }),
        },
        poolMembership: { create: vi.fn().mockResolvedValue({}) },
      };
      return fn(tx as never);
    });
  });

  it("creates a PRIVATE pool with membersCanInvite: false and persists the flag", async () => {
    const txCreate = vi.fn().mockResolvedValue({ id: POOL_ID });
    const txMembership = vi.fn();
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      return fn({ pool: { create: txCreate }, poolMembership: { create: txMembership } } as never);
    });

    await expect(
      createPool({ name: "My league", type: "PRIVATE", capacity: 10, membersCanInvite: false }),
    ).rejects.toThrow("REDIRECT");
    expect(txCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ membersCanInvite: false }) }),
    );
  });

  it("creates a PRIVATE pool with default membersCanInvite: true when not provided", async () => {
    const txCreate = vi.fn().mockResolvedValue({ id: POOL_ID });
    const txMembership = vi.fn();
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      return fn({ pool: { create: txCreate }, poolMembership: { create: txMembership } } as never);
    });

    await expect(createPool({ name: "My league", type: "PRIVATE", capacity: 10 })).rejects.toThrow(
      "REDIRECT",
    );
    expect(txCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ membersCanInvite: true }) }),
    );
  });

  it("creates a PUBLIC pool — form gates the flag, server persists whatever it receives", async () => {
    const txCreate = vi.fn().mockResolvedValue({ id: POOL_ID });
    const txMembership = vi.fn();
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => {
      return fn({ pool: { create: txCreate }, poolMembership: { create: txMembership } } as never);
    });

    // CreatePoolForm hides the Switch for PUBLIC and resets to true. The server
    // just persists whatever the form sends (the form is the only client-side gate;
    // the DB column default is true for new pools).
    await expect(
      createPool({ name: "Public league", type: "PUBLIC", capacity: 20, membersCanInvite: true }),
    ).rejects.toThrow("REDIRECT");
    expect(txCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ membersCanInvite: true }) }),
    );
  });

  it("returns onboarding error when user is not onboarded", async () => {
    vi.mocked(getOnboardedUserId).mockResolvedValue(null);
    const result = await createPool({ name: "Valid name", type: "PRIVATE", capacity: 5 });
    expect(result).toEqual({ error: "Completa tu perfil para crear una liga." });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("does not redirect and returns an error on transaction failure", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error("DB down"));
    const result = await createPool({ name: "Valid name", type: "PRIVATE", capacity: 5 });
    expect(result).toEqual({ error: "No se pudo crear la liga. Inténtalo de nuevo." });
    // redirect should NOT have been called
    expect(redirect).not.toHaveBeenCalled();
  });

  // Reference: redirect is mocked to throw, so a successful create should propagate that throw.
  it("redirects to /pools/<id> on success", async () => {
    await expect(createPool({ name: "Valid name", type: "PRIVATE", capacity: 5 })).rejects.toThrow(
      "REDIRECT",
    );
    expect(redirect).toHaveBeenCalledWith(`/pools/${POOL_ID}`);
  });
});
