"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getCurrentUserId } from "@/features/pools/services/session";
import { prisma } from "@/lib/prisma";
import { PushSubscriptionSchema } from "../schemas";

export async function savePushSubscription(input: unknown) {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  const parsed = PushSubscriptionSchema.safeParse(input);
  if (!parsed.success) return { error: "Suscripción inválida" };

  const headersList = await headers();
  const userAgent = headersList.get("user-agent")?.slice(0, 500) ?? null;

  await prisma.pushSubscription.upsert({
    where: { endpoint: parsed.data.endpoint },
    create: {
      userId,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      userAgent,
    },
    update: {
      userId,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      userAgent,
      isActive: true,
      failureReason: null,
    },
  });

  revalidatePath("/settings/profile");
  return { success: true };
}
