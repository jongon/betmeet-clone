"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function setAvatarFromGoogle() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "Not authenticated" };
  }

  const googleAvatarUrl = userData.user.user_metadata?.avatar_url as string | undefined;
  if (!googleAvatarUrl) {
    return { error: "No Google profile picture available" };
  }

  await prisma.profile.update({
    where: { id: userData.user.id },
    data: { avatarUrl: googleAvatarUrl, avatarSource: "GOOGLE_PHOTO" },
  });

  return { success: true, avatarUrl: googleAvatarUrl };
}
