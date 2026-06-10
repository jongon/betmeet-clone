import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { AvatarAsset, Profile } from "./types";

export const getDefaultAvatars = unstable_cache(
  async (): Promise<AvatarAsset[]> => {
    const assets = await prisma.avatarAsset.findMany({
      orderBy: { displayOrder: "asc" },
    });
    return assets.map((a) => ({
      id: a.id,
      name: a.name,
      storagePath: a.storagePath,
      storageUrl: a.storageUrl,
      displayOrder: a.displayOrder,
    }));
  },
  ["default-avatars"],
  { revalidate: 60 * 60 * 24 }, // 24h TTL
);

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: userData.user.id },
  });

  if (!profile) return null;

  return {
    id: profile.id,
    nicknameBase: profile.nicknameBase,
    nicknameDiscriminator: profile.nicknameDiscriminator,
    avatarUrl: profile.avatarUrl,
    avatarSource: profile.avatarSource as Profile["avatarSource"],
    verificationStatus: profile.verificationStatus as Profile["verificationStatus"],
    mfaEnabled: profile.mfaEnabled,
    deletedAt: profile.deletedAt,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}
