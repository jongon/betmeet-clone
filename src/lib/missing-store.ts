import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  MissingInventoriesSchema,
  type MissingInventory,
  MissingInventorySchema,
  MissingRecordSchema,
} from "@/lib/missing-schema";

const DATA_DIR = path.join(process.cwd(), "data");

function getRuntimeFilePath(): string {
  return process.env.MISSINGS_FILE ?? path.join(DATA_DIR, "missing.json");
}

async function ensureRuntimeFile(): Promise<void> {
  const runtimeFile = getRuntimeFilePath();
  await mkdir(path.dirname(runtimeFile), { recursive: true });

  try {
    await readFile(runtimeFile, "utf8");
  } catch {
    await writeFile(runtimeFile, "[]\n", "utf8");
  }
}

async function readInventories(): Promise<MissingInventory[]> {
  await ensureRuntimeFile();
  const raw = await readFile(getRuntimeFilePath(), "utf8");
  const parsed: unknown = JSON.parse(raw);
  return MissingInventoriesSchema.parse(parsed);
}

async function writeInventories(inventories: MissingInventory[]): Promise<void> {
  await ensureRuntimeFile();
  await writeFile(getRuntimeFilePath(), `${JSON.stringify(inventories, null, 2)}\n`, "utf8");
}

function createEmptyInventory(ownerEmail: string): MissingInventory {
  return MissingInventorySchema.parse({
    ownerEmail,
    updatedAt: new Date().toISOString(),
    items: {},
  });
}

function hasSameItems(left: MissingInventory["items"], right: MissingInventory["items"]): boolean {
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((code, index) => code === rightKeys[index]);
}

export async function getMissingInventory(ownerEmail: string): Promise<MissingInventory> {
  const inventories = await readInventories();
  const found = inventories.find((entry) => entry.ownerEmail === ownerEmail);

  if (found) {
    return found;
  }

  const created = createEmptyInventory(ownerEmail);
  await writeInventories([...inventories, created]);
  return created;
}

export async function replaceMissingInventory(
  ownerEmail: string,
  items: Record<string, true>,
): Promise<MissingInventory> {
  const normalizedItems = MissingRecordSchema.parse(items);
  const inventories = await readInventories();
  const previous =
    inventories.find((entry) => entry.ownerEmail === ownerEmail) ??
    createEmptyInventory(ownerEmail);

  if (hasSameItems(previous.items, normalizedItems)) {
    return previous;
  }

  const nextInventory = MissingInventorySchema.parse({
    ownerEmail,
    updatedAt: new Date().toISOString(),
    items: normalizedItems,
  });

  const next = inventories.filter((entry) => entry.ownerEmail !== ownerEmail);
  next.push(nextInventory);
  await writeInventories(next);
  return nextInventory;
}

export async function clearStoredMissingInventory(ownerEmail: string): Promise<MissingInventory> {
  return replaceMissingInventory(ownerEmail, {});
}
