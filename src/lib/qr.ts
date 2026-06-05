import { z } from "zod";

export const QR_TOKEN_REGEX = /^qr_[0-9a-f]{32}$/;

export const QrTokenStringSchema = z.string().regex(QR_TOKEN_REGEX, "Invalid qr token format");

const TokenSchema = z.object({
  token: QrTokenStringSchema,
  ownerEmail: z.string().email(),
  createdAt: z.string().min(1),
  revokedAt: z.string().nullable(),
});

export const TokensArraySchema = z.array(TokenSchema);

export type Token = z.infer<typeof TokenSchema>;

export const TOKEN_PREFIX = "qr_";
