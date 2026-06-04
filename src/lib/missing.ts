import { z } from "zod";
import { isValidStickerCode } from "@/lib/album-catalog";
import {
  MissingInventoriesSchema,
  type MissingInventory,
  MissingInventorySchema,
  type MissingRecord,
  MissingRecordSchema,
  MissingStickerCodeSchema,
  OwnerEmailSchema,
} from "@/lib/missing-schema";
import {
  clearStoredMissingInventory,
  getMissingInventory,
  replaceMissingInventory,
} from "@/lib/missing-store";

export type MissingProposalValidation =
  | { status: "pending" }
  | {
      status: "rechazada automaticamente";
      stickerCode: string;
      reason: string;
    };

export {
  MissingInventoriesSchema,
  MissingInventorySchema,
  MissingRecordSchema,
  MissingStickerCodeSchema,
  OwnerEmailSchema,
};

function normalizeStickerCodes(stickerCodes: string[]): string[] {
  const uniqueCodes = [...new Set(z.array(MissingStickerCodeSchema).parse(stickerCodes))];
  return uniqueCodes.sort();
}

export function toMissingRecord(stickerCodes: string[]): MissingRecord {
  const items: Record<string, true> = {};
  for (const code of normalizeStickerCodes(stickerCodes)) {
    items[code] = true;
  }
  return MissingRecordSchema.parse(items);
}

export async function isStickerMissingForAdmin(
  ownerEmail: string,
  stickerCode: string,
): Promise<boolean> {
  const parsedOwnerEmail = OwnerEmailSchema.parse(ownerEmail);

  if (!isValidStickerCode(stickerCode)) {
    return false;
  }

  const inventory = await getMissingInventory(parsedOwnerEmail);
  return inventory.items[stickerCode] === true;
}

export async function markStickersAsCompletedForAdmin(
  ownerEmail: string,
  stickerCodes: string[],
): Promise<MissingInventory> {
  const parsedOwnerEmail = OwnerEmailSchema.parse(ownerEmail);
  const codes = normalizeStickerCodes(stickerCodes);

  if (codes.length === 0) {
    return getMissingInventory(parsedOwnerEmail);
  }

  const inventory = await getMissingInventory(parsedOwnerEmail);
  const nextItems = { ...inventory.items };

  for (const code of codes) {
    delete nextItems[code];
  }

  return replaceMissingInventory(parsedOwnerEmail, nextItems);
}

export async function clearMissingInventoryForAdmin(ownerEmail: string): Promise<MissingInventory> {
  return clearStoredMissingInventory(OwnerEmailSchema.parse(ownerEmail));
}

export function buildMissingStickerAutoRejectionReason(stickerCode: string): string {
  MissingStickerCodeSchema.parse(stickerCode);
  return `La propuesta se rechazó automáticamente porque ${stickerCode} ya no está marcado como faltante.`;
}

// Consumidoras futuras: validar al enviar o aprobar y persistir el motivo devuelto.
export async function validateMissingStickersForProposal(
  ownerEmail: string,
  stickerCodes: string[],
): Promise<MissingProposalValidation> {
  const parsedOwnerEmail = OwnerEmailSchema.parse(ownerEmail);

  for (const code of normalizeStickerCodes(stickerCodes)) {
    if (!(await isStickerMissingForAdmin(parsedOwnerEmail, code))) {
      return {
        status: "rechazada automaticamente",
        stickerCode: code,
        reason: buildMissingStickerAutoRejectionReason(code),
      };
    }
  }

  return { status: "pending" };
}
