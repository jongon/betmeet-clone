"use server";

import { createClient } from "@/lib/supabase/server";
import { ChangePasswordSchema } from "../schemas";

export async function changePassword(formData: FormData) {
  const raw = {
    currentPassword: formData.get("currentPassword") as string,
    newPassword: formData.get("newPassword") as string,
    confirmNewPassword: formData.get("confirmNewPassword") as string,
  };

  const parsed = ChangePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();

  // Re-authenticate to verify current password
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user?.email) {
    return { error: { _form: ["Not authenticated"] } };
  }

  const { error: reAuthError } = await supabase.auth.signInWithPassword({
    email: userData.user.email,
    password: parsed.data.currentPassword,
  });

  if (reAuthError) {
    return { error: { currentPassword: ["Current password is incorrect"] } };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (error) {
    return { error: { _form: [error.message] } };
  }

  return { success: true };
}
