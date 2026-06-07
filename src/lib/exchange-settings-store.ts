import {
  cloneDefaultExchangeSettings,
  type ExchangeSettingsDocument,
  ExchangeSettingsDocumentSchema,
  LegacyStickerOverrideSchema,
  normalizeStickerOverride,
  type StickerOverride,
  StickerOverrideSchema,
} from "@/lib/exchange-settings";
import { prisma } from "@/lib/prisma";

function normalizeStoredOverrides(
  overrides: Record<string, unknown>,
): Record<string, StickerOverride> {
  const next: Record<string, StickerOverride> = {};

  for (const [stickerCode, rawOverride] of Object.entries(overrides)) {
    const current = StickerOverrideSchema.safeParse(rawOverride);
    if (current.success) {
      const normalized = normalizeStickerOverride(current.data);
      if (normalized) {
        next[stickerCode] = normalized;
      }
      continue;
    }

    const legacy = LegacyStickerOverrideSchema.safeParse(rawOverride);
    if (legacy.success) {
      next[stickerCode] = { abstract: legacy.data, exact: null };
    }
  }

  return next;
}

export async function getExchangeSettings(ownerEmail: string): Promise<ExchangeSettingsDocument> {
  const row = await prisma.exchangeSettings.findUnique({ where: { ownerEmail } });

  if (row) {
    return ExchangeSettingsDocumentSchema.parse({
      ownerEmail: row.ownerEmail,
      updatedAt: row.updatedAt.toISOString(),
      global: row.global,
      overrides: normalizeStoredOverrides((row.overrides ?? {}) as Record<string, unknown>),
    });
  }

  return {
    ownerEmail,
    updatedAt: new Date().toISOString(),
    global: cloneDefaultExchangeSettings(),
    overrides: {},
  };
}

export async function saveGlobalExchangeSettings(
  ownerEmail: string,
  globalSettings: ExchangeSettingsDocument["global"],
): Promise<void> {
  await prisma.exchangeSettings.upsert({
    where: { ownerEmail },
    create: {
      ownerEmail,
      updatedAt: new Date(),
      global: globalSettings,
      overrides: {},
    },
    update: {
      updatedAt: new Date(),
      global: globalSettings,
    },
  });
}

export async function saveStickerOverride(
  ownerEmail: string,
  stickerCode: string,
  override: StickerOverride | null,
): Promise<void> {
  const parsedOverride = normalizeStickerOverride(StickerOverrideSchema.nullable().parse(override));
  const existing = await prisma.exchangeSettings.findUnique({ where: { ownerEmail } });
  const nextOverrides: Record<string, StickerOverride> = {
    ...((existing?.overrides as Record<string, StickerOverride>) ?? {}),
  };

  if (parsedOverride) {
    nextOverrides[stickerCode] = parsedOverride;
  } else {
    delete nextOverrides[stickerCode];
  }

  await prisma.exchangeSettings.upsert({
    where: { ownerEmail },
    create: {
      ownerEmail,
      updatedAt: new Date(),
      global: cloneDefaultExchangeSettings(),
      overrides: nextOverrides,
    },
    update: {
      updatedAt: new Date(),
      overrides: nextOverrides,
    },
  });
}

export async function resetStickerOverride(ownerEmail: string, stickerCode: string): Promise<void> {
  const existing = await prisma.exchangeSettings.findUnique({ where: { ownerEmail } });
  const previousOverrides = (existing?.overrides as Record<string, StickerOverride>) ?? {};

  if (!previousOverrides[stickerCode]) {
    return;
  }

  const nextOverrides = { ...previousOverrides };
  delete nextOverrides[stickerCode];

  await prisma.exchangeSettings.upsert({
    where: { ownerEmail },
    create: {
      ownerEmail,
      updatedAt: new Date(),
      global: cloneDefaultExchangeSettings(),
      overrides: nextOverrides,
    },
    update: {
      updatedAt: new Date(),
      overrides: nextOverrides,
    },
  });
}
