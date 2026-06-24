"use client";

import { Check, Languages } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { startTransition, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { setLocale } from "@/features/profile/actions/set-locale";
import { type Locale, SUPPORTED_LOCALES } from "@/i18n/config";
import { useDictionary, useLocale } from "@/i18n/dictionary-provider";
import { cn } from "@/lib/utils";

function localeLabel(locale: Locale, labels: ReturnType<typeof useDictionary>["language"]) {
  return locale === "es" ? labels.spanish : labels.english;
}

/**
 * Header language selector (Unit 64). Same capability as the Settings/Profile
 * `LanguageToggle`, but surfaced directly in the app chrome as an icon + popover
 * mirroring `BrandToggle`, so the bilingual `es`/`en` switch (Unit 24) is
 * discoverable without opening the user menu.
 */
export function LanguageMenu() {
  const dictionary = useDictionary();
  const labels = dictionary.language;
  const activeLocale = useLocale();
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [pending, setTransitionPending] = useTransition();

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
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={labels.select}
            title={labels.label}
            data-testid="language-menu"
          >
            <Languages className="size-4" aria-hidden="true" />
          </Button>
        }
      />
      <PopoverContent align="end" className="w-44 p-2">
        <p className="px-2 pt-1 pb-2 text-xs font-medium text-muted-foreground">{labels.label}</p>
        <div className="flex flex-col gap-1">
          {SUPPORTED_LOCALES.map((locale) => {
            const active = locale === activeLocale;
            return (
              <button
                key={locale}
                type="button"
                onClick={() => handleChange(locale)}
                aria-pressed={active}
                disabled={pending || active}
                data-testid={`language-menu-${locale}`}
                className={cn(
                  "flex items-center gap-3 rounded-md px-2 py-2 text-left text-sm outline-none transition-colors",
                  "hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                  active && "bg-accent font-medium",
                )}
              >
                {localeLabel(locale, labels)}
                {active && <Check className="ml-auto size-4 text-primary" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
