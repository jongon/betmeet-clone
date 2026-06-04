import { z } from "zod";

export const SessionStatusSchema = z.enum(["open", "closed"]);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const SessionSchema = z.object({
  id: z.string().min(1),
  cambiadorName: z.string().min(1),
  cambiadorId: z.string().min(1).optional(),
  offeredCount: z.number().int().min(0),
  requestedCount: z.number().int().min(0),
  createdAt: z.string().min(1),
  status: SessionStatusSchema,
  token: z.string().min(1),
});

export const SessionsArraySchema = z.array(SessionSchema);

export type Session = z.infer<typeof SessionSchema>;
