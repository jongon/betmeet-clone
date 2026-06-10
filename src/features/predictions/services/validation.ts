import type { PredictionInput } from "../types";

interface ValidationMatchContext {
  phaseType: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
}

interface ValidationError {
  field: string;
  message: string;
}

interface ValidationSuccess {
  valid: PredictionInput;
  errors: never[];
}

type ValidationResult = ValidationSuccess | { valid: null; errors: ValidationError[] };

/**
 * BL-5.2: Validate prediction input against match context.
 * Enforces score bounds, knockout penalty winner rules.
 */
export function validatePredictionInput(
  match: ValidationMatchContext,
  input: { homeScore: number; awayScore: number; penaltyWinnerTeamId: string | null },
): ValidationResult {
  const errors: ValidationError[] = [];

  if (!Number.isInteger(input.homeScore)) {
    errors.push({ field: "homeScore", message: "El marcador de casa debe ser un número entero." });
  } else if (input.homeScore < 0 || input.homeScore > 20) {
    errors.push({ field: "homeScore", message: "El marcador de casa debe estar entre 0 y 20." });
  }

  if (!Number.isInteger(input.awayScore)) {
    errors.push({ field: "awayScore", message: "El marcador de fuera debe ser un número entero." });
  } else if (input.awayScore < 0 || input.awayScore > 20) {
    errors.push({ field: "awayScore", message: "El marcador de fuera debe estar entre 0 y 20." });
  }

  const isKnockout = match.phaseType === "KNOCKOUT";
  const isDraw = input.homeScore === input.awayScore;
  const hasPenaltyWinner = input.penaltyWinnerTeamId !== null;

  if (isKnockout && isDraw) {
    if (!hasPenaltyWinner) {
      errors.push({
        field: "penaltyWinnerTeamId",
        message: "En fase de eliminación con empate, debes elegir quién avanza por penales.",
      });
    } else if (
      input.penaltyWinnerTeamId !== match.homeTeamId &&
      input.penaltyWinnerTeamId !== match.awayTeamId
    ) {
      errors.push({
        field: "penaltyWinnerTeamId",
        message: "El ganador por penales debe ser uno de los dos equipos del partido.",
      });
    }
  } else if (hasPenaltyWinner) {
    errors.push({
      field: "penaltyWinnerTeamId",
      message: isKnockout
        ? "Solo se elige ganador por penales si el marcador está empatado."
        : "No se elige ganador por penales en fase de grupos.",
    });
  }

  if (errors.length > 0) {
    return { valid: null, errors };
  }

  return {
    valid: {
      homeScore: input.homeScore,
      awayScore: input.awayScore,
      penaltyWinnerTeamId: isKnockout && isDraw ? input.penaltyWinnerTeamId : null,
    },
    errors: [],
  };
}
