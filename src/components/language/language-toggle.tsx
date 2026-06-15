"use client";

import { usePathname, useRouter } from "next/navigation";
import { startTransition, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setLocale } from "@/features/profile/actions/set-locale";
import { type Locale, SUPPORTED_LOCALES } from "@/i18n/config";
import { useDictionary, useLocale } from "@/i18n/dictionary-provider";

function localeLabel(locale: Locale, labels: ReturnType<typeof useDictionary>["language"]) {
  return locale === "es" ? labels.spanish : labels.english;
}

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const dictionary = useDictionary();
  const activeLocale = useLocale();
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [pending, setTransitionPending] = useTransition();
  const labels = dictionary.language;

  function handleChange(locale: Locale) {
    if (locale === activeLocale || pending) return;

    setTransitionPending(async () => {
      const result = await setLocale(locale, pathname);
      if (result?.success) {
        startTransition(() => router.refresh());
      }
    });
  }

  return (
    <fieldset className="space-y-2" data-testid="language-toggle">
      <legend className={compact ? "sr-only" : "text-sm font-medium"}>{labels.label}</legend>
      <div className="flex flex-wrap gap-2">
        {SUPPORTED_LOCALES.map((locale) => {
          const isActive = locale === activeLocale;
          return (
            <Button
              key={locale}
              type="button"
              size="sm"
              variant={isActive ? "default" : "outline"}
              aria-pressed={isActive}
              disabled={pending || isActive}
              onClick={() => handleChange(locale)}
              data-testid={`language-toggle-${locale}`}
            >
              {localeLabel(locale, labels)}
            </Button>
          );
        })}
      </div>
    </fieldset>
  );
}
