"use client";

interface PenaltyWinnerSelectorProps {
  homeTeamName: string;
  awayTeamName: string;
  homeTeamId: string;
  awayTeamId: string;
  value: string | null;
  onChange: (teamId: string | null) => void;
  disabled?: boolean;
}

export function PenaltyWinnerSelector({
  homeTeamName,
  awayTeamName,
  homeTeamId,
  awayTeamId,
  value,
  onChange,
  disabled,
}: PenaltyWinnerSelectorProps) {
  return (
    <div className="space-y-2" data-testid="prediction-penalty-winner">
      <p className="text-xs text-muted-foreground">
        Si empatan en eliminación directa, elige quién avanza por penales.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          data-testid="prediction-penalty-home"
          className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
            value === homeTeamId
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-background hover:bg-muted"
          } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
          disabled={disabled}
          onClick={() => onChange(homeTeamId)}
        >
          {homeTeamName}
        </button>
        <button
          type="button"
          data-testid="prediction-penalty-away"
          className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
            value === awayTeamId
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-background hover:bg-muted"
          } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
          disabled={disabled}
          onClick={() => onChange(awayTeamId)}
        >
          {awayTeamName}
        </button>
      </div>
    </div>
  );
}
