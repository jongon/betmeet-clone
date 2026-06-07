import {
  type MissingInventory,
  MissingInventorySchema,
  MissingRecordSchema,
} from "@/lib/missing-schema";
import { prisma } from "@/lib/prisma";

function toInventory(row: {
  ownerEmail: string;
  updatedAt: Date;
  items: unknown;
}): MissingInventory {
  const parsed = MissingInventorySchema.parse({
    ownerEmail: row.ownerEmail,
    updatedAt: row.updatedAt.toISOString(),
    items: row.items,
  });
  return parsed;
}

function createDefault(ownerEmail: string): MissingInventory {
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
  const row = await prisma.missingInventory.findUnique({ where: { ownerEmail } });

  if (row) return toInventory(row);

  const created = await prisma.missingInventory.create({
    data: {
      ownerEmail,
      updatedAt: new Date(),
      items: {},
    },
  });

  return toInventory(created);
}

export async function replaceMissingInventory(
  ownerEmail: string,
  items: Record<string, true>,
): Promise<MissingInventory> {
  const normalizedItems = MissingRecordSchema.parse(items);
  const existing = await prisma.missingInventory.findUnique({ where: { ownerEmail } });

  const previousItems: Record<string, true> = (existing?.items as Record<string, true>) ?? {};

  if (hasSameItems(previousItems, normalizedItems)) {
    return existing ? toInventory(existing) : createDefault(ownerEmail);
  }

  const row = await prisma.missingInventory.upsert({
    where: { ownerEmail },
    create: {
      ownerEmail,
      updatedAt: new Date(),
      items: normalizedItems,
    },
    update: {
      updatedAt: new Date(),
      items: normalizedItems,
    },
  });

  return toInventory(row);
}

export async function clearStoredMissingInventory(ownerEmail: string): Promise<MissingInventory> {
  return replaceMissingInventory(ownerEmail, {});
}
