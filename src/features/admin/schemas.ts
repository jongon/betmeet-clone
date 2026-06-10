import { z } from "zod";

/** Force-result input (US-6.2, BR-7.2/BR-7.3). */
export const ForceResultSchema = z.object({
  homeScore: z.number().int().min(0).max(50),
  awayScore: z.number().int().min(0).max(50),
  homePenaltyScore: z.number().int().min(0).max(50).nullable().optional(),
  awayPenaltyScore: z.number().int().min(0).max(50).nullable().optional(),
  penaltyWinnerTeamId: z.string().uuid().nullable().optional(),
  reason: z.string().trim().min(1, "El motivo es obligatorio").max(500),
});

export type ForceResultInput = z.infer<typeof ForceResultSchema>;
