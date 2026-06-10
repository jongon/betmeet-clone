import { eligibilityMessage } from "../services/eligibility";
import type { PredictionMatchView } from "../types";

export function PredictionStatusSummary({ match }: { match: PredictionMatchView }) {
  const hasPrediction = match.prediction !== null;
  const isLocked = match.prediction?.lockedAt !== null || !match.canEdit;

  if (match.status === "CANCELLED") {
    return (
      <p className="text-xs text-muted-foreground" data-testid="prediction-status-summary">
        Partido cancelado. No suma puntos.
      </p>
    );
  }

  if (match.status === "POSTPONED") {
    return (
      <p className="text-xs text-muted-foreground" data-testid="prediction-status-summary">
        Partido postergado. Las predicciones están pausadas.
      </p>
    );
  }

  if (!match.homeTeam || !match.awayTeam) {
    return (
      <p className="text-xs text-muted-foreground" data-testid="prediction-status-summary">
        Predicción disponible cuando se definan los equipos.
      </p>
    );
  }

  if (!match.kickoffAt) {
    return (
      <p className="text-xs text-muted-foreground" data-testid="prediction-status-summary">
        Horario pendiente; aún no se puede predecir.
      </p>
    );
  }

  if (match.canEdit && !hasPrediction) {
    return (
      <p className="text-xs text-muted-foreground" data-testid="prediction-status-summary">
        Aún no guardaste predicción. Si no guardas antes del inicio, no sumas puntos.
      </p>
    );
  }

  if (match.canEdit && hasPrediction) {
    return (
      <p className="text-xs text-muted-foreground" data-testid="prediction-status-summary">
        Predicción guardada. Puedes cambiarla hasta el inicio del partido.
      </p>
    );
  }

  if (match.prediction?.lockedAt && hasPrediction) {
    return (
      <p className="text-xs text-muted-foreground" data-testid="prediction-status-summary">
        Predicción bloqueada.
      </p>
    );
  }

  if (isLocked && !hasPrediction) {
    return (
      <p className="text-xs text-muted-foreground" data-testid="prediction-status-summary">
        Sin predicción guardada; no suma puntos en este partido.
      </p>
    );
  }

  const msg = match.lockReason ? eligibilityMessage(match.lockReason) : null;
  if (msg) {
    return (
      <p className="text-xs text-muted-foreground" data-testid="prediction-status-summary">
        {msg}
      </p>
    );
  }

  return null;
}
