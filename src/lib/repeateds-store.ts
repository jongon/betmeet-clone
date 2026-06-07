import { prisma } from "@/lib/prisma";
import {
  RepeatedInventoriesSchema,
  type RepeatedInventory,
  type RepeatedsRecord,
} from "@/lib/repeateds";

function toInventory(row: {
  ownerEmail: string;
  updatedAt: Date;
  items: unknown;
}): RepeatedInventory {
  const parsed = RepeatedInventoriesSchema.element.parse({
    ownerEmail: row.ownerEmail,
    updatedAt: row.updatedAt.toISOString(),
    items: row.items,
  });
  return parsed;
}

export async function getInventory(ownerEmail: string): Promise<RepeatedInventory> {
  const row = await prisma.repeatedInventory.findUnique({
    where: { ownerEmail },
  });

  if (row) return toInventory(row);

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
  const existing = await prisma.repeatedInventory.findUnique({ where: { ownerEmail } });
  const baseItems: Record<string, number> = {
    ...((existing?.items as Record<string, number>) ?? {}),
  };

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

  const row = await prisma.repeatedInventory.upsert({
    where: { ownerEmail },
    create: {
      ownerEmail,
      updatedAt: new Date(),
      items: baseItems,
    },
    update: {
      updatedAt: new Date(),
      items: baseItems,
    },
  });

  return toInventory(row);
}

export async function decrementRepeatedInventory(
  ownerEmail: string,
  requestedRepeateds: Array<{ stickerCode: string; quantity: number }>,
): Promise<{ ok: true; inventory: RepeatedInventory } | { ok: false; stickerCode: string }> {
  const existing = await prisma.repeatedInventory.findUnique({ where: { ownerEmail } });
  const baseItems: Record<string, number> = {
    ...((existing?.items as Record<string, number>) ?? {}),
  };

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

  const row = await prisma.repeatedInventory.upsert({
    where: { ownerEmail },
    create: {
      ownerEmail,
      updatedAt: new Date(),
      items: baseItems,
    },
    update: {
      updatedAt: new Date(),
      items: baseItems,
    },
  });

  return { ok: true, inventory: toInventory(row) };
}
