import type { NotificationEventType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { PushNotificationPayload } from "../types";

interface QueueNotificationEventInput {
  type: NotificationEventType;
  dedupeKey: string;
  recipientUserId: string;
  payload: PushNotificationPayload;
}

export async function queueNotificationEvent(input: QueueNotificationEventInput) {
  const existing = await prisma.notificationEvent.findUnique({
    where: { dedupeKey: input.dedupeKey },
    select: { id: true, status: true },
  });

  if (!existing) {
    return prisma.notificationEvent.create({
      data: {
        type: input.type,
        dedupeKey: input.dedupeKey,
        recipientUserId: input.recipientUserId,
        payload: { ...input.payload },
      },
    });
  }

  // Self-healing outbox: an event that never got delivered (SKIPPED because the
  // recipient had no active subscription / preference off at dispatch time, or
  // FAILED) is revived to PENDING so a re-trigger reattempts it with a fresh
  // payload. SENT and PENDING are left untouched to avoid re-notifying or
  // duplicating an already-queued event.
  if (existing.status === "SKIPPED" || existing.status === "FAILED") {
    return prisma.notificationEvent.update({
      where: { id: existing.id },
      data: { status: "PENDING", processedAt: null, payload: { ...input.payload } },
    });
  }

  return existing;
}

export async function queueNotificationEvents(inputs: QueueNotificationEventInput[]) {
  for (const input of inputs) {
    await queueNotificationEvent(input);
  }
}

export async function getMatchNotificationRecipients(matchId: string): Promise<string[]> {
  const [predictions, memberships] = await Promise.all([
    prisma.prediction.findMany({ where: { matchId }, select: { userId: true } }),
    prisma.poolMembership.findMany({ select: { userId: true } }),
  ]);

  return Array.from(new Set([...predictions, ...memberships].map((row) => row.userId)));
}
