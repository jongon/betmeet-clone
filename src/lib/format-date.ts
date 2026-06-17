"use client";

import { useEffect, useState } from "react";
import { formatDate } from "./format-date-pure";

export { formatDate };

function formatLocalDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/**
 * Renders `fallback` during SSR and replaces it with a locale-aware
 * formatted date after client hydration, avoiding mismatches when
 * Node's ICU and the browser's Intl disagree on the same locale string.
 */
export function useIsoDate(value: string | null, locale: string, fallback: string) {
  const [formatted, setFormatted] = useState(fallback);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!value) {
      setFormatted(fallback);
      return;
    }
    setFormatted(formatLocalDate(value, locale));
  }, [value, locale, fallback]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return formatted;
}
