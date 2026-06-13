import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/notifications/services/events", () => ({ queueNotificationEvent: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    pool: { findUnique: vi.fn() },
    profile: { findFirst: vi.fn() },
    poolDirectedInvite: { upsert: vi.fn(), create: vi.fn() },
    $queryRaw: vi.fn(),
  },
}));
vi.mock("@/features/profile/queries", () => ({ getOnboardedUserId: vi.fn() }));

import { queueNotificationEvent } from "@/features/notifications/services/events";
import { getOnboardedUserId } from "@/features/profile/queries";
import { prisma } from "@/lib/prisma";
import { createDirectedInvite } from "../create-directed-invite";

const POOL_ID = "11111111-1111-4111-8111-111111111111";

describe("createDirectedInvite (FR-REFINE-13.4 verification)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOnboardedUserId).mockResolvedValue("owner-1");
    vi.mocked(prisma.pool.findUnique).mockResolvedValue({
      id: POOL_ID,
      name: "Mi Liga",
      inviteToken: "ABC123",
      ownerId: "owner-1",
    } as never);
  });

  it("queues push when a nickname resolves to an existing user", async () => {
    vi.mocked(prisma.profile.findFirst).mockResolvedValue({ id: "user-2" } as never);
    vi.mocked(prisma.poolDirectedInvite.upsert).mockResolvedValue({
      invitedUserId: "user-2",
    } as never);

    const result = await createDirectedInvite({ poolId: POOL_ID, target: "Pedro#1234" });
    expect(result).toEqual({ success: true, pushQueued: true });
    expect(queueNotificationEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "POOL_INVITE", recipientUserId: "user-2" }),
    );
  });

  it("does NOT queue push for an email invite that resolves to no user", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([] as never); // resolveUserByEmail → none
    vi.mocked(prisma.poolDirectedInvite.create).mockResolvedValue({
      invitedUserId: null,
    } as never);

    const result = await createDirectedInvite({ poolId: POOL_ID, target: "nuevo@example.com" });
    expect(result).toEqual({ success: true, pushQueued: false });
    expect(queueNotificationEvent).not.toHaveBeenCalled();
  });

  it("rejects a non-owner", async () => {
    vi.mocked(getOnboardedUserId).mockResolvedValue("intruder");
    const result = await createDirectedInvite({ poolId: POOL_ID, target: "Pedro#1234" });
    expect(result).toEqual({ error: "Solo el administrador puede invitar" });
    expect(queueNotificationEvent).not.toHaveBeenCalled();
  });

  it("errors when a nickname matches no user", async () => {
    vi.mocked(prisma.profile.findFirst).mockResolvedValue(null as never);
    const result = await createDirectedInvite({ poolId: POOL_ID, target: "Ghost#9999" });
    expect("error" in result).toBe(true);
    expect(queueNotificationEvent).not.toHaveBeenCalled();
  });
});
