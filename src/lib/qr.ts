import { z } from "zod";

export const TokenSchema = z.object({
  token: z.string().regex(/^qr_[0-9a-f]{32}$/, "Invalid qr token format"),
  ownerEmail: z.string().email(),
  createdAt: z.string().min(1),
  revokedAt: z.string().nullable(),
});

export const TokensArraySchema = z.array(TokenSchema);

export type Token = z.infer<typeof TokenSchema>;

export const TOKEN_PREFIX = "qr_";
