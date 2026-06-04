import { z } from "zod";

export const OfferTypeSchema = z.enum(["PLAYER", "BADGE", "TEAM_PHOTO", "SPECIAL", "ANY"]);
export type OfferType = z.infer<typeof OfferTypeSchema>;

export const ExchangeRuleSchema = z.object({
  PLAYER: z.number().int().min(0),
  BADGE: z.number().int().min(0),
  TEAM_PHOTO: z.number().int().min(0),
  SPECIAL: z.number().int().min(0),
  ANY: z.number().int().min(0),
});

export type ExchangeRule = z.infer<typeof ExchangeRuleSchema>;

export const ExchangeSettingsSchema = z.object({
  PLAYER: ExchangeRuleSchema,
  BADGE: ExchangeRuleSchema,
  TEAM_PHOTO: ExchangeRuleSchema,
  SPECIAL: ExchangeRuleSchema,
});

export type ExchangeSettings = z.infer<typeof ExchangeSettingsSchema>;

export const ExchangeSettingsDocumentSchema = z.object({
  ownerEmail: z.string().email(),
  updatedAt: z.string(),
  global: ExchangeSettingsSchema,
  overrides: z.record(z.string(), ExchangeRuleSchema),
});

export const ExchangeSettingsDocumentsSchema = z.array(ExchangeSettingsDocumentSchema);

export type ExchangeSettingsDocument = z.infer<typeof ExchangeSettingsDocumentSchema>;

export const DEFAULT_EXCHANGE_SETTINGS: ExchangeSettings = {
  PLAYER: {
    PLAYER: 0,
    BADGE: 0,
    TEAM_PHOTO: 0,
    SPECIAL: 0,
    ANY: 1,
  },
  BADGE: {
    PLAYER: 2,
    BADGE: 1,
    TEAM_PHOTO: 1,
    SPECIAL: 1,
    ANY: 2,
  },
  TEAM_PHOTO: {
    PLAYER: 2,
    BADGE: 1,
    TEAM_PHOTO: 1,
    SPECIAL: 1,
    ANY: 2,
  },
  SPECIAL: {
    PLAYER: 3,
    BADGE: 2,
    TEAM_PHOTO: 2,
    SPECIAL: 1,
    ANY: 3,
  },
};

export function cloneDefaultExchangeSettings(): ExchangeSettings {
  return structuredClone(DEFAULT_EXCHANGE_SETTINGS);
}
