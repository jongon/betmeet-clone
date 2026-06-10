import type { PredictionMatchView } from "../types";

export function PredictionVsResult({ match }: { match: PredictionMatchView }) {
  const hasPrediction = match.prediction !== null;
  const hasResult = match.homeScore !== null && match.awayScore !== null;
  const isLive = match.status === "LIVE";
  const isFinished = match.status === "FINISHED";

  if (!hasPrediction && !hasResult) return null;

  return (
    <div className="space-y-2 border-t pt-3" data-testid="prediction-vs-result">
      {hasPrediction && match.prediction && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Tu predicción</span>
          <span className="font-mono font-semibold tabular-nums">
            {match.prediction.homeScore} - {match.prediction.awayScore}
            {match.prediction.penaltyWinnerTeamId && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">(pen.)</span>
            )}
          </span>
        </div>
      )}
      {hasResult && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {isLive ? "Marcador actual" : "Resultado final"}
          </span>
          <span className="font-mono font-semibold tabular-nums">
            {match.homeScore} - {match.awayScore}
            {match.homePenaltyScore !== null && match.awayPenaltyScore !== null && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                ({match.homePenaltyScore}-{match.awayPenaltyScore} pen.)
              </span>
            )}
          </span>
        </div>
      )}
      {isFinished && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Puntos</span>
          <span className="font-mono text-xs text-muted-foreground">Pendiente de cálculo</span>
        </div>
      )}
    </div>
  );
}
