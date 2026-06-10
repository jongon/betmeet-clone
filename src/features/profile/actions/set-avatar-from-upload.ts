"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function setAvatarFromUpload(storagePath: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "Not authenticated" };
  }

  const userId = userData.user.id;

  // Validate the path belongs to this user
  if (!storagePath.startsWith(`custom/${userId}/`)) {
    return { error: "Invalid storage path" };
  }

  // Delete previous custom upload if it differs from the new one
  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { avatarUrl: true, avatarSource: true },
  });

  if (profile?.avatarSource === "CUSTOM_UPLOAD" && profile.avatarUrl) {
    try {
      const url = new URL(profile.avatarUrl);
      const oldPath = url.pathname.split("/object/public/avatars/")[1];
      if (oldPath && oldPath !== storagePath) {
        await supabase.storage.from("avatars").remove([oldPath]);
      }
    } catch {
      // Old URL malformed — skip deletion
    }
  }

  const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(storagePath);
  const avatarUrl = publicData.publicUrl;

  await prisma.profile.update({
    where: { id: userId },
    data: { avatarUrl, avatarSource: "CUSTOM_UPLOAD" },
  });

  return { success: true, avatarUrl };
}
