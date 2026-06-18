"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDate } from "./format-date-pure";

export { formatDate };

/**
 * Renders `fallback` during SSR and recomputes `format(value)` after
 * hydration. Date formatting depends on the runtime timezone/ICU, so the
 * server (UTC) and the browser would otherwise emit mismatching text and
 * break hydration. Computing on the client keeps everything in the user's
 * local timezone.
 */
function useClientDate(value: string | null, fallback: string, format: (value: string) => string) {
  const [text, setText] = useState(fallback);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setText(value ? format(value) : fallback);
  }, [value, fallback, format]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return text;
}

function formatLocalDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

/**
 * Locale-aware date that resolves to the user's local timezone after
 * hydration. Used by the front office so events show in the viewer's time.
 */
export function useIsoDate(value: string | null, locale: string, fallback: string) {
  const format = useCallback((v: string) => formatLocalDate(v, locale), [locale]);
  return useClientDate(value, fallback, format);
}

/** Compact local-timezone date (`DD/MM HH:MM`) rendered as inline text. */
export function LocalDate({ value, fallback = "—" }: { value: string | null; fallback?: string }) {
  const text = useClientDate(value, fallback, formatDate);
  return <span suppressHydrationWarning>{text}</span>;
}
