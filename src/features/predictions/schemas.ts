import { z } from "zod";

export const PredictionInputSchema = z.object({
  homeScore: z
    .number({ message: "Falta el marcador de casa" })
    .int("El marcador debe ser un número entero")
    .min(0, "El mínimo es 0 goles")
    .max(20, "El máximo es 20 goles"),
  awayScore: z
    .number({ message: "Falta el marcador de fuera" })
    .int("El marcador debe ser un número entero")
    .min(0, "El mínimo es 0 goles")
    .max(20, "El máximo es 20 goles"),
  penaltyWinnerTeamId: z.string().uuid().nullable(),
  matchId: z.string().uuid(),
  poolId: z.string().uuid().optional(),
});

export const ResetPredictionOverrideSchema = z.object({
  matchId: z.string().uuid(),
  poolId: z.string().uuid(),
});

export type PredictionInput = z.infer<typeof PredictionInputSchema>;
