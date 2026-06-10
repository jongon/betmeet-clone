import { es } from "@/i18n/dictionaries/es";
import { cn } from "@/lib/utils";

const ROWS = [
  { label: es.scoring.exact, points: es.scoring.exactPoints },
  { label: es.scoring.result, points: es.scoring.resultPoints },
  { label: es.scoring.partial, points: es.scoring.partialPoints },
  { label: es.scoring.miss, points: es.scoring.missPoints },
  { label: es.scoring.penaltyBonus, points: es.scoring.penaltyBonusPoints },
];

/**
 * Static scoring table. Used as the public teaser fallback and as the static
 * fallback when the interactive calculator fails (NFR-Design Pattern 3).
 */
export function ScoringTable({ className }: { className?: string }) {
  return (
    <ul className={cn("divide-y rounded-md border", className)} data-testid="scoring-table">
      {ROWS.map((row) => (
        <li key={row.label} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
          <span className="text-muted-foreground">{row.label}</span>
          <span className="font-semibold whitespace-nowrap">{row.points}</span>
        </li>
      ))}
    </ul>
  );
}
