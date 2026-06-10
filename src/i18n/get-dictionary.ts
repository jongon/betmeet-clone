import { DEFAULT_LOCALE, type Locale } from "./config";
import { es } from "./dictionaries/es";
import type { Dictionary } from "./types";

const dictionaries: Record<Locale, Dictionary> = {
  es,
};

/**
 * Returns the dictionary for the given locale. v1 only has `es`; the signature
 * already accepts a locale so call sites do not change when more are added.
 */
export function getDictionary(locale: Locale = DEFAULT_LOCALE): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}
