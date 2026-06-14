"use server";

import { revalidatePath } from "next/cache";
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

  // Rate-limit changes (FR-REFINE-12.5), but only after onboarding and after the
  // one post-onboarding grace change (FR-REFINE-17.3). `nicknameUpdatedAt` is also
  // stamped on initial assignment, so the counter is the durable source of truth.
  const existing = await prisma.profile.findUnique({
    where: { id: userData.user.id },
    select: {
      nicknameBase: true,
      nicknameUpdatedAt: true,
      nicknameChangeCount: true,
      onboardingCompleted: true,
    },
  });
  if (
    existing?.onboardingCompleted &&
    existing.nicknameChangeCount >= 2 &&
    existing.nicknameUpdatedAt
  ) {
    const elapsedDays = (Date.now() - existing.nicknameUpdatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (elapsedDays < NICKNAME_CHANGE_COOLDOWN_DAYS) {
      return { error: "rate_limited" as const };
    }
  }

  const discriminator = await assignDiscriminator(parsed.data);
  if (!discriminator) {
    return { error: "This nickname is fully taken. Please choose another." };
  }

  const nextNicknameChangeCount = existing?.onboardingCompleted
    ? Math.max(existing.nicknameChangeCount, existing.nicknameBase ? 1 : 0) + 1
    : 1;

  await prisma.profile.update({
    where: { id: userData.user.id },
    data: {
      nicknameBase: parsed.data,
      nicknameDiscriminator: discriminator,
      nicknameUpdatedAt: new Date(),
      nicknameChangeCount: nextNicknameChangeCount,
    },
  });

  revalidatePath("/settings/profile");
  return { success: true, nickname: `${parsed.data}#${discriminator}` };
}
