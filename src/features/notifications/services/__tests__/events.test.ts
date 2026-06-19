import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notificationEvent: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { queueNotificationEvent } from "../events";

const input = {
  type: "POOL_INVITE" as const,
  dedupeKey: "pool-invite:pool-1:user-1",
  recipientUserId: "user-1",
  payload: { title: "Te invitaron", body: "A la liga", url: "/pools/join/abc" },
};

describe("queueNotificationEvent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a new PENDING event when none exists for the dedupe key", async () => {
    vi.mocked(prisma.notificationEvent.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.notificationEvent.create).mockResolvedValue({ id: "e1" } as never);

    await queueNotificationEvent(input);

    expect(prisma.notificationEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dedupeKey: input.dedupeKey,
          recipientUserId: "user-1",
          payload: input.payload,
        }),
      }),
    );
    expect(prisma.notificationEvent.update).not.toHaveBeenCalled();
  });

  it.each([
    "SKIPPED",
    "FAILED",
  ] as const)("revives a %s event to PENDING with a fresh payload", async (status) => {
    vi.mocked(prisma.notificationEvent.findUnique).mockResolvedValue({
      id: "e1",
      status,
    } as never);
    vi.mocked(prisma.notificationEvent.update).mockResolvedValue({ id: "e1" } as never);

    await queueNotificationEvent(input);

    expect(prisma.notificationEvent.update).toHaveBeenCalledWith({
      where: { id: "e1" },
      data: { status: "PENDING", processedAt: null, payload: input.payload },
    });
    expect(prisma.notificationEvent.create).not.toHaveBeenCalled();
  });

  it.each(["SENT", "PENDING"] as const)("leaves a %s event untouched", async (status) => {
    vi.mocked(prisma.notificationEvent.findUnique).mockResolvedValue({
      id: "e1",
      status,
    } as never);

    await queueNotificationEvent(input);

    expect(prisma.notificationEvent.update).not.toHaveBeenCalled();
    expect(prisma.notificationEvent.create).not.toHaveBeenCalled();
  });
});
