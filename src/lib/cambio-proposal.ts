import {
  type AlbumSticker,
  compareAlbumStickerCodes,
  getGroupByCode,
  getStickerLabel,
  getStickerType,
  isValidStickerCode,
} from "@/lib/album-catalog";
import {
  ExchangeRuleSchema,
  type ExchangeSettings,
  formatExchangeOption,
  getExchangeRuleOptions,
  normalizeStickerOverride,
  type OfferType,
  type StickerOverride,
} from "@/lib/exchange-settings";
import { matchesFlexibleSearch } from "@/lib/search";
import {
  type CounterofferDetails,
  CounterofferDetailsSchema,
  type FulfillRequirement,
  type ProposalBlock,
  ProposalBlockSchema,
  type ProposalMode,
  type ProposalRuleLabel,
  type ProposalRuleSnapshot,
  ProposalRuleSnapshotSchema,
  type ProposalRuleSource,
  type RequestedRepeatedItem,
  RequestedRepeatedItemSchema,
  type SessionProposal,
  SessionProposalSchema,
} from "@/lib/sessions";

const CURRENT_PROPOSAL_FLOW_VERSION = 3;

const EMPTY_COUNTEROFFER_OFFERS = ExchangeRuleSchema.parse({
  PLAYER: 0,
  BADGE: 0,
  TEAM_PHOTO: 0,
  SPECIAL: 0,
  ANY: 0,
});

export type RequestedSticker = AlbumSticker & {
  groupName: string;
};

export type AvailableRepeatedSticker = RequestedSticker & {
  availableQuantity: number;
};

type StickerFilters = {
  group: string;
  type: "ALL" | AlbumSticker["type"];
  search: string;
};

function getRuleLabel(source: ProposalRuleSource): ProposalRuleLabel {
  return source === "override" ? "Intercambio especial" : "Intercambio general";
}

export function getModeLabel(mode: ProposalMode): "Acepta la regla" | "Propone otra opcion" {
  return mode === "counteroffer" ? "Propone otra opcion" : "Acepta la regla";
}

function formatPublicExchangeOption(offerType: OfferType, quantity: number): string {
  if (offerType === "PLAYER") {
    return `${quantity} ${quantity === 1 ? "cromo de jugador" : "cromos de jugador"}`;
  }

  if (offerType === "SPECIAL") {
    return `${quantity} ${quantity === 1 ? "cromo especial" : "cromos especiales"}`;
  }

  if (offerType === "ANY") {
    return quantity === 1 ? "cualquier tipo de cromo" : `${quantity} cromos de cualquier tipo`;
  }

  if (offerType === "TEAM_PHOTO") {
    return `${quantity} ${quantity === 1 ? "foto de equipo" : "fotos de equipo"}`;
  }

  return `${quantity} ${quantity === 1 ? "badge" : "badges"}`;
}

function getCollapsedAnyQuantity(rule: ProposalBlock["rule"]["abstract"]): number | null {
  const quantities = [rule.BADGE, rule.PLAYER, rule.TEAM_PHOTO, rule.SPECIAL];
  const first = quantities[0] ?? 0;

  if (first <= 0 || quantities.some((quantity) => quantity !== first)) {
    return null;
  }

  return first;
}

export function formatPublicRuleOptions(block: ProposalBlock): string[] {
  const collapsedAnyQuantity = getCollapsedAnyQuantity(block.rule.abstract);
  const options = getExchangeRuleOptions(block.rule.abstract)
    .filter(({ offerType, quantity }) => {
      if (collapsedAnyQuantity === null) {
        return true;
      }

      if (
        offerType === "BADGE" ||
        offerType === "PLAYER" ||
        offerType === "TEAM_PHOTO" ||
        offerType === "SPECIAL"
      ) {
        return false;
      }

      return !(offerType === "ANY" && quantity === collapsedAnyQuantity);
    })
    .map(({ offerType, quantity }) => formatPublicExchangeOption(offerType, quantity));

  if (collapsedAnyQuantity !== null) {
    options.unshift(formatPublicExchangeOption("ANY", collapsedAnyQuantity));
  }

  if (block.rule.exactStickerCode) {
    options.push(block.rule.exactStickerCode);
  }

  return options;
}

export function summarizeRule(block: ProposalBlock): string {
  const options = formatPublicRuleOptions(block);

  return options.length > 0
    ? `Se cambia por ${options.join(" o por ")}.`
    : "Sin condiciones de intercambio definidas.";
}

function describeRequestedSticker(stickerCode: string): RequestedSticker {
  if (!isValidStickerCode(stickerCode)) {
    throw new Error(`Cromo inválido: ${stickerCode}`);
  }

  const [groupCode, rawPosition] = stickerCode.split("-");
  const position = Number(rawPosition);
  const type = getStickerType(stickerCode);
  const group = getGroupByCode(groupCode);

  return {
    code: stickerCode,
    groupCode,
    groupName: group?.displayName ?? groupCode,
    position,
    type,
    label: getStickerLabel(type, position),
  };
}

export function buildRequestedStickers(stickerCodes: string[]): RequestedSticker[] {
  return [...new Set(stickerCodes)]
    .map((code) => describeRequestedSticker(code))
    .sort((left, right) => compareAlbumStickerCodes(left.code, right.code));
}

export function buildAvailableRepeatedStickers(
  items: Record<string, number>,
): AvailableRepeatedSticker[] {
  return Object.entries(items)
    .filter(([, quantity]) => quantity > 0)
    .map(([code, quantity]) => ({
      ...describeRequestedSticker(code),
      availableQuantity: quantity,
    }))
    .sort((left, right) => compareAlbumStickerCodes(left.code, right.code));
}

export function filterRequestedStickers(
  stickers: RequestedSticker[],
  filters: StickerFilters,
): RequestedSticker[] {
  return stickers.filter((sticker) => {
    if (
      filters.group.trim() &&
      !matchesFlexibleSearch(filters.group, sticker.groupCode, sticker.groupName)
    ) {
      return false;
    }

    if (filters.type !== "ALL" && sticker.type !== filters.type) {
      return false;
    }

    if (
      filters.search.trim() &&
      !matchesFlexibleSearch(filters.search, sticker.code, String(sticker.position))
    ) {
      return false;
    }

    return true;
  });
}

function buildFulfillRequirements(rule: ProposalRuleSnapshot["abstract"]): FulfillRequirement[] {
  return Object.entries(rule)
    .filter(([, quantity]) => quantity > 0)
    .map(([offerType, quantity]) => ({ offerType: offerType as OfferType, quantity }));
}

function resolveProposalRuleSnapshot(
  stickerCode: string,
  globalSettings: ExchangeSettings,
  overrides: Record<string, StickerOverride>,
): ProposalRuleSnapshot {
  const sticker = describeRequestedSticker(stickerCode);
  const normalized = normalizeStickerOverride(overrides[stickerCode] ?? null);
  const source: ProposalRuleSource = normalized ? "override" : "general";
  const abstract = normalized?.abstract ?? globalSettings[sticker.type];
  const exactStickerCode = normalized?.exact?.stickerCode ?? null;

  return ProposalRuleSnapshotSchema.parse({
    source,
    label: getRuleLabel(source),
    abstract,
    exactStickerCode,
  });
}

function normalizeCounteroffer(counteroffer: CounterofferDetails | null): CounterofferDetails {
  if (!counteroffer) {
    return CounterofferDetailsSchema.parse({
      offers: EMPTY_COUNTEROFFER_OFFERS,
      exactStickerCodes: [],
      note: null,
    });
  }

  const legacy = counteroffer as CounterofferDetails & {
    quantity?: number;
    offerType?: OfferType;
    offers?: unknown;
  };

  const offers = legacy.offers
    ? ExchangeRuleSchema.parse(legacy.offers)
    : ExchangeRuleSchema.parse({
        ...EMPTY_COUNTEROFFER_OFFERS,
        [(legacy.offerType ?? "PLAYER") as OfferType]: Math.max(0, legacy.quantity ?? 0),
      });

  return CounterofferDetailsSchema.parse({
    offers,
    exactStickerCodes: legacy.exactStickerCodes ?? [],
    note: legacy.note ?? null,
  });
}

export function buildProposalBlock(
  stickerCode: string,
  globalSettings: ExchangeSettings,
  overrides: Record<string, StickerOverride>,
  previous?: ProposalBlock,
): ProposalBlock {
  const sticker = describeRequestedSticker(stickerCode);
  const mode = previous?.mode ?? "fulfill";
  const rule = resolveProposalRuleSnapshot(stickerCode, globalSettings, overrides);

  return ProposalBlockSchema.parse({
    requestedStickerCode: sticker.code,
    requestedStickerLabel: sticker.label,
    requestedStickerType: sticker.type,
    mode,
    modeLabel: getModeLabel(mode),
    rule,
    fulfillRequirements: buildFulfillRequirements(rule.abstract),
    counteroffer:
      mode === "counteroffer" ? normalizeCounteroffer(previous?.counteroffer ?? null) : null,
  });
}

export function syncProposalBlocks(
  selectedStickerCodes: string[],
  previousBlocks: ProposalBlock[],
  globalSettings: ExchangeSettings,
  overrides: Record<string, StickerOverride>,
): ProposalBlock[] {
  const previousMap = new Map(previousBlocks.map((block) => [block.requestedStickerCode, block]));

  return [...new Set(selectedStickerCodes)].map((stickerCode) =>
    buildProposalBlock(stickerCode, globalSettings, overrides, previousMap.get(stickerCode)),
  );
}

export function buildEmptyProposal(): SessionProposal {
  return SessionProposalSchema.parse({
    status: "draft",
    currentStep: 1,
    flowVersion: CURRENT_PROPOSAL_FLOW_VERSION,
    selectedStickerCodes: [],
    blocks: [],
    requestedRepeateds: [],
    updatedAt: new Date().toISOString(),
    submittedAt: null,
  });
}

export function normalizeProposalDraft(
  draft: SessionProposal | null | undefined,
  globalSettings: ExchangeSettings,
  overrides: Record<string, StickerOverride>,
): SessionProposal {
  if (!draft) {
    return buildEmptyProposal();
  }

  const flowVersion = draft.flowVersion ?? 1;
  let currentStep = draft.currentStep;

  if (flowVersion < 2 && currentStep >= 3) {
    currentStep -= 1;
  }

  if (flowVersion < 3 && currentStep >= 3) {
    currentStep -= 1;
  }

  return SessionProposalSchema.parse({
    ...draft,
    currentStep,
    flowVersion: CURRENT_PROPOSAL_FLOW_VERSION,
    blocks: syncProposalBlocks(draft.selectedStickerCodes, draft.blocks, globalSettings, overrides),
    requestedRepeateds: draft.requestedRepeateds ?? [],
  });
}

export function normalizeRequestedRepeateds(
  requestedRepeateds: RequestedRepeatedItem[],
  availableItems: Record<string, number>,
): RequestedRepeatedItem[] {
  return requestedRepeateds
    .map((item) => {
      const maxAvailable = availableItems[item.stickerCode] ?? 0;
      if (maxAvailable <= 0) {
        return null;
      }

      return RequestedRepeatedItemSchema.parse({
        stickerCode: item.stickerCode,
        quantity: Math.min(Math.max(item.quantity, 1), maxAvailable),
      });
    })
    .filter((item): item is RequestedRepeatedItem => item !== null);
}

export function countRequestedRepeateds(requestedRepeateds: RequestedRepeatedItem[]): number {
  return requestedRepeateds.reduce((total, item) => total + item.quantity, 0);
}

export function isCounterofferValid(block: ProposalBlock): boolean {
  if (block.mode !== "counteroffer") {
    return true;
  }

  const counteroffer = normalizeCounteroffer(block.counteroffer);
  return (
    Object.values(counteroffer.offers).some((quantity) => quantity > 0) ||
    counteroffer.exactStickerCodes.length > 0
  );
}

export function countOfferedItems(blocks: ProposalBlock[]): number {
  return blocks.reduce((total, block) => {
    if (block.mode === "counteroffer") {
      const quantity = Math.max(
        ...Object.values(normalizeCounteroffer(block.counteroffer).offers),
        0,
      );
      const exactCount = block.counteroffer?.exactStickerCodes.length ?? 0;
      return total + Math.max(quantity, exactCount);
    }

    return (
      total + block.fulfillRequirements.reduce((subtotal, item) => subtotal + item.quantity, 0)
    );
  }, 0);
}

export function getDecisionSummary(blocks: ProposalBlock[]): {
  fulfill: number;
  counteroffer: number;
} {
  return blocks.reduce(
    (summary, block) => {
      if (block.mode === "counteroffer") {
        summary.counteroffer += 1;
      } else {
        summary.fulfill += 1;
      }

      return summary;
    },
    { fulfill: 0, counteroffer: 0 },
  );
}

export function parseExactStickerCodes(value: string): string[] {
  if (!value.trim()) return [];

  const rawTokens = value
    .toUpperCase()
    .split(/[^A-Z0-9-]+/)
    .filter(Boolean);
  const normalized: string[] = [];

  for (let index = 0; index < rawTokens.length; index += 1) {
    const current = rawTokens[index] ?? "";
    const next = rawTokens[index + 1] ?? "";

    if (/^[A-Z]{3}$/.test(current) && /^\d{1,2}$/.test(next)) {
      normalized.push(`${current}-${next}`);
      index += 1;
      continue;
    }

    normalized.push(current);
  }

  return [...new Set(normalized)].filter((code) => isValidStickerCode(code));
}

export function formatCounterofferCodes(codes: string[]): string {
  return codes.join(", ");
}

export function formatCounterofferOffers(counteroffer: CounterofferDetails | null): string[] {
  const normalized = normalizeCounteroffer(counteroffer);

  return getExchangeRuleOptions(normalized.offers).map(({ offerType, quantity }) =>
    formatExchangeOption(offerType, quantity),
  );
}

export function collectCounterofferExactStickerCodes(blocks: ProposalBlock[]): string[] {
  return [...new Set(blocks.flatMap((block) => block.counteroffer?.exactStickerCodes ?? []))];
}
