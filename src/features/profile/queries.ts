import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { LOCAL_FALLBACK_AVATARS } from "./default-avatars";
import type { AvatarAsset, Profile } from "./types";

export const getDefaultAvatars = unstable_cache(
  async (): Promise<AvatarAsset[]> => {
    try {
      const assets = await prisma.avatarAsset.findMany({
        orderBy: { displayOrder: "asc" },
      });
      // Fall back to bundled local avatars when the set was never seeded
      // (FR-REFINE-12.6) so the picker never renders empty.
      if (assets.length === 0) {
        return LOCAL_FALLBACK_AVATARS;
      }
      return assets.map((a) => ({
        id: a.id,
        name: a.name,
        storagePath: a.storagePath,
        storageUrl: a.storageUrl,
        displayOrder: a.displayOrder,
      }));
    } catch {
      // DB/Storage unavailable — degrade to the bundled local set.
      return LOCAL_FALLBACK_AVATARS;
    }
  },
  ["default-avatars"],
  { revalidate: 60 * 60 * 24 }, // 24h TTL
);

type PrismaProfile = NonNullable<Awaited<ReturnType<typeof prisma.profile.findUnique>>>;

function toProfile(profile: PrismaProfile): Profile {
  return {
    id: profile.id,
    nicknameBase: profile.nicknameBase,
    nicknameDiscriminator: profile.nicknameDiscriminator,
    avatarUrl: profile.avatarUrl,
    avatarSource: profile.avatarSource as Profile["avatarSource"],
    verificationStatus: profile.verificationStatus as Profile["verificationStatus"],
    mfaEnabled: profile.mfaEnabled,
    onboardingCompleted: profile.onboardingCompleted,
    deletedAt: profile.deletedAt,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

/**
 * Returns the authenticated user's id ONLY when they have completed onboarding
 * (FR-REFINE-16.1). Reads the `onboarding_completed` flag via Prisma (direct
 * Postgres), so the check is reliable even when the Supabase data API (PostgREST)
 * is degraded — unlike the middleware gate in `src/proxy.ts`, which fails OPEN on
 * a read error. Returns null when there is no session OR onboarding is incomplete,
 * so callers (mutating server actions) can deny the operation. This is the
 * action-layer half of the defense-in-depth onboarding gate.
 */
export async function getOnboardedUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { onboardingCompleted: true },
  });

  return profile?.onboardingCompleted ? userId : null;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: userData.user.id },
  });

  if (!profile) return null;

  return toProfile(profile);
}

/**
 * Returns the current user's profile, creating it if the `handle_new_user`
 * trigger never ran (e.g. the user predates the trigger or migrations are not
 * deployed). Returns null only when there is no authenticated user.
 *
 * Without this self-heal, an authenticated user with no `profiles` row triggers
 * an infinite redirect loop: the proxy onboarding gate sends them to
 * `/onboarding/profile`, the page sees no profile and redirects to `/sign-in`,
 * and the proxy bounces that auth-only page back to `/matches`, and so on.
 */
export async function getOrCreateProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const existing = await prisma.profile.findUnique({
    where: { id: userData.user.id },
  });
  if (existing) return toProfile(existing);

  const defaultAvatar = await prisma.avatarAsset.findFirst({
    orderBy: { displayOrder: "asc" },
  });

  // Idempotent: upsert guards against duplicate creates on concurrent renders.
  const created = await prisma.profile.upsert({
    where: { id: userData.user.id },
    update: {},
    create: {
      id: userData.user.id,
      avatarUrl: defaultAvatar?.storageUrl ?? "",
      avatarSource: "DEFAULT_SET",
      verificationStatus: userData.user.email_confirmed_at ? "VERIFIED" : "UNVERIFIED",
    },
  });

  return toProfile(created);
}
