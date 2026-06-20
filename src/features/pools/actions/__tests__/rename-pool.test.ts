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
import { renamePool } from "../rename-pool";

const POOL_ID = "11111111-1111-4111-8111-111111111111";
const OWNER_ID = "owner-1";
const NON_OWNER_ID = "intruder-1";

/** Helper: make `findUnique` resolve a pool with the given type. */
function mockPool(type: "PUBLIC" | "PRIVATE") {
  vi.mocked(prisma.pool.findUnique).mockResolvedValue({
    id: POOL_ID,
    ownerId: OWNER_ID,
    name: "Liga Vieja",
    type,
  } as never);
}

describe("renamePool (Unit 54, FR-REFINE-54.1, BR-54.1/BR-54.2/BR-54.3/BR-54.6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOnboardedUserId).mockResolvedValue(OWNER_ID);
    mockPool("PRIVATE");
    vi.mocked(prisma.pool.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.pool.update).mockResolvedValue({} as never);
  });

  it("owner renames the pool and persists the trimmed name", async () => {
    const result = await renamePool({ poolId: POOL_ID, name: "  Liga Nueva  " });
    expect(result).toEqual({ success: true, name: "Liga Nueva" });
    expect(prisma.pool.update).toHaveBeenCalledWith({
      where: { id: POOL_ID },
      data: { name: "Liga Nueva" },
    });
  });

  it("renames a PUBLIC pool when the name is free", async () => {
    mockPool("PUBLIC");
    vi.mocked(prisma.pool.findFirst).mockResolvedValue(null as never);
    const result = await renamePool({ poolId: POOL_ID, name: "Pública Renombrada" });
    expect(result).toEqual({ success: true, name: "Pública Renombrada" });
    expect(prisma.pool.update).toHaveBeenCalledTimes(1);
  });

  it("rejects renaming a PUBLIC pool to a name already used by another PUBLIC pool (BR-54.6)", async () => {
    mockPool("PUBLIC");
    vi.mocked(prisma.pool.findFirst).mockResolvedValue({ id: "other" } as never);
    const result = await renamePool({ poolId: POOL_ID, name: "Liga Repetida" });
    expect(result).toEqual({ error: "Ya existe una liga pública con ese nombre" });
    expect(prisma.pool.findFirst).toHaveBeenCalledWith({
      where: { type: "PUBLIC", name: "Liga Repetida", id: { not: POOL_ID } },
    });
    expect(prisma.pool.update).not.toHaveBeenCalled();
  });

  it("allows duplicate names for PRIVATE pools (no uniqueness pre-check, BR-54.6)", async () => {
    mockPool("PRIVATE");
    const result = await renamePool({ poolId: POOL_ID, name: "Nombre Repetido" });
    expect(result).toEqual({ success: true, name: "Nombre Repetido" });
    expect(prisma.pool.findFirst).not.toHaveBeenCalled();
  });

  it("maps a unique-constraint race on update to a friendly error (BR-54.6)", async () => {
    mockPool("PUBLIC");
    vi.mocked(prisma.pool.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.pool.update).mockRejectedValue(new Error("P2002") as never);
    const result = await renamePool({ poolId: POOL_ID, name: "Carrera" });
    expect(result).toEqual({ error: "Ya existe una liga pública con ese nombre" });
  });

  it("non-owner receives 'Solo el administrador puede cambiar esta configuración'", async () => {
    vi.mocked(getOnboardedUserId).mockResolvedValue(NON_OWNER_ID);
    const result = await renamePool({ poolId: POOL_ID, name: "Liga Nueva" });
    expect(result).toEqual({
      error: "Solo el administrador puede cambiar esta configuración",
    });
    expect(prisma.pool.update).not.toHaveBeenCalled();
  });

  it("returns 'Liga no encontrada' when pool does not exist", async () => {
    vi.mocked(prisma.pool.findUnique).mockResolvedValue(null as never);
    const result = await renamePool({ poolId: POOL_ID, name: "Liga Nueva" });
    expect(result).toEqual({ error: "Liga no encontrada" });
    expect(prisma.pool.update).not.toHaveBeenCalled();
  });

  it("returns onboarding error when user is not onboarded", async () => {
    vi.mocked(getOnboardedUserId).mockResolvedValue(null);
    const result = await renamePool({ poolId: POOL_ID, name: "Liga Nueva" });
    expect(result).toEqual({ error: "Completa tu perfil para cambiar la configuración." });
    expect(prisma.pool.findUnique).not.toHaveBeenCalled();
  });

  it("rejects non-UUID poolId", async () => {
    const result = await renamePool({ poolId: "not-a-uuid", name: "Liga Nueva" });
    expect("error" in result).toBe(true);
    expect(prisma.pool.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a name shorter than 3 chars", async () => {
    const result = await renamePool({ poolId: POOL_ID, name: "ab" });
    expect(result).toEqual({ error: "El nombre debe tener al menos 3 caracteres" });
    expect(prisma.pool.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a name longer than 60 chars", async () => {
    const result = await renamePool({ poolId: POOL_ID, name: "x".repeat(61) });
    expect(result).toEqual({ error: "El nombre debe tener como máximo 60 caracteres" });
    expect(prisma.pool.findUnique).not.toHaveBeenCalled();
  });

  it("revalidates /pools/<id> and /pools and logs pool.settings_changed", async () => {
    await renamePool({ poolId: POOL_ID, name: "Liga Nueva" });
    expect(revalidatePath).toHaveBeenCalledWith(`/pools/${POOL_ID}`);
    expect(revalidatePath).toHaveBeenCalledWith("/pools");
    expect(logAuthEvent).toHaveBeenCalledWith(
      "pool.settings_changed",
      expect.objectContaining({ userId: OWNER_ID, poolId: POOL_ID, renamedTo: "Liga Nueva" }),
    );
  });
});
