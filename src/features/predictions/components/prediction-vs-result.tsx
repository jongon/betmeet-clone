"use client";

import { ScoreBreakdownExplainer } from "@/features/education/components/score-breakdown-explainer";
import { useDictionary } from "@/i18n/dictionary-provider";
import type { PredictionMatchView } from "../types";

export function PredictionVsResult({ match }: { match: PredictionMatchView }) {
  const t = useDictionary().predictions;
  const hasPrediction = match.prediction !== null;
  const hasResult = match.homeScore !== null && match.awayScore !== null;
  const isLive = match.status === "LIVE";
  const isFinished = match.status === "FINISHED";

  if (!hasPrediction && !hasResult) return null;

  return (
    <div className="space-y-2 border-t pt-3" data-testid="prediction-vs-result">
      {hasPrediction && match.prediction && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t.yourPrediction}</span>
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
          <span className="text-muted-foreground">{isLive ? t.liveScore : t.finalScore}</span>
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
      {isFinished && hasPrediction && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t.points}</span>
            {match.pointsStatus === "SCORED" ? (
              <span
                className="font-semibold tabular-nums"
                data-testid={`prediction-points-${match.id}`}
              >
                {match.points} {t.pts}
              </span>
            ) : (
              <span className="font-mono text-xs text-muted-foreground">{t.pendingScore}</span>
            )}
          </div>
          {match.pointsStatus === "SCORED" && match.breakdown && (
            <ScoreBreakdownExplainer breakdown={match.breakdown} />
          )}
        </div>
      )}
    </div>
  );
}
