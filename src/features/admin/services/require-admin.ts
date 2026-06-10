import { getCurrentUserId } from "@/features/pools/services/session";
import { prisma } from "@/lib/prisma";

/**
 * Returns the current user's id only if they are an ADMIN (BR-7.1, BR-7.13),
 * otherwise null. Pages call notFound() and actions return an error on null.
 * Defense-in-depth: `/admin/*` is also gated at proxy.ts.
 */
export async function getAdminUserId(): Promise<string | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { verificationStatus: true },
  });

  return profile?.verificationStatus === "ADMIN" ? userId : null;
}
