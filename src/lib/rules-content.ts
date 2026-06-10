import { allRules } from "content-collections";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";

export type RuleDoc = (typeof allRules)[number];

/** Full rules for the Rules Center (audience=full), ordered. */
export function getFullRules(locale: Locale = DEFAULT_LOCALE): RuleDoc[] {
  return allRules
    .filter((doc) => doc.locale === locale && doc.audience === "full")
    .sort((a, b) => a.order - b.order);
}

/** Public teaser rules for the landing (audience=teaser), ordered. */
export function getTeaserRules(locale: Locale = DEFAULT_LOCALE): RuleDoc[] {
  return allRules
    .filter((doc) => doc.locale === locale && doc.audience === "teaser")
    .sort((a, b) => a.order - b.order);
}
