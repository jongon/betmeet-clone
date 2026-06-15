import { LogOut } from "lucide-react";
import { BrandToggle } from "@/components/theme/brand-toggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions/sign-out";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/lib/locale";

/**
 * Minimal chrome for the onboarding flow (FR-REFINE-16.3). Deliberately NOT the
 * full AppHeader: that one carries PrimaryNav and a UserMenu that link to app
 * routes (/matches, /settings, /admin) which an un-onboarded user is gated away
 * from — they would just bounce back here. This header exposes only what makes
 * sense mid-onboarding: theme/brand toggles and sign-out (reusing the existing
 * `signOut` server action). No session read needed.
 */
export async function OnboardingHeader() {
  const dictionary = getDictionary(await getRequestLocale());

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
        <span className="font-display text-lg font-bold tracking-tight">
          {dictionary.common.appName}
        </span>

        <div className="ml-auto flex items-center gap-1">
          <BrandToggle />
          <ThemeToggle />
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              className="h-9 gap-2 px-2.5 text-muted-foreground hover:text-foreground"
              data-testid="onboarding-sign-out"
            >
              <LogOut aria-hidden="true" className="size-4" />
              <span className="hidden sm:inline">{dictionary.userMenu.signOut}</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
