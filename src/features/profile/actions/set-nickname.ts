"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { NicknameBaseSchema } from "../schemas";
import { assignDiscriminator } from "../services/nickname";

/** Minimum days between nickname changes to avoid abuse (FR-REFINE-12.5). */
const NICKNAME_CHANGE_COOLDOWN_DAYS = 30;

export async function setNickname(formData: FormData) {
  const raw = formData.get("nicknameBase") as string;

  const parsed = NicknameBaseSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid nickname" };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "Not authenticated" };
  }

  // Rate-limit changes (FR-REFINE-12.5), but ONLY after onboarding is complete.
  // During onboarding the cooldown must not apply: setting a nickname stamps
  // `nicknameUpdatedAt`, so going back a step and re-submitting (FR-REFINE-16.4)
  // would otherwise trip the 30-day cooldown and block finishing onboarding
  // (FR-REFINE-16.5). The cooldown is meant for changing an established nickname.
  const existing = await prisma.profile.findUnique({
    where: { id: userData.user.id },
    select: { nicknameUpdatedAt: true, onboardingCompleted: true },
  });
  if (existing?.onboardingCompleted && existing.nicknameUpdatedAt) {
    const elapsedDays = (Date.now() - existing.nicknameUpdatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (elapsedDays < NICKNAME_CHANGE_COOLDOWN_DAYS) {
      return { error: "rate_limited" as const };
    }
  }

  const discriminator = await assignDiscriminator(parsed.data);
  if (!discriminator) {
    return { error: "This nickname is fully taken. Please choose another." };
  }

  await prisma.profile.update({
    where: { id: userData.user.id },
    data: {
      nicknameBase: parsed.data,
      nicknameDiscriminator: discriminator,
      nicknameUpdatedAt: new Date(),
    },
  });

  return { success: true, nickname: `${parsed.data}#${discriminator}` };
}
