import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/app-header";
import { getProfile } from "@/features/profile/queries";

/**
 * Layout for authenticated app routes (and admin). Mounts the global header.
 * Each page renders its own <main>, so this layout deliberately does not add one
 * (avoids nested <main>). Session/email/admin gating lives in src/proxy.ts.
 *
 * Onboarding gate (defense in depth, FR-REFINE-16.1): the middleware onboarding
 * check fails OPEN on a data-API read error and depends on `onboarding_completed`
 * being reachable via PostgREST. This server gate re-checks the flag via Prisma
 * (direct Postgres) so an un-onboarded user can never render an app page even if
 * the middleware check is bypassed. Onboarding itself lives at
 * `/onboarding/profile` (outside this route group), so this never self-loops.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (profile && !profile.onboardingCompleted) {
    redirect("/onboarding/profile");
  }

  return (
    <>
      <AppHeader />
      {children}
    </>
  );
}
