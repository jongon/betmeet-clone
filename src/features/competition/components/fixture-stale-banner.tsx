"use client";

import { useDictionary, useLocale } from "@/i18n/dictionary-provider";
import { useIsoDate } from "@/lib/format-date";
import type { FixtureFreshness } from "../types";

export function FixtureStaleBanner({ freshness }: { freshness: FixtureFreshness }) {
  const locale = useLocale();
  const { competition } = useDictionary();

  const last = useIsoDate(freshness.lastSyncedAt, locale, competition.noSuccessfulSync);

  if (!freshness.isStale) return null;

  return (
    <div
      className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm"
      data-testid="fixture-stale-banner"
    >
      {competition.stale} {last}.
    </div>
  );
}
