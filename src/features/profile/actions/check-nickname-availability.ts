"use server";

import { prisma } from "@/lib/prisma";
import { NicknameBaseSchema } from "../schemas";

export async function checkNicknameAvailability(nicknameBase: string) {
  const parsed = NicknameBaseSchema.safeParse(nicknameBase);
  if (!parsed.success) {
    return { available: false, error: parsed.error.issues[0]?.message };
  }

  const count = await prisma.profile.count({
    where: { nicknameBase: parsed.data, deletedAt: null },
  });

  // A nickname is still "available" if there are fewer than 9999 discriminators used
  return { available: count < 9999 };
}
