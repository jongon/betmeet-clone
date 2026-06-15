"use client";

import { useDictionary } from "@/i18n/dictionary-provider";
import type { PredictionMatchView } from "../types";

export function PredictionStatusSummary({ match }: { match: PredictionMatchView }) {
  const t = useDictionary().predictions;
  const hasPrediction = match.prediction !== null;
  const isLocked = match.prediction?.lockedAt !== null || !match.canEdit;

  if (match.status === "CANCELLED") {
    return (
      <p className="text-xs text-muted-foreground" data-testid="prediction-status-summary">
        {t.cancelled}
      </p>
    );
  }

  if (match.status === "POSTPONED") {
    return (
      <p className="text-xs text-muted-foreground" data-testid="prediction-status-summary">
        {t.postponed}
      </p>
    );
  }

  if (!match.homeTeam || !match.awayTeam) {
    return (
      <p className="text-xs text-muted-foreground" data-testid="prediction-status-summary">
        {t.teamsPending}
      </p>
    );
  }

  if (!match.kickoffAt) {
    return (
      <p className="text-xs text-muted-foreground" data-testid="prediction-status-summary">
        {t.kickoffPending}
      </p>
    );
  }

  if (match.canEdit && !hasPrediction) {
    return (
      <p className="text-xs text-muted-foreground" data-testid="prediction-status-summary">
        {t.unsavedOpen}
      </p>
    );
  }

  if (match.canEdit && hasPrediction) {
    return (
      <p className="text-xs text-muted-foreground" data-testid="prediction-status-summary">
        {t.savedOpen}
      </p>
    );
  }

  if (match.prediction?.lockedAt && hasPrediction) {
    return (
      <p className="text-xs text-muted-foreground" data-testid="prediction-status-summary">
        {t.locked}
      </p>
    );
  }

  if (isLocked && !hasPrediction) {
    return (
      <p className="text-xs text-muted-foreground" data-testid="prediction-status-summary">
        {t.unsavedLocked}
      </p>
    );
  }

  const msg = match.lockReason ? t.unavailable : null;
  if (msg) {
    return (
      <p className="text-xs text-muted-foreground" data-testid="prediction-status-summary">
        {msg}
      </p>
    );
  }

  return null;
}
