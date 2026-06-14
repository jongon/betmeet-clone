"use server";

import { createClient } from "@/lib/supabase/server";
import { EmailChangeSchema } from "../schemas";

export async function changeEmail(formData: FormData) {
  const raw = { newEmail: formData.get("newEmail") as string };

  const parsed = EmailChangeSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  // Confirmation links resolve through the token_hash flow (`/auth/confirm`,
  // verifyOtp), not PKCE (`/auth/callback`, exchangeCodeForSession), so they
  // survive cross-device / mail-scanner-rewritten links (see memory
  // email-confirm-pkce-fragile). The email_change template already links to
  // /auth/confirm; this keeps emailRedirectTo consistent (FR-REFINE-15.10).
  const { error } = await supabase.auth.updateUser(
    { email: parsed.data.newEmail },
    { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?type=email_change` },
  );

  if (error) {
    return { error: { _form: [error.message] } };
  }

  // With Supabase "Secure email change" DISABLED (FR-REFINE-19.1), a single
  // confirmation link is sent only to the NEW address and the change applies
  // once that one link is confirmed — the old address is neither asked to
  // confirm nor notified. The setting lives in supabase/config.toml /
  // dashboard and the security tradeoff is recorded in CF-9.
  return { success: true };
}
