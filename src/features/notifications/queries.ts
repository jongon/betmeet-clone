import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "../pools/services/session";
import type { NotificationPreferenceState } from "./types";

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferenceState = {
  matchStarted: false,
  matchFinished: false,
  poolInvite: false,
  globalRankImproved: false,
  goalScored: false,
};

export async function getNotificationSettings() {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const [preferences, subscriptions] = await Promise.all([
    prisma.notificationPreference.findUnique({ where: { userId } }),
    prisma.pushSubscription.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, userAgent: true, createdAt: true, lastSuccessAt: true },
    }),
  ]);

  return {
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
    preferences: preferences
      ? {
          matchStarted: preferences.matchStarted,
          matchFinished: preferences.matchFinished,
          poolInvite: preferences.poolInvite,
          globalRankImproved: preferences.globalRankImproved,
          goalScored: preferences.goalScored,
        }
      : DEFAULT_NOTIFICATION_PREFERENCES,
    subscriptions: subscriptions.map((subscription) => ({
      id: subscription.id,
      userAgent: subscription.userAgent ?? "Navegador registrado",
      createdAt: subscription.createdAt.toISOString(),
      lastSuccessAt: subscription.lastSuccessAt?.toISOString() ?? null,
    })),
  };
}
