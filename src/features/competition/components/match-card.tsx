"use client";

import { PredictionForm } from "@/features/predictions/components/prediction-form";
import type { PredictionMatchView } from "@/features/predictions/types";
import { useDictionary, useLocale } from "@/i18n/dictionary-provider";
import type { MatchView } from "../types";
import { MatchStatusBadge } from "./match-status-badge";
import { TeamBadge } from "./team-badge";

function formatLocalDate(value: string | null, locale: string, fallback: string) {
  if (!value) return fallback;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function score(match: MatchView) {
  if (match.homeScore === null || match.awayScore === null) return "vs";
  return `${match.homeScore} - ${match.awayScore}`;
}

export function MatchCard({
  match,
  contextLabel,
}: {
  match: PredictionMatchView | MatchView;
  /** Optional group/round label shown in views that aren't grouped by phase. */
  contextLabel?: string;
}) {
  const locale = useLocale();
  const { competition } = useDictionary();
  const isPredictionMatch = "canEdit" in match;

  return (
    <article className="rounded-xl border p-4" data-testid={`match-card-${match.id}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {contextLabel ? `${contextLabel} · ` : ""}
          {match.matchNumber ? `${competition.match}${match.matchNumber} · ` : ""}
          {formatLocalDate(match.kickoffAt, locale, competition.kickoffTbd)}
        </p>
        <MatchStatusBadge status={match.status} />
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <TeamBadge team={match.homeTeam} placeholder={match.homePlaceholder} />
        <p className="tabular-nums-display text-center text-2xl font-bold sm:px-3">
          {score(match)}
        </p>
        <div className="sm:justify-self-end">
          <TeamBadge team={match.awayTeam} placeholder={match.awayPlaceholder} />
        </div>
      </div>
      {isPredictionMatch && (
        <div className="mt-4 border-t pt-3">
          <PredictionForm match={match as PredictionMatchView} />
        </div>
      )}
    </article>
  );
}
