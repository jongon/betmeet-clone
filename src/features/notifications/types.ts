import type { NotificationEventType } from "@/generated/prisma/enums";

export interface PushNotificationPayload {
  title: string;
  body: string;
  url: string;
  eventId?: string;
}

export interface NotificationPreferenceState {
  matchStarted: boolean;
  matchFinished: boolean;
  poolInvite: boolean;
  globalRankImproved: boolean;
  goalScored: boolean;
}

export const NOTIFICATION_TYPE_TO_PREFERENCE = {
  MATCH_STARTED: "matchStarted",
  MATCH_FINISHED: "matchFinished",
  POOL_INVITE: "poolInvite",
  GLOBAL_RANK_IMPROVED: "globalRankImproved",
  GOAL_SCORED: "goalScored",
} satisfies Record<NotificationEventType, keyof NotificationPreferenceState>;
