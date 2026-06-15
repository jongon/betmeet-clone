import Link from "next/link";
import { AdminContextBadge, PrimaryNav } from "@/components/layout/primary-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { BrandToggle } from "@/components/theme/brand-toggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getProfile } from "@/features/profile/queries";
import { getDisplayNickname } from "@/features/profile/types";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/lib/locale";

/**
 * Global app chrome for authenticated routes (and admin). Server component so it
 * can read the session profile; interactive bits (nav, toggles, user menu) are
 * client components. Session/onboarding/admin gating stays in src/proxy.ts.
 */
export async function AppHeader() {
  const dictionary = getDictionary(await getRequestLocale());
  const profile = await getProfile();
  const isAdmin = profile?.verificationStatus === "ADMIN";

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
        <div className="flex items-center gap-2">
          <PrimaryNav />
          <Link
            href="/matches"
            aria-label={dictionary.nav.brandHome}
            className="font-display text-lg font-bold tracking-tight"
          >
            {dictionary.common.appName}
          </Link>
          <AdminContextBadge />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <BrandToggle />
          <ThemeToggle />
          {profile ? (
            <UserMenu
              displayNickname={getDisplayNickname(profile)}
              avatarUrl={profile.avatarUrl}
              isAdmin={isAdmin}
            />
          ) : (
            <Link
              href="/sign-in"
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {dictionary.common.signIn}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
