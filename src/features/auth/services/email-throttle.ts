import { prisma } from "@/lib/prisma";

/** Minimum seconds between email-bound actions for the same email (FR-REFINE-12.2). */
export const EMAIL_ACTION_COOLDOWN_SECONDS = 60;

export type EmailAction = "resend_confirmation" | "change_unconfirmed_email";

export type ThrottleResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Server-side cooldown keyed by (email, action). Returns whether the action is
 * allowed now; when blocked, includes the remaining seconds. Records the send
 * timestamp on success so the next call is throttled. Unconfirmed accounts may
 * have no profile yet, so the throttle is keyed by email, not user id.
 */
export async function consumeEmailActionCooldown(
  email: string,
  action: EmailAction,
  cooldownSeconds: number = EMAIL_ACTION_COOLDOWN_SECONDS,
): Promise<ThrottleResult> {
  const normalized = normalizeEmail(email);
  const now = new Date();
  const existing = await prisma.emailActionThrottle.findUnique({
    where: { email_action: { email: normalized, action } },
  });

  if (existing) {
    const elapsedSeconds = (now.getTime() - existing.lastSentAt.getTime()) / 1000;
    if (elapsedSeconds < cooldownSeconds) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(cooldownSeconds - elapsedSeconds),
      };
    }
  }

  await prisma.emailActionThrottle.upsert({
    where: { email_action: { email: normalized, action } },
    create: { email: normalized, action, lastSentAt: now },
    update: { lastSentAt: now },
  });

  return { allowed: true };
}
