"use server";

import { logAuthEvent, redactEmail } from "@/lib/auth-logger";
import { createClient } from "@/lib/supabase/server";
import { ResendConfirmationSchema } from "../schemas";
import { consumeEmailActionCooldown } from "../services/email-throttle";

type ResendConfirmationState = {
  error?: { email?: string[]; _form?: string[] };
  success?: boolean;
  /** Seconds the caller must wait before retrying (cooldown active). */
  retryAfterSeconds?: number;
};

/**
 * Resends the signup confirmation email for an unconfirmed account (FR-REFINE-12.1).
 *
 * Throttled server-side (>=60s per email, FR-REFINE-12.2). Returns a generic
 * success regardless of whether the account exists / is already confirmed, so the
 * response does not leak account existence.
 */
export async function resendConfirmation(formData: FormData): Promise<ResendConfirmationState> {
  const parsed = ResendConfirmationSchema.safeParse({
    email: formData.get("email") as string,
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const email = parsed.data.email.trim().toLowerCase();

  const cooldown = await consumeEmailActionCooldown(email, "resend_confirmation");
  if (!cooldown.allowed) {
    return { retryAfterSeconds: cooldown.retryAfterSeconds };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  });

  if (error) {
    // Log server-side but return a generic success to avoid account enumeration.
    logAuthEvent("auth.resend_confirmation_failed", {
      method: "email",
      email: redactEmail(email),
      reason: error.message,
    });
  }

  return { success: true };
}
