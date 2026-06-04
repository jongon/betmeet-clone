"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getGroupStickers, isValidGroupCode } from "@/lib/album-catalog";
import {
  type ExchangeRule,
  ExchangeRuleSchema,
  type ExchangeSettings,
  ExchangeSettingsSchema,
  type StickerOverride,
  StickerOverrideSchema,
} from "@/lib/exchange-settings";
import {
  resetStickerOverride,
  saveGlobalExchangeSettings,
  saveStickerOverride,
} from "@/lib/exchange-settings-store";
import {
  clearMissingInventoryForAdmin,
  isStickerMissingForAdmin,
  markStickersAsCompletedForAdmin,
  toMissingRecord,
} from "@/lib/missing";
import { MissingStickerCodeSchema } from "@/lib/missing-schema";
import { getMissingInventory, replaceMissingInventory } from "@/lib/missing-store";
import { saveGroupRepeateds } from "@/lib/repeateds-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const QuantityMapSchema = z.record(z.string(), z.number().int().min(0));
const StickerCodesSchema = z.array(MissingStickerCodeSchema);

export async function saveGroupRepeatedsAction(
  groupCode: string,
  quantities: Record<string, number>,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    throw new Error("No authenticated admin");
  }

  if (!isValidGroupCode(groupCode)) {
    throw new Error("Grupo inválido");
  }

  const parsed = QuantityMapSchema.parse(quantities);
  const allowedCodes = new Set(getGroupStickers(groupCode).map((sticker) => sticker.code));
  for (const code of Object.keys(parsed)) {
    if (!allowedCodes.has(code)) {
      throw new Error("Código fuera del grupo seleccionado");
    }
  }

  await saveGroupRepeateds(user.email, groupCode, parsed, allowedCodes);
  revalidatePath("/admin/cromos");
}

export async function saveGlobalExchangeSettingsAction(
  globalSettings: ExchangeSettings,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    throw new Error("No authenticated admin");
  }

  const parsed = ExchangeSettingsSchema.parse(globalSettings);
  await saveGlobalExchangeSettings(user.email, parsed);
  revalidatePath("/admin/cromos");
  revalidatePath("/admin/intercambio");
}

export async function saveStickerOverrideAction(
  stickerCode: string,
  rule: ExchangeRule,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    throw new Error("No authenticated admin");
  }

  if (!stickerCode?.includes("-")) {
    throw new Error("Código de cromo inválido");
  }

  const parsed = ExchangeRuleSchema.parse(rule);
  await saveStickerOverride(user.email, stickerCode, { abstract: parsed, exact: null });
  revalidatePath("/admin/cromos");
}

export async function saveStickerRuleAction(
  stickerCode: string,
  override: StickerOverride | null,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    throw new Error("No authenticated admin");
  }

  if (!stickerCode?.includes("-")) {
    throw new Error("Código de cromo inválido");
  }

  const parsedOverride = StickerOverrideSchema.nullable().parse(override);
  const exactStickerCode = parsedOverride?.exact?.stickerCode;

  if (exactStickerCode && !(await isStickerMissingForAdmin(user.email, exactStickerCode))) {
    throw new Error("El cromo exacto debe estar marcado como faltante antes de guardarlo.");
  }

  await saveStickerOverride(user.email, stickerCode, parsedOverride);
  revalidatePath("/admin/intercambio");
  revalidatePath("/admin/cromos");
}

export async function resetStickerOverrideAction(stickerCode: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    throw new Error("No authenticated admin");
  }

  if (!stickerCode?.includes("-")) {
    throw new Error("Código de cromo inválido");
  }

  await resetStickerOverride(user.email, stickerCode);
  revalidatePath("/admin/intercambio");
  revalidatePath("/admin/cromos");
}

export async function toggleMissingStickerAction(
  stickerCode: string,
  nextMissing: boolean,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    throw new Error("No authenticated admin");
  }

  const parsedStickerCode = MissingStickerCodeSchema.parse(stickerCode);
  const inventory = await getMissingInventory(user.email);
  const nextItems = { ...inventory.items };

  if (nextMissing) {
    nextItems[parsedStickerCode] = true;
  } else {
    delete nextItems[parsedStickerCode];
  }

  await replaceMissingInventory(user.email, nextItems);
  revalidatePath("/admin/cromos/faltantes");
}

export async function applyBulkMissingAction(
  stickerCodes: string[],
  nextMissing: boolean,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    throw new Error("No authenticated admin");
  }

  const parsedStickerCodes = StickerCodesSchema.parse(stickerCodes);
  const inventory = await getMissingInventory(user.email);
  const nextCodes = new Set(Object.keys(inventory.items));

  for (const code of parsedStickerCodes) {
    if (nextMissing) {
      nextCodes.add(code);
    } else {
      nextCodes.delete(code);
    }
  }

  await replaceMissingInventory(user.email, toMissingRecord([...nextCodes]));
  revalidatePath("/admin/cromos/faltantes");
}

export async function clearMissingInventoryAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    throw new Error("No authenticated admin");
  }

  await clearMissingInventoryForAdmin(user.email);
  revalidatePath("/admin/cromos/faltantes");
}

export async function markMissingStickerCompletedAction(stickerCode: string): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    throw new Error("No authenticated admin");
  }

  await markStickersAsCompletedForAdmin(user.email, [MissingStickerCodeSchema.parse(stickerCode)]);
  revalidatePath("/admin/cromos/faltantes");
}
