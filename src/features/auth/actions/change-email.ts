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
  const { error } = await supabase.auth.updateUser(
    { email: parsed.data.newEmail },
    { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?type=email_change` },
  );

  if (error) {
    return { error: { _form: [error.message] } };
  }

  // Supabase sends confirmation email to both old and new addresses
  return { success: true };
}
