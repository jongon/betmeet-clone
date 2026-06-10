/**
 * i18n configuration (Unit 2, Q6=B realised as Option A).
 *
 * v1 ships a single active locale (`es`). All user-facing copy is referenced
 * through dictionary keys and content is organised per-locale, so adding a
 * second language later does not require touching components — only adding a
 * dictionary and a content folder, and (then) introducing the `[locale]`
 * URL segment.
 */
export const SUPPORTED_LOCALES = ["es"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "es";

export function isSupportedLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
