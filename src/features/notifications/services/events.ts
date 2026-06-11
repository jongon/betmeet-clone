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
  return prisma.notificationEvent.upsert({
    where: { dedupeKey: input.dedupeKey },
    update: {},
    create: {
      type: input.type,
      dedupeKey: input.dedupeKey,
      recipientUserId: input.recipientUserId,
      payload: { ...input.payload },
    },
  });
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
