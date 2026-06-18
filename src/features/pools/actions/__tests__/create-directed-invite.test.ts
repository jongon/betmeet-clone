import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/notifications/services/events", () => ({ queueNotificationEvent: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    pool: { findUnique: vi.fn() },
    poolMembership: { findUnique: vi.fn() },
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

describe("createDirectedInvite (FR-REFINE-13.4 + Unit 45 gate ampliado)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getOnboardedUserId).mockResolvedValue("owner-1");
    vi.mocked(prisma.pool.findUnique).mockResolvedValue({
      id: POOL_ID,
      name: "Mi Liga",
      inviteToken: "ABC123",
      ownerId: "owner-1",
      type: "PRIVATE", // Unit 45: añadido al select
      membersCanInvite: true, // Unit 45: añadido al select
    } as never);
    vi.mocked(prisma.poolMembership.findUnique).mockResolvedValue({ userId: "owner-1" } as never);
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

  it("rejects a non-member", async () => {
    vi.mocked(getOnboardedUserId).mockResolvedValue("intruder");
    vi.mocked(prisma.poolMembership.findUnique).mockResolvedValue(null as never);
    const result = await createDirectedInvite({ poolId: POOL_ID, target: "Pedro#1234" });
    expect(result).toEqual({ error: "Debes ser miembro de la liga para invitar" });
    expect(queueNotificationEvent).not.toHaveBeenCalled();
  });

  it("allows a non-owner member to invite when membersCanInvite=true (default)", async () => {
    vi.mocked(getOnboardedUserId).mockResolvedValue("member-1");
    vi.mocked(prisma.poolMembership.findUnique).mockResolvedValue({ userId: "member-1" } as never);
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

  it("Unit 45: rejects a non-owner member when membersCanInvite=false (BR-3.34, BR-45.6)", async () => {
    vi.mocked(getOnboardedUserId).mockResolvedValue("member-1");
    vi.mocked(prisma.poolMembership.findUnique).mockResolvedValue({ userId: "member-1" } as never);
    vi.mocked(prisma.pool.findUnique).mockResolvedValue({
      id: POOL_ID,
      name: "Mi Liga",
      inviteToken: "ABC123",
      ownerId: "owner-1",
      type: "PRIVATE",
      membersCanInvite: false, // owner deshabilita invitación por miembros
    } as never);
    vi.mocked(prisma.profile.findFirst).mockResolvedValue({ id: "user-2" } as never);

    const result = await createDirectedInvite({ poolId: POOL_ID, target: "Pedro#1234" });
    expect(result).toEqual({ error: "El administrador no permite que los miembros inviten" });
    expect(queueNotificationEvent).not.toHaveBeenCalled();
    expect(prisma.poolDirectedInvite.upsert).not.toHaveBeenCalled();
    expect(prisma.poolDirectedInvite.create).not.toHaveBeenCalled();
  });

  it("Unit 45: owner can always invite even when membersCanInvite=false (BR-3.33)", async () => {
    vi.mocked(prisma.pool.findUnique).mockResolvedValue({
      id: POOL_ID,
      name: "Mi Liga",
      inviteToken: "ABC123",
      ownerId: "owner-1",
      type: "PRIVATE",
      membersCanInvite: false,
    } as never);
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

  it("Unit 45: PUBLIC pool — non-owner member is blocked (membership required first)", async () => {
    vi.mocked(getOnboardedUserId).mockResolvedValue("member-1");
    vi.mocked(prisma.poolMembership.findUnique).mockResolvedValue({ userId: "member-1" } as never);
    vi.mocked(prisma.pool.findUnique).mockResolvedValue({
      id: POOL_ID,
      name: "Mi Liga",
      inviteToken: "ABC123",
      ownerId: "owner-1",
      type: "PUBLIC", // PUBLIC: el flag se ignora en el gate
      membersCanInvite: false, // tendría que ser true en PUBLIC, pero el flag se ignora
    } as never);

    // No es owner, sí es miembro, pero el pool es PUBLIC → bloqueado por BR-45.6
    const result = await createDirectedInvite({ poolId: POOL_ID, target: "Pedro#1234" });
    expect(result).toEqual({ error: "El administrador no permite que los miembros inviten" });
  });

  it("rejects self-invite by nickname", async () => {
    vi.mocked(prisma.profile.findFirst).mockResolvedValue({ id: "owner-1" } as never);
    const result = await createDirectedInvite({ poolId: POOL_ID, target: "YoMismo#1234" });
    expect(result).toEqual({ error: "No puedes invitarte a ti mismo." });
    expect(queueNotificationEvent).not.toHaveBeenCalled();
  });

  it("errors when a nickname matches no user", async () => {
    vi.mocked(prisma.profile.findFirst).mockResolvedValue(null as never);
    const result = await createDirectedInvite({ poolId: POOL_ID, target: "Ghost#9999" });
    expect("error" in result).toBe(true);
    expect(queueNotificationEvent).not.toHaveBeenCalled();
  });
});
