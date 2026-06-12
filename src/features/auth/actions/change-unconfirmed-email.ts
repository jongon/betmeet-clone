"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { logAuthEvent, redactEmail } from "@/lib/auth-logger";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { ChangeUnconfirmedEmailSchema } from "../schemas";
import { consumeEmailActionCooldown } from "../services/email-throttle";

type ChangeUnconfirmedEmailState = {
  error?: {
    currentEmail?: string[];
    password?: string[];
    newEmail?: string[];
    _form?: string[];
  };
  success?: boolean;
  retryAfterSeconds?: number;
};

/** True when Supabase rejected sign-in solely because the email is unconfirmed. */
function isUnconfirmedError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "email_not_confirmed" || /not confirmed/i.test(error.message ?? "");
}

/**
 * Changes the email of an UNCONFIRMED account while preserving the same
 * `auth.users.id`, profile and navigation intent (FR-REFINE-12.3).
 *
 * Flow: verify current credentials with an ephemeral (cookie-less) client — an
 * unconfirmed account returns `email_not_confirmed` when the password is correct —
 * look up the user id, then update the email via the service_role admin client and
 * resend confirmation to the new address. Throttled per email (FR-REFINE-12.2).
 */
export async function changeUnconfirmedEmail(
  formData: FormData,
): Promise<ChangeUnconfirmedEmailState> {
  const parsed = ChangeUnconfirmedEmailSchema.safeParse({
    currentEmail: formData.get("currentEmail") as string,
    password: formData.get("password") as string,
    newEmail: formData.get("newEmail") as string,
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const currentEmail = parsed.data.currentEmail.trim().toLowerCase();
  const newEmail = parsed.data.newEmail.trim().toLowerCase();

  const cooldown = await consumeEmailActionCooldown(currentEmail, "change_unconfirmed_email");
  if (!cooldown.allowed) {
    return { retryAfterSeconds: cooldown.retryAfterSeconds };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return { error: { _form: ["Service temporarily unavailable"] } };
  }

  // Ephemeral client: verifies credentials without writing session cookies.
  const verifier = createSupabaseClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signInData, error: signInError } = await verifier.auth.signInWithPassword({
    email: currentEmail,
    password: parsed.data.password,
  });

  if (signInError && !isUnconfirmedError(signInError)) {
    logAuthEvent("auth.change_unconfirmed_email_failed", {
      method: "email",
      email: redactEmail(currentEmail),
      reason: "invalid_credentials",
    });
    return { error: { _form: ["Invalid email or password"] } };
  }

  // No error means the account is already confirmed — use the normal flow instead.
  if (!signInError && signInData.session) {
    await verifier.auth.signOut();
    return {
      error: {
        _form: [
          "This account is already confirmed. Please sign in and change your email from Profile.",
        ],
      },
    };
  }

  // Look up the still-unconfirmed user id directly from auth.users. Prisma connects
  // as the DB owner, so it can read the auth schema; the WHERE guard ensures we only
  // act on accounts that are genuinely unconfirmed.
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id::text AS id
    FROM auth.users
    WHERE lower(email) = ${currentEmail}
      AND email_confirmed_at IS NULL
    LIMIT 1
  `;
  const userId = rows[0]?.id ?? null;

  if (!userId) {
    logAuthEvent("auth.change_unconfirmed_email_failed", {
      method: "email",
      email: redactEmail(currentEmail),
      reason: "user_not_found",
    });
    // Generic success to avoid leaking whether the account exists.
    return { success: true };
  }

  const admin = createAdminClient();
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    email: newEmail,
    email_confirm: false,
  });
  if (updateError) {
    return { error: { _form: [updateError.message] } };
  }

  // Send confirmation to the new address so the same user can confirm and keep the account.
  await admin.auth.resend({
    type: "signup",
    email: newEmail,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  });

  logAuthEvent("auth.change_unconfirmed_email_succeeded", {
    method: "email",
    email: redactEmail(newEmail),
  });
  return { success: true };
}
