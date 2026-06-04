import {
  type AlbumGroup,
  type AlbumSticker,
  getGroupByCode,
  getStickerLabel,
  getStickerType,
  isValidStickerCode,
} from "@/lib/album-catalog";
import {
  type ExchangeSettings,
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
  type SessionProposal,
  SessionProposalSchema,
} from "@/lib/sessions";

export type RequestedSticker = AlbumSticker & {
  groupName: string;
};

export type StickerFilters = {
  group: string;
  type: "ALL" | AlbumSticker["type"];
  search: string;
};

export function getRuleLabel(source: ProposalRuleSource): ProposalRuleLabel {
  return source === "override" ? "Regla especial" : "Regla general";
}

export function getModeLabel(mode: ProposalMode): "Cumple regla" | "Contraoferta" {
  return mode === "counteroffer" ? "Contraoferta" : "Cumple regla";
}

export function describeRequestedSticker(stickerCode: string): RequestedSticker {
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
    .sort((left, right) => left.code.localeCompare(right.code, "es"));
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

export function buildFulfillRequirements(
  rule: ProposalRuleSnapshot["abstract"],
): FulfillRequirement[] {
  return Object.entries(rule)
    .filter(([, quantity]) => quantity > 0)
    .map(([offerType, quantity]) => ({ offerType: offerType as OfferType, quantity }));
}

export function resolveProposalRuleSnapshot(
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
  return CounterofferDetailsSchema.parse(
    counteroffer ?? {
      quantity: 0,
      offerType: "PLAYER",
      exactStickerCodes: [],
      note: null,
    },
  );
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
    selectedStickerCodes: [],
    blocks: [],
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

  return SessionProposalSchema.parse({
    ...draft,
    blocks: syncProposalBlocks(draft.selectedStickerCodes, draft.blocks, globalSettings, overrides),
  });
}

export function isCounterofferValid(block: ProposalBlock): boolean {
  if (block.mode !== "counteroffer") {
    return true;
  }

  const counteroffer = normalizeCounteroffer(block.counteroffer);
  return counteroffer.quantity > 0 || counteroffer.exactStickerCodes.length > 0;
}

export function countOfferedItems(blocks: ProposalBlock[]): number {
  return blocks.reduce((total, block) => {
    if (block.mode === "counteroffer") {
      const quantity = block.counteroffer?.quantity ?? 0;
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

export function groupLabelLookup(groups: AlbumGroup[]): Record<string, string> {
  return Object.fromEntries(groups.map((group) => [group.groupCode, group.displayName]));
}
