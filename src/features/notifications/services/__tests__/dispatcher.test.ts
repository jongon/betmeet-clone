import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendNotification } = vi.hoisted(() => ({ sendNotification: vi.fn() }));

vi.mock("web-push", () => ({
  default: { sendNotification },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notificationEvent: { findMany: vi.fn(), update: vi.fn() },
    notificationDelivery: { create: vi.fn() },
    pushSubscription: { update: vi.fn() },
    $transaction: vi.fn(async (ops: unknown[]) => ops),
  },
}));

import { prisma } from "@/lib/prisma";
import { dispatchPendingNotifications } from "../dispatcher";

describe("dispatchPendingNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "public";
    process.env.VAPID_PRIVATE_KEY = "private";
    process.env.VAPID_SUBJECT = "mailto:test@example.com";
  });

  it("skips events when the matching preference is disabled", async () => {
    vi.mocked(prisma.notificationEvent.findMany).mockResolvedValue([
      {
        id: "event-1",
        type: "POOL_INVITE",
        payload: { title: "Invite", body: "Body", url: "/pools" },
        recipient: { notificationPreference: { poolInvite: false }, pushSubscriptions: [] },
      },
    ] as never);

    await dispatchPendingNotifications();

    expect(sendNotification).not.toHaveBeenCalled();
    expect(prisma.notificationEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "SKIPPED" }) }),
    );
  });

  it("deactivates invalid subscriptions on 410 responses", async () => {
    sendNotification.mockRejectedValue({ statusCode: 410, message: "Gone" });
    vi.mocked(prisma.notificationEvent.findMany).mockResolvedValue([
      {
        id: "event-1",
        type: "POOL_INVITE",
        payload: { title: "Invite", body: "Body", url: "/pools" },
        recipient: {
          notificationPreference: { poolInvite: true },
          pushSubscriptions: [{ id: "sub-1", endpoint: "https://push", p256dh: "p", auth: "a" }],
        },
      },
    ] as never);

    await dispatchPendingNotifications();

    expect(prisma.pushSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sub-1" },
        data: expect.objectContaining({ isActive: false }),
      }),
    );
  });
});
