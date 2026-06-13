"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { LOCAL_FALLBACK_AVATAR_PREFIX, resolveLocalAvatarUrl } from "../default-avatars";

export async function setAvatarFromDefaultSet(assetId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "Not authenticated" };
  }

  // Bundled local fallback avatars (FR-REFINE-12.6) are not in the DB; resolve them
  // to their static path instead of looking up an AvatarAsset row.
  if (assetId.startsWith(LOCAL_FALLBACK_AVATAR_PREFIX)) {
    const localUrl = resolveLocalAvatarUrl(assetId);
    if (!localUrl) {
      return { error: "Avatar not found" };
    }
    await prisma.profile.update({
      where: { id: userData.user.id },
      data: { avatarUrl: localUrl, avatarSource: "DEFAULT_SET" },
    });
    revalidatePath("/settings/profile");
    return { success: true, avatarUrl: localUrl };
  }

  const asset = await prisma.avatarAsset.findUnique({ where: { id: assetId } });
  if (!asset) {
    return { error: "Avatar not found" };
  }

  await prisma.profile.update({
    where: { id: userData.user.id },
    data: { avatarUrl: asset.storageUrl, avatarSource: "DEFAULT_SET" },
  });

  revalidatePath("/settings/profile");
  return { success: true, avatarUrl: asset.storageUrl };
}
