import type { PredictionLockReason } from "@/generated/prisma/enums";
import type { PredictionEligibility } from "../types";

interface MatchEligibilityInput {
  homeTeamId: string | null;
  awayTeamId: string | null;
  kickoffAt: Date | null;
  status: string;
}

/**
 * BL-5.0: decide if a user may create or update a prediction for a match.
 * Server time must be injected in tests but defaults to new Date() at runtime.
 */
export function getPredictionEligibility(
  match: MatchEligibilityInput,
  now: Date = new Date(),
): PredictionEligibility {
  if (!match.homeTeamId || !match.awayTeamId) {
    return { editable: false, reason: "MATCH_NOT_EDITABLE" as PredictionLockReason };
  }

  if (!match.kickoffAt) {
    return { editable: false, reason: "MATCH_NOT_EDITABLE" as PredictionLockReason };
  }

  if (now.getTime() >= match.kickoffAt.getTime()) {
    return { editable: false, reason: "KICKOFF_REACHED" as PredictionLockReason };
  }

  if (match.status !== "SCHEDULED") {
    if (match.status === "CANCELLED") {
      return { editable: false, reason: "CANCELLED" as PredictionLockReason };
    }
    if (match.status === "POSTPONED") {
      return { editable: false, reason: "POSTPONED" as PredictionLockReason };
    }
    return { editable: false, reason: "MATCH_STATUS_LOCKED" as PredictionLockReason };
  }

  return { editable: true };
}

export function eligibilityMessage(reason: PredictionLockReason): string {
  switch (reason) {
    case "KICKOFF_REACHED":
      return "El partido ya comenzó. No se pueden guardar predicciones.";
    case "MATCH_STATUS_LOCKED":
      return "El partido está bloqueado y no acepta predicciones.";
    case "MATCH_NOT_EDITABLE":
      return "Predicción disponible cuando se definan los equipos y el horario.";
    case "CANCELLED":
      return "El partido fue cancelado. No se aceptan predicciones.";
    case "POSTPONED":
      return "El partido fue postergado. Las predicciones están pausadas.";
  }
}
