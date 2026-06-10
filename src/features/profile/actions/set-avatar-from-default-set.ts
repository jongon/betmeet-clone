"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function setAvatarFromDefaultSet(assetId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "Not authenticated" };
  }

  const asset = await prisma.avatarAsset.findUnique({ where: { id: assetId } });
  if (!asset) {
    return { error: "Avatar not found" };
  }

  await prisma.profile.update({
    where: { id: userData.user.id },
    data: { avatarUrl: asset.storageUrl, avatarSource: "DEFAULT_SET" },
  });

  return { success: true, avatarUrl: asset.storageUrl };
}
