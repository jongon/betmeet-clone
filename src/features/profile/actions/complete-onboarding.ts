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

  return { success: true };
}
