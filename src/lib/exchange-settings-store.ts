import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  cloneDefaultExchangeSettings,
  type ExchangeRule,
  ExchangeRuleSchema,
  type ExchangeSettingsDocument,
  ExchangeSettingsDocumentsSchema,
} from "@/lib/exchange-settings";

const DATA_DIR = path.join(process.cwd(), "data");
const RUNTIME_FILE = path.join(DATA_DIR, "exchange-settings.json");
const SEED_FILE = path.join(DATA_DIR, "exchange-settings.seed.json");

async function ensureRuntimeFile(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(RUNTIME_FILE, "utf8");
  } catch {
    await copyFile(SEED_FILE, RUNTIME_FILE);
  }
}

async function readDocuments(): Promise<ExchangeSettingsDocument[]> {
  await ensureRuntimeFile();
  const raw = await readFile(RUNTIME_FILE, "utf8");
  const parsed: unknown = JSON.parse(raw);
  return ExchangeSettingsDocumentsSchema.parse(parsed);
}

async function writeDocuments(docs: ExchangeSettingsDocument[]): Promise<void> {
  await ensureRuntimeFile();
  await writeFile(RUNTIME_FILE, JSON.stringify(docs, null, 2), "utf8");
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
  rule: ExchangeRule,
): Promise<void> {
  const parsedRule = ExchangeRuleSchema.parse(rule);
  const docs = await readDocuments();
  const previous = docs.find((doc) => doc.ownerEmail === ownerEmail);
  const next = docs.filter((doc) => doc.ownerEmail !== ownerEmail);

  next.push({
    ownerEmail,
    updatedAt: new Date().toISOString(),
    global: previous?.global ?? cloneDefaultExchangeSettings(),
    overrides: {
      ...(previous?.overrides ?? {}),
      [stickerCode]: parsedRule,
    },
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
