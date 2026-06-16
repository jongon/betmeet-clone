"use client";

import { useState } from "react";
import { MatchCard } from "@/features/competition/components/match-card";
import type { FixtureDayGroup } from "@/features/predictions/queries";
import { useDictionary } from "@/i18n/dictionary-provider";

interface MatchesFixtureViewProps {
  /** Days strictly before today (UTC), in chronological order. Hidden by default. */
  pastDays: FixtureDayGroup[];
  /** Today and upcoming days (incl. the "Fecha por confirmar" bucket). Always shown. */
  currentDays: FixtureDayGroup[];
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
 * Renders the fixture grouped by day, collapsing the already-played days behind a toggle so
 * the current day lands at the top without scrolling (FR-REFINE-30.2, FR-REFINE-30.3). The
 * past/current split is computed on the server (partitionDaysByToday); this component only
 * owns the show/hide state. Past days stay out of the DOM while collapsed.
 */
export function MatchesFixtureView({ pastDays, currentDays }: MatchesFixtureViewProps) {
  const dictionary = useDictionary();
  const [showPast, setShowPast] = useState(false);
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
