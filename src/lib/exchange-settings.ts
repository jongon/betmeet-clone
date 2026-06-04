import { z } from "zod";
import { MissingStickerCodeSchema } from "@/lib/missing-schema";

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

export const ExactStickerRuleSchema = z.object({
  stickerCode: MissingStickerCodeSchema,
});

export type ExactStickerRule = z.infer<typeof ExactStickerRuleSchema>;

export const StickerOverrideSchema = z.object({
  abstract: ExchangeRuleSchema.nullable(),
  exact: ExactStickerRuleSchema.nullable(),
});

export type StickerOverride = z.infer<typeof StickerOverrideSchema>;

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
  overrides: z.record(z.string(), StickerOverrideSchema),
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

export function isExchangeRuleActive(rule: ExchangeRule | null): rule is ExchangeRule {
  if (!rule) return false;
  return Object.values(rule).some((value) => value > 0);
}

export function normalizeStickerOverride(override: StickerOverride | null): StickerOverride | null {
  if (!override) {
    return null;
  }

  const normalizedAbstract = isExchangeRuleActive(override.abstract) ? override.abstract : null;
  const normalizedExact = override.exact ?? null;

  if (!normalizedAbstract && !normalizedExact) {
    return null;
  }

  return {
    abstract: normalizedAbstract,
    exact: normalizedExact,
  };
}

export const LegacyStickerOverrideSchema = ExchangeRuleSchema;
