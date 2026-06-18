import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth-logger", () => ({ logAuthEvent: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    pool: { findUnique: vi.fn(), update: vi.fn() },
  },
}));
vi.mock("@/features/profile/queries", () => ({ getOnboardedUserId: vi.fn() }));

import { revalidatePath } from "next/cache";
import { getOnboardedUserId } from "@/features/profile/queries";
import { logAuthEvent } from "@/lib/auth-logger";
import { prisma } from "@/lib/prisma";
import { updatePoolMembersCanInvite } from "../update-pool-members-can-invite";

const POOL_ID = "11111111-1111-4111-8111-111111111111";
const OWNER_ID = "owner-1";
const NON_OWNER_ID = "intruder-1";

describe("updatePoolMembersCanInvite (Unit 45, FR-REFINE-45.4, BR-3.35, BR-45.4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOnboardedUserId).mockResolvedValue(OWNER_ID);
    vi.mocked(prisma.pool.findUnique).mockResolvedValue({
      id: POOL_ID,
      ownerId: OWNER_ID,
      type: "PRIVATE",
    } as never);
    vi.mocked(prisma.pool.update).mockResolvedValue({} as never);
  });

  it("owner can change true → false and persists the flag", async () => {
    const result = await updatePoolMembersCanInvite({ poolId: POOL_ID, membersCanInvite: false });
    expect(result).toEqual({ success: true, membersCanInvite: false });
    expect(prisma.pool.update).toHaveBeenCalledWith({
      where: { id: POOL_ID },
      data: { membersCanInvite: false },
    });
  });

  it("owner can change false → true and persists the flag", async () => {
    const result = await updatePoolMembersCanInvite({ poolId: POOL_ID, membersCanInvite: true });
    expect(result).toEqual({ success: true, membersCanInvite: true });
    expect(prisma.pool.update).toHaveBeenCalledWith({
      where: { id: POOL_ID },
      data: { membersCanInvite: true },
    });
  });

  it("non-owner receives 'Solo el administrador puede cambiar esta configuración'", async () => {
    vi.mocked(getOnboardedUserId).mockResolvedValue(NON_OWNER_ID);
    const result = await updatePoolMembersCanInvite({ poolId: POOL_ID, membersCanInvite: false });
    expect(result).toEqual({
      error: "Solo el administrador puede cambiar esta configuración",
    });
    expect(prisma.pool.update).not.toHaveBeenCalled();
  });

  it("returns 'Liga no encontrada' when pool does not exist", async () => {
    vi.mocked(prisma.pool.findUnique).mockResolvedValue(null as never);
    const result = await updatePoolMembersCanInvite({ poolId: POOL_ID, membersCanInvite: false });
    expect(result).toEqual({ error: "Liga no encontrada" });
    expect(prisma.pool.update).not.toHaveBeenCalled();
  });

  it("returns onboarding error when user is not onboarded", async () => {
    vi.mocked(getOnboardedUserId).mockResolvedValue(null);
    const result = await updatePoolMembersCanInvite({ poolId: POOL_ID, membersCanInvite: false });
    expect(result).toEqual({ error: "Completa tu perfil para cambiar la configuración." });
    expect(prisma.pool.findUnique).not.toHaveBeenCalled();
  });

  it("rejects non-UUID poolId", async () => {
    const result = await updatePoolMembersCanInvite({
      poolId: "not-a-uuid",
      membersCanInvite: false,
    });
    expect("error" in result).toBe(true);
    expect(prisma.pool.findUnique).not.toHaveBeenCalled();
  });

  it("rejects non-boolean membersCanInvite", async () => {
    const result = await updatePoolMembersCanInvite({ poolId: POOL_ID, membersCanInvite: "yes" });
    expect("error" in result).toBe(true);
    expect(prisma.pool.findUnique).not.toHaveBeenCalled();
  });

  it("calls revalidatePath('/pools/<id>') and logs pool.settings_changed", async () => {
    await updatePoolMembersCanInvite({ poolId: POOL_ID, membersCanInvite: false });
    expect(revalidatePath).toHaveBeenCalledWith(`/pools/${POOL_ID}`);
    expect(logAuthEvent).toHaveBeenCalledWith(
      "pool.settings_changed",
      expect.objectContaining({ userId: OWNER_ID, poolId: POOL_ID, membersCanInvite: false }),
    );
  });

  it("rejects the call for PUBLIC pools (the toggle only applies to PRIVATE)", async () => {
    vi.mocked(prisma.pool.findUnique).mockResolvedValue({
      id: POOL_ID,
      ownerId: OWNER_ID,
      type: "PUBLIC",
    } as never);
    const result = await updatePoolMembersCanInvite({ poolId: POOL_ID, membersCanInvite: false });
    expect(result).toEqual({
      error: "Esta configuración solo aplica a ligas privadas",
    });
    expect(prisma.pool.update).not.toHaveBeenCalled();
    expect(logAuthEvent).not.toHaveBeenCalled();
  });
});
