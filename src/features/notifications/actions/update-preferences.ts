"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/features/pools/services/session";
import { prisma } from "@/lib/prisma";
import { NotificationPreferencesSchema } from "../schemas";

export async function updateNotificationPreferences(input: unknown) {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  const parsed = NotificationPreferencesSchema.safeParse(input);
  if (!parsed.success) return { error: "Preferencias inválidas" };

  await prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId, ...parsed.data },
    update: parsed.data,
  });

  revalidatePath("/settings/profile");
  return { success: true };
}
