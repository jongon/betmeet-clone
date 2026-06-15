/**
 * i18n configuration (Unit 24). The app stays on stable URLs (no `[locale]`
 * route segment); locale is resolved from cookie/profile/header instead.
 */
export const SUPPORTED_LOCALES = ["es", "en"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "es";

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  if (!value) return false;
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function parseLocale(value: string | null | undefined): Locale | null {
  return isSupportedLocale(value) ? value : null;
}

export function localeFromAcceptLanguage(value: string | null | undefined): Locale | null {
  if (!value) return null;

  const entries = value
    .split(",")
    .map((entry) => entry.trim().split(";")[0]?.toLowerCase())
    .filter(Boolean);

  for (const entry of entries) {
    const base = entry?.split("-")[0];
    if (isSupportedLocale(base)) return base;
  }

  return null;
}
