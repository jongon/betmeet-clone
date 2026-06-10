"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { NicknameBaseSchema } from "../schemas";
import { assignDiscriminator } from "../services/nickname";

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

  const discriminator = await assignDiscriminator(parsed.data);
  if (!discriminator) {
    return { error: "This nickname is fully taken. Please choose another." };
  }

  await prisma.profile.update({
    where: { id: userData.user.id },
    data: { nicknameBase: parsed.data, nicknameDiscriminator: discriminator },
  });

  return { success: true, nickname: `${parsed.data}#${discriminator}` };
}
