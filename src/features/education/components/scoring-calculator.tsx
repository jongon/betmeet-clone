"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  computeScore,
  derivePenaltyWinner,
  type ScoringExample,
} from "@/features/scoring/compute-score";
import { es } from "@/i18n/dictionaries/es";
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
  // Penalty shootout score (FR-REFINE-14.4), e.g. 4-3. The winner is derived.
  const [penaltyHome, setPenaltyHome] = useState(4);
  const [penaltyAway, setPenaltyAway] = useState(3);

  // Penalties are only available for a knockout tied at 90' (FR-REFINE-14.5).
  const showPenalty = isKnockout && actualHome === actualAway;

  // Winner derived from the shootout score; a tie is invalid (no winner).
  const derivedPenaltyWinner = derivePenaltyWinner(penaltyHome, penaltyAway);
  const penaltyTie = showPenalty && derivedPenaltyWinner === null;

  const breakdown = useMemo(() => {
    const winner = showPenalty ? derivedPenaltyWinner : null;
    const example: ScoringExample = {
      predictedHome,
      predictedAway,
      actualHome,
      actualAway,
      isKnockout,
      predictedPenaltyWinner: winner,
      // Demo assumes the user's penalty pick is the actual outcome so the bonus
      // is illustrated when a winner is set.
      actualPenaltyWinner: winner,
    };
    return computeScore(example);
  }, [
    predictedHome,
    predictedAway,
    actualHome,
    actualAway,
    isKnockout,
    derivedPenaltyWinner,
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
            <span className="text-sm font-medium">{es.calculator.penaltyScore}</span>
            <div className="flex items-end gap-3">
              <GoalInput
                id="pen-home"
                label={es.calculator.home}
                value={penaltyHome}
                onChange={setPenaltyHome}
              />
              <GoalInput
                id="pen-away"
                label={es.calculator.away}
                value={penaltyAway}
                onChange={setPenaltyAway}
              />
            </div>
            {penaltyTie ? (
              <p role="alert" className="text-sm text-destructive">
                {es.calculator.penaltyTie}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground" data-testid="calculator-penalty-winner">
                {es.calculator.penaltyDerivedWinner}{" "}
                {derivedPenaltyWinner === "home" ? es.calculator.home : es.calculator.away}
              </p>
            )}
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
