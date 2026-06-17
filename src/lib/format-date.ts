"use client";

import { useEffect, useState } from "react";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Locale-independent date string: DD/MM HH:MM. Safe for SSR — the same
 *  output on server and client because it never touches Intl/toLocaleString. */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
