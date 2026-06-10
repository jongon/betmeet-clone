"use server";

import { createClient } from "@/lib/supabase/server";
import { ForgotPasswordSchema } from "../schemas";

export async function forgotPassword(formData: FormData) {
  const raw = { email: formData.get("email") as string };

  const parsed = ForgotPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  // Always return success to prevent email enumeration
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
  });

  return { success: true };
}
