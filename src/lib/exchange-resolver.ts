import {
  type ExchangeRule,
  normalizeStickerOverride,
  type StickerOverride,
} from "@/lib/exchange-settings";

export type ResolvedOverrideComponent =
  | {
      kind: "abstract";
      label: "Regla especial por tipo";
      rule: ExchangeRule;
    }
  | {
      kind: "exact";
      label: "Regla especial por cromo";
      stickerCode: string;
    };

export type ResolvedOverride =
  | { source: "global"; components: [] }
  | { source: "override"; components: ResolvedOverrideComponent[] };

export function resolveStickerOverride(
  override: StickerOverride | null | undefined,
): ResolvedOverride {
  const normalized = normalizeStickerOverride(override ?? null);
  if (!normalized) {
    return { source: "global", components: [] };
  }

  const components: ResolvedOverrideComponent[] = [];

  if (normalized.abstract) {
    components.push({
      kind: "abstract",
      label: "Regla especial por tipo",
      rule: normalized.abstract,
    });
  }

  if (normalized.exact) {
    components.push({
      kind: "exact",
      label: "Regla especial por cromo",
      stickerCode: normalized.exact.stickerCode,
    });
  }

  if (components.length === 0) {
    return { source: "global", components: [] };
  }

  return { source: "override", components };
}
