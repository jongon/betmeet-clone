"use client";

import { useDictionary } from "@/i18n/dictionary-provider";
import { cn } from "@/lib/utils";

/**
 * Static scoring table. Used as the public teaser fallback and as the static
 * fallback when the interactive calculator fails (NFR-Design Pattern 3).
 */
export function ScoringTable({ className }: { className?: string }) {
  const { scoring } = useDictionary();
  const rows = [
    { label: scoring.exact, points: scoring.exactPoints },
    { label: scoring.result, points: scoring.resultPoints },
    { label: scoring.partial, points: scoring.partialPoints },
    { label: scoring.miss, points: scoring.missPoints },
    { label: scoring.penaltyBonus, points: scoring.penaltyBonusPoints },
  ];

  return (
    <ul className={cn("divide-y rounded-md border", className)} data-testid="scoring-table">
      {rows.map((row) => (
        <li key={row.label} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
          <span className="text-muted-foreground">{row.label}</span>
          <span className="font-semibold whitespace-nowrap">{row.points}</span>
        </li>
      ))}
    </ul>
  );
}
