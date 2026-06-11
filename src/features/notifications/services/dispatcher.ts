import webpush, { type WebPushError } from "web-push";
import { prisma } from "@/lib/prisma";
import { NOTIFICATION_TYPE_TO_PREFERENCE, type PushNotificationPayload } from "../types";

function getVapidDetails() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

function toSafeError(error: unknown) {
  const maybe = error as Partial<WebPushError> & { message?: string };
  return {
    statusCode: typeof maybe.statusCode === "number" ? maybe.statusCode : null,
    message: maybe.message?.slice(0, 500) ?? "Push delivery failed",
  };
}

export async function dispatchPendingNotifications(limit = 50) {
  const vapidDetails = getVapidDetails();
  if (!vapidDetails) return { sent: 0, failed: 0, skipped: 0 };

  const events = await prisma.notificationEvent.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: {
      recipient: {
        include: {
          notificationPreference: true,
          pushSubscriptions: { where: { isActive: true } },
        },
      },
    },
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const event of events) {
    const preferenceName = NOTIFICATION_TYPE_TO_PREFERENCE[event.type];
    const preferences = event.recipient.notificationPreference;
    const subscriptions = event.recipient.pushSubscriptions;

    if (!preferences?.[preferenceName] || subscriptions.length === 0) {
      skipped += 1;
      await prisma.notificationEvent.update({
        where: { id: event.id },
        data: { status: "SKIPPED", processedAt: new Date() },
      });
      continue;
    }

    const payload = event.payload as unknown as PushNotificationPayload;
    const payloadText = JSON.stringify({ ...payload, eventId: event.id });
    let eventSent = 0;
    let eventFailed = 0;

    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          payloadText,
          { vapidDetails, TTL: 60 * 60, contentEncoding: "aes128gcm" },
        );
        eventSent += 1;
        await prisma.$transaction([
          prisma.notificationDelivery.create({
            data: { eventId: event.id, subscriptionId: subscription.id, status: "SENT" },
          }),
          prisma.pushSubscription.update({
            where: { id: subscription.id },
            data: { lastSuccessAt: new Date(), failureReason: null },
          }),
        ]);
      } catch (error) {
        const safe = toSafeError(error);
        eventFailed += 1;
        await prisma.$transaction([
          prisma.notificationDelivery.create({
            data: {
              eventId: event.id,
              subscriptionId: subscription.id,
              status: "FAILED",
              providerStatusCode: safe.statusCode,
              errorMessage: safe.message,
            },
          }),
          prisma.pushSubscription.update({
            where: { id: subscription.id },
            data: {
              isActive: safe.statusCode === 404 || safe.statusCode === 410 ? false : undefined,
              lastFailureAt: new Date(),
              failureReason: safe.message,
            },
          }),
        ]);
      }
    }

    sent += eventSent;
    failed += eventFailed;
    await prisma.notificationEvent.update({
      where: { id: event.id },
      data: { status: eventSent > 0 ? "SENT" : "FAILED", processedAt: new Date() },
    });
  }

  return { sent, failed, skipped };
}
