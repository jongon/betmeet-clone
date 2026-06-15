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
import { useDictionary } from "@/i18n/dictionary-provider";
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
 * reuses computeScore — never defines its own rules (BR-2.7). When a knockout
 * is tied at 90', the penalty shootout is captured for BOTH the prediction and
 * the actual result, mirroring the main score layout (FR-REFINE-15.7); the
 * winner of each shootout is derived and the bonus applies only when they match.
 */
export function ScoringCalculator() {
  const { calculator } = useDictionary();
  const [predictedHome, setPredictedHome] = useState(2);
  const [predictedAway, setPredictedAway] = useState(2);
  const [actualHome, setActualHome] = useState(2);
  const [actualAway, setActualAway] = useState(2);
  const [isKnockout, setIsKnockout] = useState(true);
  // Penalty shootout scores (FR-REFINE-14.4 / 15.7), e.g. 4-3. Winners are derived.
  const [predictedPenaltyHome, setPredictedPenaltyHome] = useState(4);
  const [predictedPenaltyAway, setPredictedPenaltyAway] = useState(3);
  const [actualPenaltyHome, setActualPenaltyHome] = useState(4);
  const [actualPenaltyAway, setActualPenaltyAway] = useState(2);

  // Penalties are only available for a knockout tied at 90' (FR-REFINE-14.5).
  const showPenalty = isKnockout && actualHome === actualAway;

  // Winner derived from each shootout score; a tie is invalid (no winner).
  const derivedPredictedPenaltyWinner = derivePenaltyWinner(
    predictedPenaltyHome,
    predictedPenaltyAway,
  );
  const derivedActualPenaltyWinner = derivePenaltyWinner(actualPenaltyHome, actualPenaltyAway);
  const predictedPenaltyTie = showPenalty && derivedPredictedPenaltyWinner === null;
  const actualPenaltyTie = showPenalty && derivedActualPenaltyWinner === null;

  const breakdown = useMemo(() => {
    const example: ScoringExample = {
      predictedHome,
      predictedAway,
      actualHome,
      actualAway,
      isKnockout,
      predictedPenaltyWinner: showPenalty ? derivedPredictedPenaltyWinner : null,
      actualPenaltyWinner: showPenalty ? derivedActualPenaltyWinner : null,
    };
    return computeScore(example);
  }, [
    predictedHome,
    predictedAway,
    actualHome,
    actualAway,
    isKnockout,
    derivedPredictedPenaltyWinner,
    derivedActualPenaltyWinner,
    showPenalty,
  ]);

  return (
    <Card data-testid="scoring-calculator">
      <CardHeader>
        <CardTitle>{calculator.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{calculator.description}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{calculator.prediction}</legend>
            <div className="flex gap-3">
              <GoalInput
                id="pred-home"
                label={calculator.home}
                value={predictedHome}
                onChange={setPredictedHome}
              />
              <GoalInput
                id="pred-away"
                label={calculator.away}
                value={predictedAway}
                onChange={setPredictedAway}
              />
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{calculator.actual}</legend>
            <div className="flex gap-3">
              <GoalInput
                id="act-home"
                label={calculator.home}
                value={actualHome}
                onChange={setActualHome}
              />
              <GoalInput
                id="act-away"
                label={calculator.away}
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
            {calculator.knockout}
          </Label>
        </div>

        {showPenalty && (
          <fieldset className="space-y-3 rounded-md border border-dashed p-4">
            <legend className="px-1 text-sm font-medium">{calculator.penaltyShootout}</legend>
            <p className="text-sm text-muted-foreground">{calculator.penaltyBonusHint}</p>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <span className="text-sm font-medium">{calculator.prediction}</span>
                <div className="flex gap-3">
                  <GoalInput
                    id="pred-pen-home"
                    label={calculator.home}
                    value={predictedPenaltyHome}
                    onChange={setPredictedPenaltyHome}
                  />
                  <GoalInput
                    id="pred-pen-away"
                    label={calculator.away}
                    value={predictedPenaltyAway}
                    onChange={setPredictedPenaltyAway}
                  />
                </div>
                {predictedPenaltyTie ? (
                  <p role="alert" className="text-sm text-destructive">
                    {calculator.penaltyTie}
                  </p>
                ) : (
                  <p
                    className="text-sm text-muted-foreground"
                    data-testid="calculator-predicted-penalty-winner"
                  >
                    {calculator.penaltyDerivedWinner}{" "}
                    {derivedPredictedPenaltyWinner === "home" ? calculator.home : calculator.away}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium">{calculator.actual}</span>
                <div className="flex gap-3">
                  <GoalInput
                    id="act-pen-home"
                    label={calculator.home}
                    value={actualPenaltyHome}
                    onChange={setActualPenaltyHome}
                  />
                  <GoalInput
                    id="act-pen-away"
                    label={calculator.away}
                    value={actualPenaltyAway}
                    onChange={setActualPenaltyAway}
                  />
                </div>
                {actualPenaltyTie ? (
                  <p role="alert" className="text-sm text-destructive">
                    {calculator.penaltyTie}
                  </p>
                ) : (
                  <p
                    className="text-sm text-muted-foreground"
                    data-testid="calculator-actual-penalty-winner"
                  >
                    {calculator.penaltyDerivedWinner}{" "}
                    {derivedActualPenaltyWinner === "home" ? calculator.home : calculator.away}
                  </p>
                )}
              </div>
            </div>
          </fieldset>
        )}

        <div className="rounded-md border bg-muted/30 p-4">
          <p className="mb-2 text-sm font-medium">{calculator.total}</p>
          <ScoreBreakdownExplainer breakdown={breakdown} live />
        </div>
      </CardContent>
    </Card>
  );
}
