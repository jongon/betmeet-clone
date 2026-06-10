"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  computeScore,
  type PenaltyWinner,
  type ScoringExample,
} from "@/features/scoring/compute-score";
import { es } from "@/i18n/dictionaries/es";
import { cn } from "@/lib/utils";
import { ScoreBreakdownExplainer } from "./score-breakdown-explainer";

function clampGoals(value: string): number {
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n) || n < 0) return 0;
  return n;
}

function GoalInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <input
        id={id}
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(clampGoals(e.target.value))}
        data-testid={`calculator-${id}`}
        className="h-9 w-16 rounded-md border bg-transparent px-2 text-center text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}

/**
 * Interactive educational calculator (BL-1). Pure client-side preview that
 * reuses computeScore — never defines its own rules (BR-2.7). The penalty
 * winner selector only appears for a tied knockout score.
 */
export function ScoringCalculator() {
  const [predictedHome, setPredictedHome] = useState(2);
  const [predictedAway, setPredictedAway] = useState(1);
  const [actualHome, setActualHome] = useState(2);
  const [actualAway, setActualAway] = useState(1);
  const [isKnockout, setIsKnockout] = useState(false);
  const [predictedPenaltyWinner, setPredictedPenaltyWinner] = useState<PenaltyWinner>(null);

  const showPenalty = isKnockout && actualHome === actualAway;

  const breakdown = useMemo(() => {
    const example: ScoringExample = {
      predictedHome,
      predictedAway,
      actualHome,
      actualAway,
      isKnockout,
      predictedPenaltyWinner: showPenalty ? predictedPenaltyWinner : null,
      // Demo assumes the user's penalty pick is the actual outcome so the bonus
      // is illustrated when selected.
      actualPenaltyWinner: showPenalty ? predictedPenaltyWinner : null,
    };
    return computeScore(example);
  }, [
    predictedHome,
    predictedAway,
    actualHome,
    actualAway,
    isKnockout,
    predictedPenaltyWinner,
    showPenalty,
  ]);

  return (
    <Card data-testid="scoring-calculator">
      <CardHeader>
        <CardTitle>{es.calculator.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{es.calculator.description}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{es.calculator.prediction}</legend>
            <div className="flex gap-3">
              <GoalInput
                id="pred-home"
                label={es.calculator.home}
                value={predictedHome}
                onChange={setPredictedHome}
              />
              <GoalInput
                id="pred-away"
                label={es.calculator.away}
                value={predictedAway}
                onChange={setPredictedAway}
              />
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{es.calculator.actual}</legend>
            <div className="flex gap-3">
              <GoalInput
                id="act-home"
                label={es.calculator.home}
                value={actualHome}
                onChange={setActualHome}
              />
              <GoalInput
                id="act-away"
                label={es.calculator.away}
                value={actualAway}
                onChange={setActualAway}
              />
            </div>
          </fieldset>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="knockout"
            checked={isKnockout}
            onCheckedChange={(checked) => setIsKnockout(Boolean(checked))}
            data-testid="calculator-knockout"
          />
          <Label htmlFor="knockout" className="text-sm">
            {es.calculator.knockout}
          </Label>
        </div>

        {showPenalty && (
          <div className="space-y-2">
            <span className="text-sm font-medium">{es.calculator.penaltyWinner}</span>
            <div className="flex gap-2">
              {(["home", "away"] as const).map((side) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => setPredictedPenaltyWinner(side)}
                  data-testid={`calculator-penalty-${side}`}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    predictedPenaltyWinner === side
                      ? "border-primary bg-primary text-primary-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {side === "home" ? es.calculator.home : es.calculator.away}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-md border bg-muted/30 p-4">
          <p className="mb-2 text-sm font-medium">{es.calculator.total}</p>
          <ScoreBreakdownExplainer breakdown={breakdown} live />
        </div>
      </CardContent>
    </Card>
  );
}
