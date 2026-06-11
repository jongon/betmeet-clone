import { z } from "zod";

export const NotificationPreferencesSchema = z.object({
  matchStarted: z.boolean(),
  matchFinished: z.boolean(),
  poolInvite: z.boolean(),
  globalRankImproved: z.boolean(),
  goalScored: z.boolean(),
});

export const PushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(10),
    auth: z.string().min(10),
  }),
});

export type NotificationPreferencesInput = z.infer<typeof NotificationPreferencesSchema>;
export type PushSubscriptionInput = z.infer<typeof PushSubscriptionSchema>;
