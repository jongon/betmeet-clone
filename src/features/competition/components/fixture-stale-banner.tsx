"use client";

import { useDictionary, useLocale } from "@/i18n/dictionary-provider";
import type { FixtureFreshness } from "../types";

export function FixtureStaleBanner({ freshness }: { freshness: FixtureFreshness }) {
  const locale = useLocale();
  const { competition } = useDictionary();

  if (!freshness.isStale) return null;

  const last = freshness.lastSyncedAt
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(freshness.lastSyncedAt),
      )
    : competition.noSuccessfulSync;

  return (
    <div
      className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm"
      data-testid="fixture-stale-banner"
    >
      {competition.stale} {last}.
    </div>
  );
}
