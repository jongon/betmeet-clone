import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDefaultAvatars, getOrCreateProfile } from "@/features/profile/queries";
import { OnboardingClient } from "./onboarding-client";

export const metadata: Metadata = { title: "Set up your profile" };

export default async function OnboardingProfilePage() {
  const [profile, defaultAvatars] = await Promise.all([getOrCreateProfile(), getDefaultAvatars()]);

  // Null only when there is no authenticated user (not when the row is merely
  // missing — getOrCreateProfile self-heals that case to avoid a redirect loop).
  if (!profile) redirect("/sign-in");
  // Already completed onboarding
  if (profile.nicknameBase) redirect("/matches");

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-md">
        <OnboardingClient
          currentAvatarUrl={profile.avatarUrl}
          defaultAvatars={defaultAvatars}
          googleAvatarUrl={null}
        />
      </div>
    </div>
  );
}
