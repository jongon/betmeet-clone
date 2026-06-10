"use server";

import { createClient } from "@/lib/supabase/server";
import { AvatarUploadMetaSchema } from "../schemas";

export async function createAvatarUploadUrl(mimeType: string, sizeBytes: number) {
  const parsed = AvatarUploadMetaSchema.safeParse({ mimeType, sizeBytes });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "Not authenticated" };
  }

  const ext = parsed.data.mimeType.split("/")[1];
  const storagePath = `custom/${userData.user.id}/avatar.${ext}`;

  const { data, error } = await supabase.storage.from("avatars").createSignedUploadUrl(storagePath);

  if (error || !data) {
    return { error: "Failed to create upload URL" };
  }

  return {
    signedUrl: data.signedUrl,
    storagePath,
    token: data.token,
  };
}
