import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingHeader } from "@/components/layout/onboarding-header";
import { getDefaultAvatars, getOrCreateProfile } from "@/features/profile/queries";
import { sanitizeNext } from "@/lib/safe-redirect";
import { OnboardingClient } from "./onboarding-client";

export const metadata: Metadata = { title: "Set up your profile" };

export default async function OnboardingProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [profile, defaultAvatars, params] = await Promise.all([
    getOrCreateProfile(),
    getDefaultAvatars(),
    searchParams,
  ]);

  // Preserve the original destination through onboarding (FR-REFINE-12.7), guarded
  // against open redirects.
  const next = sanitizeNext(params.next);

  // Null only when there is no authenticated user (not when the row is merely
  // missing — getOrCreateProfile self-heals that case to avoid a redirect loop).
  if (!profile) redirect("/sign-in");
  // Already completed onboarding — continue to the requested destination.
  if (profile.onboardingCompleted) redirect(next);

  return (
    <div className="flex min-h-svh flex-col">
      <OnboardingHeader />
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md">
          <OnboardingClient
            currentAvatarUrl={profile.avatarUrl}
            defaultAvatars={defaultAvatars}
            googleAvatarUrl={null}
            next={next}
          />
        </div>
      </div>
    </div>
  );
}
