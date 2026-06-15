"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/i18n/dictionary-provider";
import { savePrediction } from "../actions/save-prediction";
import type { PredictionMatchView } from "../types";
import { PenaltyWinnerSelector } from "./penalty-winner-selector";
import { PredictionScoreControls } from "./prediction-score-controls";
import { PredictionStatusSummary } from "./prediction-status-summary";
import { PredictionVsResult } from "./prediction-vs-result";

interface PredictionFormProps {
  match: PredictionMatchView;
}

export function PredictionForm({ match }: PredictionFormProps) {
  const t = useDictionary().predictions;
  const [homeScore, setHomeScore] = useState(match.prediction?.homeScore ?? 0);
  const [awayScore, setAwayScore] = useState(match.prediction?.awayScore ?? 0);
  const [penaltyWinner, setPenaltyWinner] = useState<string | null>(
    match.prediction?.penaltyWinnerTeamId ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [lockedConflict, setLockedConflict] = useState(false);
  const [savedPrediction, setSavedPrediction] = useState(match.prediction);
  const [canEdit, setCanEdit] = useState(match.canEdit);

  // Reset form state when navigating to a different match (React's "adjust
  // state during render" pattern — avoids setState inside an effect).
  const [prevMatchId, setPrevMatchId] = useState(match.id);
  if (match.id !== prevMatchId) {
    setPrevMatchId(match.id);
    setHomeScore(match.prediction?.homeScore ?? 0);
    setAwayScore(match.prediction?.awayScore ?? 0);
    setPenaltyWinner(match.prediction?.penaltyWinnerTeamId ?? null);
    setSavedPrediction(match.prediction);
    setCanEdit(match.canEdit);
    setLockedConflict(false);
    setError(null);
  }

  const hasExisting = savedPrediction !== null;
  const showPenaltySelector =
    match.showPenaltySelector &&
    canEdit &&
    homeScore === awayScore &&
    match.homeTeam &&
    match.awayTeam;

  async function handleSave() {
    setPending(true);
    setError(null);
    setLockedConflict(false);

    const result = await savePrediction({
      matchId: match.id,
      homeScore,
      awayScore,
      penaltyWinnerTeamId: showPenaltySelector ? penaltyWinner : null,
    });

    setPending(false);

    if ("success" in result) {
      setSavedPrediction({
        id: "pending",
        homeScore,
        awayScore,
        penaltyWinnerTeamId: showPenaltySelector ? penaltyWinner : null,
        lockedAt: null,
        lockReason: null,
      });
      return;
    }

    // Lock conflict: the server rejected the save
    setLockedConflict(true);
    setError("error" in result ? result.error : null);
    setCanEdit(false);
  }

  const isReadOnly = !canEdit || lockedConflict;

  return (
    <div className="space-y-3" data-testid={`prediction-card-${match.id}`}>
      {!isReadOnly && (
        <PredictionScoreControls
          homeScore={homeScore}
          awayScore={awayScore}
          homeLabel={match.homeTeam?.name ?? t.home}
          awayLabel={match.awayTeam?.name ?? t.away}
          onChange={(h, a) => {
            setHomeScore(h);
            setAwayScore(a);
            if (h !== a) setPenaltyWinner(null);
          }}
          disabled={pending}
        />
      )}

      {showPenaltySelector && match.homeTeam && match.awayTeam && (
        <PenaltyWinnerSelector
          homeTeamName={match.homeTeam.name}
          awayTeamName={match.awayTeam.name}
          homeTeamId={match.homeTeam.id}
          awayTeamId={match.awayTeam.id}
          value={penaltyWinner}
          onChange={setPenaltyWinner}
          disabled={pending}
        />
      )}

      {isReadOnly && savedPrediction && (
        <div className="rounded-md bg-muted/40 p-3 text-center">
          <p className="font-mono text-lg font-semibold tabular-nums">
            {savedPrediction.homeScore} - {savedPrediction.awayScore}
            {savedPrediction.penaltyWinnerTeamId && (
              <span className="ml-1 text-xs font-normal text-muted-foreground">(pen.)</span>
            )}
          </p>
        </div>
      )}

      {isReadOnly && !savedPrediction && (
        <div className="rounded-md bg-muted/40 p-3 text-center">
          <p className="text-sm text-muted-foreground">{t.noPrediction}</p>
        </div>
      )}

      {!isReadOnly && (
        <div className="flex items-center justify-between gap-2">
          <Button
            data-testid="prediction-save-button"
            disabled={pending}
            onClick={handleSave}
            size="sm"
          >
            {pending ? t.saving : hasExisting ? t.update : t.save}
          </Button>
        </div>
      )}

      {error && (
        <p
          className="text-xs text-destructive"
          data-testid={lockedConflict ? "prediction-lock-conflict" : undefined}
        >
          {error}
        </p>
      )}

      <PredictionStatusSummary match={{ ...match, prediction: savedPrediction, canEdit }} />
      <PredictionVsResult match={{ ...match, prediction: savedPrediction }} />
    </div>
  );
}
