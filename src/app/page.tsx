import type { Metadata } from "next";
import Link from "next/link";
import { LanguageMenu } from "@/components/language/language-menu";
import { UserMenu } from "@/components/layout/user-menu";
import { BrandToggle } from "@/components/theme/brand-toggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { LandingHero } from "@/features/education/components/landing-hero";
import { ScoringTeaser } from "@/features/education/components/scoring-teaser";
import { getProfile } from "@/features/profile/queries";
import { getDisplayNickname } from "@/features/profile/types";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = getDictionary(await getRequestLocale());
  return {
    title: dictionary.common.appName,
    description: dictionary.landing.heroSubtitle,
    openGraph: {
      title: dictionary.common.appName,
      description: dictionary.landing.heroSubtitle,
      type: "website",
    },
  };
}

export default async function Home() {
  // Session-aware landing (FR-REFINE-15.3): logged-in visitors see their identity
  // menu, anonymous visitors see the sign-in / sign-up actions.
  const dictionary = getDictionary(await getRequestLocale());
  const profile = await getProfile();

  return (
    <main className="mx-auto max-w-4xl px-4 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-2 pt-4">
        <Link href="/" className="font-display text-lg font-bold tracking-tight">
          {dictionary.common.appName}
        </Link>
        {/* Toggles aligned to the right to match the authenticated app header (FR-REFINE-15.4). */}
        <div className="flex items-center gap-1">
          {/* Unit 66: el selector de idioma también vive en el header del landing
              (mismo patrón que AppHeader/OnboardingHeader de Unit 64). */}
          <LanguageMenu />
          <BrandToggle />
          <ThemeToggle />
          {profile ? (
            <UserMenu
              displayNickname={getDisplayNickname(profile)}
              avatarUrl={profile.avatarUrl}
              isAdmin={profile.verificationStatus === "ADMIN"}
            />
          ) : (
            <nav className="flex items-center gap-2" aria-label={dictionary.landing.headerSignIn}>
              <Link href="/sign-in" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                {dictionary.landing.headerSignIn}
              </Link>
              <Link href="/sign-up" className={buttonVariants({ size: "sm" })}>
                {dictionary.landing.headerSignUp}
              </Link>
            </nav>
          )}
        </div>
      </header>

      <LandingHero />

      <div className="space-y-12">
        <ScoringTeaser />
      </div>
    </main>
  );
}
