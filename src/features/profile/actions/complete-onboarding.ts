"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function completeOnboarding() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "Not authenticated" };
  }

  const result = await prisma.profile.updateMany({
    where: { id: userData.user.id },
    data: { onboardingCompleted: true },
  });

  if (result.count === 0) {
    return { error: "Profile not found" };
  }

  // Mint a fresh token so the updated `onboarding_completed` claim is reflected
  // immediately. The Custom Access Token Hook only runs on sign-in/refresh, so
  // without this the proxy's onboarding gate would keep bouncing the user until
  // the token naturally refreshes.
  await supabase.auth.refreshSession();

  return { success: true };
}
