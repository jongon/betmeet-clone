import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  cloneDefaultExchangeSettings,
  type ExchangeSettingsDocument,
  ExchangeSettingsDocumentSchema,
  LegacyStickerOverrideSchema,
  normalizeStickerOverride,
  type StickerOverride,
  StickerOverrideSchema,
} from "@/lib/exchange-settings";

const DATA_DIR = path.join(process.cwd(), "data");

function getRuntimeFilePath(): string {
  return process.env.EXCHANGE_SETTINGS_FILE ?? path.join(DATA_DIR, "exchange-settings.json");
}

function getSeedFilePath(): string {
  return (
    process.env.EXCHANGE_SETTINGS_SEED_FILE ?? path.join(DATA_DIR, "exchange-settings.seed.json")
  );
}

async function ensureRuntimeFile(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(getRuntimeFilePath(), "utf8");
  } catch {
    await copyFile(getSeedFilePath(), getRuntimeFilePath());
  }
}

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

function normalizeStoredDocument(rawDocument: unknown): ExchangeSettingsDocument {
  const parsed = ExchangeSettingsDocumentSchema.safeParse(rawDocument);
  if (parsed.success) {
    return parsed.data;
  }

  const base = rawDocument as {
    ownerEmail?: unknown;
    updatedAt?: unknown;
    global?: unknown;
    overrides?: unknown;
  };

  return ExchangeSettingsDocumentSchema.parse({
    ownerEmail: base.ownerEmail,
    updatedAt: base.updatedAt,
    global: base.global,
    overrides: normalizeStoredOverrides((base.overrides ?? {}) as Record<string, unknown>),
  });
}

async function readDocuments(): Promise<ExchangeSettingsDocument[]> {
  await ensureRuntimeFile();
  const raw = await readFile(getRuntimeFilePath(), "utf8");
  const parsed: unknown = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("Exchange settings document inválido");
  }

  return parsed.map((document) => normalizeStoredDocument(document));
}

async function writeDocuments(docs: ExchangeSettingsDocument[]): Promise<void> {
  await ensureRuntimeFile();
  await writeFile(getRuntimeFilePath(), JSON.stringify(docs, null, 2), "utf8");
}

export async function getExchangeSettings(ownerEmail: string): Promise<ExchangeSettingsDocument> {
  const docs = await readDocuments();
  const found = docs.find((doc) => doc.ownerEmail === ownerEmail);
  if (found) return found;
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
  const docs = await readDocuments();
  const previous = docs.find((doc) => doc.ownerEmail === ownerEmail);
  const next = docs.filter((doc) => doc.ownerEmail !== ownerEmail);

  next.push({
    ownerEmail,
    updatedAt: new Date().toISOString(),
    global: globalSettings,
    overrides: previous?.overrides ?? {},
  });

  await writeDocuments(next);
}

export async function saveStickerOverride(
  ownerEmail: string,
  stickerCode: string,
  override: StickerOverride | null,
): Promise<void> {
  const parsedOverride = normalizeStickerOverride(StickerOverrideSchema.nullable().parse(override));
  const docs = await readDocuments();
  const previous = docs.find((doc) => doc.ownerEmail === ownerEmail);
  const next = docs.filter((doc) => doc.ownerEmail !== ownerEmail);
  const nextOverrides = { ...(previous?.overrides ?? {}) };

  if (parsedOverride) {
    nextOverrides[stickerCode] = parsedOverride;
  } else {
    delete nextOverrides[stickerCode];
  }

  next.push({
    ownerEmail,
    updatedAt: new Date().toISOString(),
    global: previous?.global ?? cloneDefaultExchangeSettings(),
    overrides: nextOverrides,
  });

  await writeDocuments(next);
}

export async function resetStickerOverride(ownerEmail: string, stickerCode: string): Promise<void> {
  const docs = await readDocuments();
  const previous = docs.find((doc) => doc.ownerEmail === ownerEmail);

  if (!previous?.overrides[stickerCode]) {
    return;
  }

  const nextOverrides = { ...previous.overrides };
  delete nextOverrides[stickerCode];

  const next = docs.filter((doc) => doc.ownerEmail !== ownerEmail);
  next.push({
    ownerEmail,
    updatedAt: new Date().toISOString(),
    global: previous.global,
    overrides: nextOverrides,
  });

  await writeDocuments(next);
}
