"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/features/pools/services/session";
import { prisma } from "@/lib/prisma";

export async function deactivatePushSubscription(subscriptionId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  await prisma.pushSubscription.updateMany({
    where: { id: subscriptionId, userId },
    data: { isActive: false },
  });

  revalidatePath("/settings/profile");
  return { success: true };
}

export async function deactivateAllPushSubscriptions() {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  await prisma.pushSubscription.updateMany({
    where: { userId },
    data: { isActive: false },
  });

  revalidatePath("/settings/profile");
  return { success: true };
}
