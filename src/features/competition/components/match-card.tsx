import type { MatchView } from "../types";
import { MatchStatusBadge } from "./match-status-badge";
import { TeamBadge } from "./team-badge";

function formatLocalDate(value: string | null) {
  if (!value) return "Horario por confirmar";
  return new Intl.DateTimeFormat("es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function score(match: MatchView) {
  if (match.homeScore === null || match.awayScore === null) return "vs";
  return `${match.homeScore} - ${match.awayScore}`;
}

export function MatchCard({ match }: { match: MatchView }) {
  return (
    <article className="rounded-xl border p-4" data-testid={`match-card-${match.id}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {match.matchNumber ? `Partido ${match.matchNumber} · ` : ""}
          {formatLocalDate(match.kickoffAt)}
        </p>
        <MatchStatusBadge status={match.status} />
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <TeamBadge team={match.homeTeam} placeholder={match.homePlaceholder} />
        <p className="text-center text-lg font-semibold">{score(match)}</p>
        <div className="sm:justify-self-end">
          <TeamBadge team={match.awayTeam} placeholder={match.awayPlaceholder} />
        </div>
      </div>
    </article>
  );
}
