"use client";

import { usePathname } from "next/navigation";
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
  const labels = dictionary.language;

  return (
    <fieldset className="space-y-2" data-testid="language-toggle">
      <legend className={compact ? "sr-only" : "text-sm font-medium"}>{labels.label}</legend>
      <div className="flex flex-wrap gap-2">
        {SUPPORTED_LOCALES.map((locale) => {
          const isActive = locale === activeLocale;
          return (
            <form action={setLocale} key={locale}>
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="path" value={pathname} />
              <Button
                type="submit"
                size="sm"
                variant={isActive ? "default" : "outline"}
                aria-pressed={isActive}
                data-testid={`language-toggle-${locale}`}
              >
                {localeLabel(locale, labels)}
              </Button>
            </form>
          );
        })}
      </div>
    </fieldset>
  );
}
