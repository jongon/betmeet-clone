"use client";

import { Button } from "@/components/ui/button";

interface PredictionScoreControlsProps {
  homeScore: number;
  awayScore: number;
  homeLabel: string;
  awayLabel: string;
  onChange: (home: number, away: number) => void;
  disabled?: boolean;
}

export function PredictionScoreControls({
  homeScore,
  awayScore,
  homeLabel,
  awayLabel,
  onChange,
  disabled,
}: PredictionScoreControlsProps) {
  function clamp(value: number) {
    return Math.max(0, Math.min(20, value));
  }

  return (
    <div className="flex items-center gap-4" data-testid="prediction-score-controls">
      <div className="flex flex-1 flex-col items-center gap-1">
        <span className="text-xs text-muted-foreground">{homeLabel}</span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={disabled || homeScore <= 0}
            onClick={() => onChange(clamp(homeScore - 1), awayScore)}
            aria-label="Reducir goles de casa"
          >
            −
          </Button>
          <span
            className="w-8 text-center font-mono text-lg font-semibold tabular-nums"
            data-testid="prediction-home-score"
          >
            {homeScore}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={disabled || homeScore >= 20}
            onClick={() => onChange(clamp(homeScore + 1), awayScore)}
            aria-label="Aumentar goles de casa"
          >
            +
          </Button>
        </div>
      </div>
      <span className="text-sm font-medium text-muted-foreground">vs</span>
      <div className="flex flex-1 flex-col items-center gap-1">
        <span className="text-xs text-muted-foreground">{awayLabel}</span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={disabled || awayScore <= 0}
            onClick={() => onChange(homeScore, clamp(awayScore - 1))}
            aria-label="Reducir goles de fuera"
          >
            −
          </Button>
          <span
            className="w-8 text-center font-mono text-lg font-semibold tabular-nums"
            data-testid="prediction-away-score"
          >
            {awayScore}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={disabled || awayScore >= 20}
            onClick={() => onChange(homeScore, clamp(awayScore + 1))}
            aria-label="Aumentar goles de fuera"
          >
            +
          </Button>
        </div>
      </div>
    </div>
  );
}
