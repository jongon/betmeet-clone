import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  RepeatedInventoriesSchema,
  type RepeatedInventory,
  type RepeatedsRecord,
} from "@/lib/repeateds";

const DATA_DIR = path.join(process.cwd(), "data");

function getRuntimeFilePath(): string {
  return process.env.REPEATEDS_FILE ?? path.join(DATA_DIR, "repeateds.json");
}

function getSeedFilePath(): string {
  return process.env.REPEATEDS_SEED_FILE ?? path.join(DATA_DIR, "repeateds.seed.json");
}

async function ensureRuntimeFile(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(getRuntimeFilePath(), "utf8");
  } catch {
    await copyFile(getSeedFilePath(), getRuntimeFilePath());
  }
}

async function readInventories(): Promise<RepeatedInventory[]> {
  await ensureRuntimeFile();
  const raw = await readFile(getRuntimeFilePath(), "utf8");
  const parsed: unknown = JSON.parse(raw);
  return RepeatedInventoriesSchema.parse(parsed);
}

async function writeInventories(inventories: RepeatedInventory[]): Promise<void> {
  await ensureRuntimeFile();
  await writeFile(getRuntimeFilePath(), JSON.stringify(inventories, null, 2), "utf8");
}

export async function getInventory(ownerEmail: string): Promise<RepeatedInventory> {
  const inventories = await readInventories();
  const found = inventories.find((entry) => entry.ownerEmail === ownerEmail);
  if (found) return found;
  return {
    ownerEmail,
    updatedAt: new Date().toISOString(),
    items: {},
  };
}

export async function saveGroupRepeateds(
  ownerEmail: string,
  groupCode: string,
  groupItems: RepeatedsRecord,
  allowedCodes: Set<string>,
): Promise<RepeatedInventory> {
  const inventories = await readInventories();
  const next = inventories.filter((entry) => entry.ownerEmail !== ownerEmail);
  const previous = inventories.find((entry) => entry.ownerEmail === ownerEmail);
  const baseItems = { ...(previous?.items ?? {}) };

  for (const code of Object.keys(baseItems)) {
    if (code.startsWith(`${groupCode}-`)) {
      delete baseItems[code];
    }
  }

  for (const [code, quantity] of Object.entries(groupItems)) {
    if (!allowedCodes.has(code)) continue;
    if (quantity > 0) {
      baseItems[code] = quantity;
    }
  }

  const saved = {
    ownerEmail,
    updatedAt: new Date().toISOString(),
    items: baseItems,
  };

  next.push(saved);

  await writeInventories(next);
  return saved;
}

export async function decrementRepeatedInventory(
  ownerEmail: string,
  requestedRepeateds: Array<{ stickerCode: string; quantity: number }>,
): Promise<{ ok: true; inventory: RepeatedInventory } | { ok: false; stickerCode: string }> {
  const inventories = await readInventories();
  const previous = inventories.find((entry) => entry.ownerEmail === ownerEmail);
  const baseItems = { ...(previous?.items ?? {}) };

  for (const item of requestedRepeateds) {
    const available = baseItems[item.stickerCode] ?? 0;
    if (available < item.quantity) {
      return { ok: false, stickerCode: item.stickerCode };
    }
  }

  for (const item of requestedRepeateds) {
    const nextQuantity = (baseItems[item.stickerCode] ?? 0) - item.quantity;
    if (nextQuantity > 0) {
      baseItems[item.stickerCode] = nextQuantity;
    } else {
      delete baseItems[item.stickerCode];
    }
  }

  const saved = {
    ownerEmail,
    updatedAt: new Date().toISOString(),
    items: baseItems,
  };

  const next = inventories.filter((entry) => entry.ownerEmail !== ownerEmail);
  next.push(saved);
  await writeInventories(next);

  return { ok: true, inventory: saved };
}
