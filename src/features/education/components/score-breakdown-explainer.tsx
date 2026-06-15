"use client";

import type { ScoreBreakdown } from "@/features/scoring/compute-score";
import { useDictionary } from "@/i18n/dictionary-provider";
import { cn } from "@/lib/utils";

interface ScoreBreakdownExplainerProps {
  breakdown: ScoreBreakdown;
  className?: string;
  /** When true, announces changes to screen readers (used by the live calculator). */
  live?: boolean;
}

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
  const { breakdown: labels } = useDictionary();
  const explanation: Record<ScoreBreakdown["explanationKey"], string> = {
    EXACT: labels.exact,
    RESULT: labels.result,
    PARTIAL: labels.partial,
    MISS: labels.miss,
  };

  return (
    <div
      className={cn("space-y-2 text-sm", className)}
      aria-live={live ? "polite" : undefined}
      data-testid="score-breakdown"
    >
      <p className="text-muted-foreground">
        {explanation[breakdown.explanationKey]}
        {breakdown.penaltyApplied ? ` ${labels.penaltyApplied}` : ""}
      </p>
      <dl className="space-y-1">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{labels.base}</dt>
          <dd>{breakdown.basePoints}</dd>
        </div>
        {breakdown.penaltyApplied && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{labels.penalty}</dt>
            <dd>+{breakdown.penaltyPoints}</dd>
          </div>
        )}
        <div className="flex justify-between border-t pt-1 font-semibold">
          <dt>{labels.total}</dt>
          <dd data-testid="score-breakdown-total">{breakdown.totalPoints}</dd>
        </div>
      </dl>
    </div>
  );
}
