"use client";

import { Badge } from "@/components/ui/badge";
import { useDictionary, useLocale } from "@/i18n/dictionary-provider";
import type { AdminMatchRow } from "../types";
import { ForceResultDialog } from "./force-result-dialog";
import { RevertOverrideButton } from "./revert-override-button";

export function AdminMatchList({ matches }: { matches: AdminMatchRow[] }) {
  const t = useDictionary().admin;
  const locale = useLocale();

  if (matches.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.noMatches}</p>;
  }

  return (
    <ul className="divide-y rounded-xl border" data-testid="admin-match-list">
      {matches.map((match) => (
        <li
          key={match.id}
          data-testid={`admin-match-${match.id}`}
          className="flex flex-wrap items-center justify-between gap-3 p-3"
        >
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-medium">
              <span className="truncate">{match.label}</span>
              {match.isOverridden && <Badge variant="secondary">Override</Badge>}
            </p>
            <p className="text-xs text-muted-foreground">
              {match.status}
              {match.homeScore !== null && match.awayScore !== null
                ? ` · ${match.homeScore}-${match.awayScore}`
                : ""}
              {match.kickoffAt ? ` · ${new Date(match.kickoffAt).toLocaleString(locale)}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {match.isOverridden && <RevertOverrideButton matchId={match.id} />}
            {match.homeTeamId && match.awayTeamId ? (
              <ForceResultDialog match={match} />
            ) : (
              <span className="text-xs text-muted-foreground">{t.noTeams}</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
