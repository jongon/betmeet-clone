"use client";

import { useState, useSyncExternalStore } from "react";
import { MatchCard } from "@/features/competition/components/match-card";
import { useLiveResults } from "@/features/competition/hooks/use-live-results";
import {
  coerceTimeZone,
  type FixtureDayGroup,
  formatLocalDayKey,
  partitionDaysByToday,
  regroupFixtureDaysByTimeZone,
} from "@/features/predictions/services/fixture-by-day";
import { useDictionary, useLocale } from "@/i18n/dictionary-provider";

interface MatchesFixtureViewProps {
  /** Server-rendered day groups. Re-grouped client-side with the browser timezone. */
  days: FixtureDayGroup[];
}

function subscribeToTimeZone() {
  return () => {};
}

function getBrowserTimeZone() {
  return coerceTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
}

function DayGroup({ day }: { day: FixtureDayGroup }) {
  return (
    <section className="space-y-3" data-testid={`fixture-day-${day.dayKey ?? "tbd"}`}>
      <h2 className="text-xl font-semibold capitalize">{day.label}</h2>
      <div className="space-y-3">
        {day.matches.map((match) => (
          <MatchCard key={match.id} match={match} contextLabel={match.phaseName} />
        ))}
      </div>
    </section>
  );
}

/**
 * Renders the fixture grouped by the user's local calendar day, collapsing already-played
 * days behind a toggle so the current day lands at the top without scrolling
 * (FR-REFINE-30.2, FR-REFINE-30.3, FR-REFINE-42.1). Server groups are a UTC fallback;
 * after mount, the browser timezone drives grouping and the past/current split.
 */
export function MatchesFixtureView({ days }: MatchesFixtureViewProps) {
  const dictionary = useDictionary();
  const locale = useLocale();
  const [showPast, setShowPast] = useState(false);
  const timeZone = useSyncExternalStore(subscribeToTimeZone, getBrowserTimeZone, () => "UTC");

  // Unit 58: live result updates over Supabase Realtime — scores refresh without
  // a manual reload while matches are in play.
  useLiveResults();

  const localDays = regroupFixtureDaysByTimeZone(days, {
    locale,
    timeZone,
  });
  const today = formatLocalDayKey(new Date(), timeZone);
  const { pastDays, currentDays } = partitionDaysByToday(localDays, today);
  const hasPast = pastDays.length > 0;
  const pastMatchesCount = pastDays.reduce((total, day) => total + day.matches.length, 0);

  return (
    <div className="space-y-8" data-testid="fixture-ready">
      {hasPast ? (
        <button
          type="button"
          aria-expanded={showPast}
          onClick={() => setShowPast((value) => !value)}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          data-testid="toggle-past-matches"
        >
          {showPast
            ? dictionary.pages.matchesHidePast
            : dictionary.pages.matchesShowPast.replace("{count}", String(pastMatchesCount))}
        </button>
      ) : null}

      {hasPast && showPast
        ? pastDays.map((day) => <DayGroup key={day.dayKey ?? "tbd"} day={day} />)
        : null}

      {currentDays.map((day) => (
        <DayGroup key={day.dayKey ?? "tbd"} day={day} />
      ))}
    </div>
  );
}
