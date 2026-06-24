import Link from "next/link";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/lib/locale";

/**
 * Landing footer with the app name and a few public links. Server component;
 * copy from the dictionary (BR-67.7). Links only target public routes so
 * anonymous visitors are never bounced to a sign-in gate.
 */
export async function LandingFooter() {
  const dictionary = getDictionary(await getRequestLocale());
  const { footer } = dictionary.landing;
  const { appName } = dictionary.common;

  return (
    <footer className="mt-8 flex flex-col items-center gap-3 border-t pt-8 text-center sm:flex-row sm:justify-between sm:text-left">
      <div className="space-y-1">
        <p className="font-display text-base font-bold tracking-tight">{appName}</p>
        <p className="text-xs text-muted-foreground">{footer.tagline}</p>
      </div>
      <nav className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
        <Link href="#scoring" className="hover:text-foreground">
          {footer.scoring}
        </Link>
        <Link href="#faq" className="hover:text-foreground">
          {footer.faq}
        </Link>
        <Link href="/sign-in" className="hover:text-foreground">
          {footer.signIn}
        </Link>
        <Link href="/sign-up" className="hover:text-foreground">
          {footer.signUp}
        </Link>
      </nav>
    </footer>
  );
}
