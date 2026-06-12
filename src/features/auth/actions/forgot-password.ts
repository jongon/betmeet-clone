"use server";

import { createClient } from "@/lib/supabase/server";
import { ForgotPasswordSchema } from "../schemas";

type ForgotPasswordState =
  | {
      error?: { email?: string[]; _form?: string[] };
      success?: boolean;
    }
  | undefined;

export async function forgotPassword(formData: FormData): Promise<ForgotPasswordState> {
  const raw = { email: formData.get("email") as string };

  const parsed = ForgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  // Always return success to prevent email enumeration.
  // Route through /auth/callback so the PKCE `code` is exchanged for a (recovery)
  // session before reaching the form — otherwise updateUser() throws
  // "Auth session missing!".
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password`,
  });

  return { success: true };
}
