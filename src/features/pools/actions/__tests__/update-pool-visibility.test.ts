import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth-logger", () => ({ logAuthEvent: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    pool: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
  },
}));
vi.mock("@/features/profile/queries", () => ({ getOnboardedUserId: vi.fn() }));

import { revalidatePath } from "next/cache";
import { getOnboardedUserId } from "@/features/profile/queries";
import { logAuthEvent } from "@/lib/auth-logger";
import { prisma } from "@/lib/prisma";
import { updatePoolVisibility } from "../update-pool-visibility";

const POOL_ID = "11111111-1111-4111-8111-111111111111";
const OWNER_ID = "owner-1";
const NON_OWNER_ID = "intruder-1";

describe("updatePoolVisibility (Unit 65, FR-REFINE-65.1, BR-65.1/65.2/65.3/65.4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOnboardedUserId).mockResolvedValue(OWNER_ID);
    vi.mocked(prisma.pool.findUnique).mockResolvedValue({
      id: POOL_ID,
      ownerId: OWNER_ID,
      name: "Liga del barrio",
      type: "PRIVATE",
    } as never);
    vi.mocked(prisma.pool.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.pool.update).mockResolvedValue({} as never);
  });

  it("owner can switch PRIVATE → PUBLIC and persists the type", async () => {
    const result = await updatePoolVisibility({ poolId: POOL_ID, type: "PUBLIC" });
    expect(result).toEqual({ success: true, type: "PUBLIC" });
    expect(prisma.pool.update).toHaveBeenCalledWith({
      where: { id: POOL_ID },
      data: { type: "PUBLIC" },
    });
  });

  it("owner can switch PUBLIC → PRIVATE without a uniqueness check", async () => {
    vi.mocked(prisma.pool.findUnique).mockResolvedValue({
      id: POOL_ID,
      ownerId: OWNER_ID,
      name: "Liga del barrio",
      type: "PUBLIC",
    } as never);
    const result = await updatePoolVisibility({ poolId: POOL_ID, type: "PRIVATE" });
    expect(result).toEqual({ success: true, type: "PRIVATE" });
    expect(prisma.pool.findFirst).not.toHaveBeenCalled();
    expect(prisma.pool.update).toHaveBeenCalledWith({
      where: { id: POOL_ID },
      data: { type: "PRIVATE" },
    });
  });

  it("rejects PRIVATE → PUBLIC when a public pool already uses the name", async () => {
    vi.mocked(prisma.pool.findFirst).mockResolvedValue({ id: "other" } as never);
    const result = await updatePoolVisibility({ poolId: POOL_ID, type: "PUBLIC" });
    expect(result).toEqual({ error: "Ya existe una liga pública con ese nombre" });
    expect(prisma.pool.update).not.toHaveBeenCalled();
  });

  it("is idempotent when the target type already matches (no update, no log)", async () => {
    const result = await updatePoolVisibility({ poolId: POOL_ID, type: "PRIVATE" });
    expect(result).toEqual({ success: true, type: "PRIVATE" });
    expect(prisma.pool.update).not.toHaveBeenCalled();
    expect(logAuthEvent).not.toHaveBeenCalled();
  });

  it("non-owner receives 'Solo el administrador puede cambiar esta configuración'", async () => {
    vi.mocked(getOnboardedUserId).mockResolvedValue(NON_OWNER_ID);
    const result = await updatePoolVisibility({ poolId: POOL_ID, type: "PUBLIC" });
    expect(result).toEqual({
      error: "Solo el administrador puede cambiar esta configuración",
    });
    expect(prisma.pool.update).not.toHaveBeenCalled();
  });

  it("returns 'Liga no encontrada' when pool does not exist", async () => {
    vi.mocked(prisma.pool.findUnique).mockResolvedValue(null as never);
    const result = await updatePoolVisibility({ poolId: POOL_ID, type: "PUBLIC" });
    expect(result).toEqual({ error: "Liga no encontrada" });
    expect(prisma.pool.update).not.toHaveBeenCalled();
  });

  it("returns onboarding error when user is not onboarded", async () => {
    vi.mocked(getOnboardedUserId).mockResolvedValue(null);
    const result = await updatePoolVisibility({ poolId: POOL_ID, type: "PUBLIC" });
    expect(result).toEqual({ error: "Completa tu perfil para cambiar la configuración." });
    expect(prisma.pool.findUnique).not.toHaveBeenCalled();
  });

  it("rejects an invalid type value", async () => {
    const result = await updatePoolVisibility({ poolId: POOL_ID, type: "SECRET" });
    expect("error" in result).toBe(true);
    expect(prisma.pool.findUnique).not.toHaveBeenCalled();
  });

  it("revalidates detail, list and directory and logs pool.settings_changed", async () => {
    await updatePoolVisibility({ poolId: POOL_ID, type: "PUBLIC" });
    expect(revalidatePath).toHaveBeenCalledWith(`/pools/${POOL_ID}`);
    expect(revalidatePath).toHaveBeenCalledWith("/pools");
    expect(revalidatePath).toHaveBeenCalledWith("/pools/discover");
    expect(logAuthEvent).toHaveBeenCalledWith(
      "pool.settings_changed",
      expect.objectContaining({ userId: OWNER_ID, poolId: POOL_ID, visibility: "PUBLIC" }),
    );
  });
});
