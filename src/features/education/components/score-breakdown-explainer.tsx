import type { ScoreBreakdown } from "@/features/scoring/compute-score";
import { es } from "@/i18n/dictionaries/es";
import { cn } from "@/lib/utils";

interface ScoreBreakdownExplainerProps {
  breakdown: ScoreBreakdown;
  className?: string;
  /** When true, announces changes to screen readers (used by the live calculator). */
  live?: boolean;
}

const EXPLANATION: Record<ScoreBreakdown["explanationKey"], string> = {
  EXACT: es.breakdown.exact,
  RESULT: es.breakdown.result,
  PARTIAL: es.breakdown.partial,
  MISS: es.breakdown.miss,
};

/**
 * Data-agnostic explainer (BR-2.33): given a computed breakdown it renders the
 * explanation, base points, penalty bonus and total. No data fetching, no pool
 * context — Unit 6 reuses it with real predictions.
 */
export function ScoreBreakdownExplainer({
  breakdown,
  className,
  live = false,
}: ScoreBreakdownExplainerProps) {
  return (
    <div
      className={cn("space-y-2 text-sm", className)}
      aria-live={live ? "polite" : undefined}
      data-testid="score-breakdown"
    >
      <p className="text-muted-foreground">
        {EXPLANATION[breakdown.explanationKey]}
        {breakdown.penaltyApplied ? ` ${es.breakdown.penaltyApplied}` : ""}
      </p>
      <dl className="space-y-1">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{es.breakdown.base}</dt>
          <dd>{breakdown.basePoints}</dd>
        </div>
        {breakdown.penaltyApplied && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{es.breakdown.penalty}</dt>
            <dd>+{breakdown.penaltyPoints}</dd>
          </div>
        )}
        <div className="flex justify-between border-t pt-1 font-semibold">
          <dt>{es.breakdown.total}</dt>
          <dd data-testid="score-breakdown-total">{breakdown.totalPoints}</dd>
        </div>
      </dl>
    </div>
  );
}
