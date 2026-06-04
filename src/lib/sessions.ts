import { z } from "zod";
import { ExchangeRuleSchema, OfferTypeSchema } from "@/lib/exchange-settings";
import { MissingStickerCodeSchema } from "@/lib/missing-schema";

export const SessionStatusSchema = z.enum(["open", "closed"]);
export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const ProposalModeSchema = z.enum(["fulfill", "counteroffer"]);
export type ProposalMode = z.infer<typeof ProposalModeSchema>;

export const ProposalPersistenceStatusSchema = z.enum(["draft", "pending"]);
export type ProposalPersistenceStatus = z.infer<typeof ProposalPersistenceStatusSchema>;

export const ProposalRuleSourceSchema = z.enum(["general", "override"]);
export type ProposalRuleSource = z.infer<typeof ProposalRuleSourceSchema>;

export const ProposalRuleLabelSchema = z.enum(["Regla general", "Regla especial"]);
export type ProposalRuleLabel = z.infer<typeof ProposalRuleLabelSchema>;

export const ProposalModeLabelSchema = z.enum(["Cumple regla", "Contraoferta"]);
export type ProposalModeLabel = z.infer<typeof ProposalModeLabelSchema>;

export const StickerTypeSchema = z.enum(["PLAYER", "BADGE", "TEAM_PHOTO", "SPECIAL"]);
export type ProposalStickerType = z.infer<typeof StickerTypeSchema>;

export const FulfillRequirementSchema = z.object({
  offerType: OfferTypeSchema,
  quantity: z.number().int().min(1),
});

export type FulfillRequirement = z.infer<typeof FulfillRequirementSchema>;

export const CounterofferDetailsSchema = z.object({
  quantity: z.number().int().min(0),
  offerType: OfferTypeSchema,
  exactStickerCodes: z.array(MissingStickerCodeSchema),
  note: z.string().trim().max(280).nullable(),
});

export type CounterofferDetails = z.infer<typeof CounterofferDetailsSchema>;

export const ProposalRuleSnapshotSchema = z.object({
  source: ProposalRuleSourceSchema,
  label: ProposalRuleLabelSchema,
  abstract: ExchangeRuleSchema,
  exactStickerCode: MissingStickerCodeSchema.nullable(),
});

export type ProposalRuleSnapshot = z.infer<typeof ProposalRuleSnapshotSchema>;

export const ProposalBlockSchema = z.object({
  requestedStickerCode: MissingStickerCodeSchema,
  requestedStickerLabel: z.string().min(1),
  requestedStickerType: StickerTypeSchema,
  mode: ProposalModeSchema,
  modeLabel: ProposalModeLabelSchema,
  rule: ProposalRuleSnapshotSchema,
  fulfillRequirements: z.array(FulfillRequirementSchema),
  counteroffer: CounterofferDetailsSchema.nullable(),
});

export type ProposalBlock = z.infer<typeof ProposalBlockSchema>;

export const SessionProposalSchema = z.object({
  status: ProposalPersistenceStatusSchema,
  currentStep: z.number().int().min(1).max(5),
  selectedStickerCodes: z.array(MissingStickerCodeSchema),
  blocks: z.array(ProposalBlockSchema),
  updatedAt: z.string().min(1),
  submittedAt: z.string().nullable(),
});

export type SessionProposal = z.infer<typeof SessionProposalSchema>;

export const SessionSchema = z.object({
  id: z.string().min(1),
  cambiadorName: z.string().min(1),
  cambiadorId: z.string().min(1).optional(),
  offeredCount: z.number().int().min(0),
  requestedCount: z.number().int().min(0),
  createdAt: z.string().min(1),
  status: SessionStatusSchema,
  token: z.string().min(1),
  proposal: SessionProposalSchema.nullable().optional(),
});

export const SessionsArraySchema = z.array(SessionSchema);

export type Session = z.infer<typeof SessionSchema>;
