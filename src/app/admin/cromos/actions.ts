"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getGroupStickers, isValidGroupCode } from "@/lib/album-catalog";
import {
  type ExchangeRule,
  ExchangeRuleSchema,
  type ExchangeSettings,
  ExchangeSettingsSchema,
} from "@/lib/exchange-settings";
import { saveGlobalExchangeSettings, saveStickerOverride } from "@/lib/exchange-settings-store";
import { saveGroupRepeateds } from "@/lib/repeateds-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const QuantityMapSchema = z.record(z.string(), z.number().int().min(0));

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
  await saveStickerOverride(user.email, stickerCode, parsed);
  revalidatePath("/admin/cromos");
}
