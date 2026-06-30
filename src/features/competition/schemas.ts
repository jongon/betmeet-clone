import { z } from "zod";

export const NormalizedTeamSchema = z.object({
  name: z.string().min(1),
  fifaCode: z.string().length(3),
  isoAlpha2: z.string().nullable(),
  flagKey: z.string().min(2),
  flagPath: z.string().startsWith("/flags/"),
  providerTeamId: z.string().nullable(),
});

export const NormalizedMatchSchema = z.object({
  providerMatchId: z.string().nullable(),
  matchNumber: z.number().int().positive().nullable(),
  phaseName: z.string().min(1),
  kickoffAt: z.string().datetime().nullable(),
  status: z.enum(["SCHEDULED", "LOCKED", "LIVE", "FINISHED", "POSTPONED", "CANCELLED"]),
  homeFifaCode: z.string().length(3).nullable(),
  awayFifaCode: z.string().length(3).nullable(),
  homePlaceholder: z.string().nullable(),
  awayPlaceholder: z.string().nullable(),
  homeScore: z.number().int().nonnegative().nullable().optional(),
  awayScore: z.number().int().nonnegative().nullable().optional(),
  homePenaltyScore: z.number().int().nonnegative().nullable().optional(),
  awayPenaltyScore: z.number().int().nonnegative().nullable().optional(),
});

export type NormalizedTeam = z.infer<typeof NormalizedTeamSchema>;
export type NormalizedMatch = z.infer<typeof NormalizedMatchSchema>;
