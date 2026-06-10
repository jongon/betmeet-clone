"use server";

import { redirect } from "next/navigation";
import { logAuthEvent, redactEmail } from "@/lib/auth-logger";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function deleteAccount() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { error: { _form: ["Not authenticated"] } };
  }

  const userId = userData.user.id;
  const email = userData.user.email ?? "";

  // Soft-delete: set deleted_at on profile
  await prisma.profile.update({
    where: { id: userId },
    data: { deletedAt: new Date() },
  });

  logAuthEvent("auth.account_deleted", {
    userId,
    email: redactEmail(email),
  });

  await supabase.auth.signOut();

  redirect("/auth/sign-in?deleted=true");
}
