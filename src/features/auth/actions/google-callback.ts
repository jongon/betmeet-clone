"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sanitizeNext } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

export async function initiateGoogleSignIn(next?: string) {
  const supabase = await createClient();
  // Forward the post-auth destination through OAuth so /auth/callback can return
  // the user to it (FR-REFINE-13.1). sanitizeNext guards against open redirects.
  const safeNext = sanitizeNext(next);
  const baseCallback = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`;
  const redirectTo =
    safeNext !== "/matches" ? `${baseCallback}?next=${encodeURIComponent(safeNext)}` : baseCallback;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });

  if (error || !data.url) {
    return { error: "Failed to initiate Google sign-in" };
  }

  redirect(data.url);
}

export async function handleGoogleCallback(userId: string) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) return;

  const googleAvatarUrl = userData.user.user_metadata?.avatar_url as string | undefined;

  if (googleAvatarUrl) {
    // Update avatar only if current source is DEFAULT_SET (don't override custom uploads)
    const profile = await prisma.profile.findUnique({ where: { id: userId } });
    if (profile && profile.avatarSource === "DEFAULT_SET") {
      await prisma.profile.update({
        where: { id: userId },
        data: {
          avatarUrl: googleAvatarUrl,
          avatarSource: "GOOGLE_PHOTO",
        },
      });
    }
  }
}
