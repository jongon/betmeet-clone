"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOnboardedUserId } from "@/features/profile/queries";
import { prisma } from "@/lib/prisma";
import { CreatePoolSchema } from "../schemas";
import { generateUniqueInviteToken } from "../services/invite-token";

export async function createPool(input: {
  name: string;
  type: string;
  capacity: number;
  membersCanInvite?: boolean; // Unit 45: BR-3.36
}) {
  const parsed = CreatePoolSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  // Onboarding is mandatory (FR-REFINE-16.1): no nickname → cannot create a league.
  const userId = await getOnboardedUserId();
  if (!userId) return { error: "Completa tu perfil para crear una liga." };

  const { name, type, capacity, membersCanInvite } = parsed.data;

  // Name must be unique among public pools (BR-3.2); the DB partial index is the
  // final guard, this is the friendly pre-check.
  if (type === "PUBLIC") {
    const clash = await prisma.pool.findFirst({ where: { type: "PUBLIC", name } });
    if (clash) return { error: "Ya existe una liga pública con ese nombre" };
  }

  const inviteToken = await generateUniqueInviteToken(async (token) => {
    const existing = await prisma.pool.findUnique({ where: { inviteToken: token } });
    return existing !== null;
  });

  let poolId: string;
  try {
    const pool = await prisma.$transaction(async (tx) => {
      const created = await tx.pool.create({
        data: {
          name,
          type,
          capacity,
          inviteToken,
          ownerId: userId,
          membersCanInvite, // Unit 45: BR-45.3
        },
      });
      await tx.poolMembership.create({ data: { poolId: created.id, userId } });
      return created;
    });
    poolId = pool.id;
  } catch {
    return { error: "No se pudo crear la liga. Inténtalo de nuevo." };
  }

  revalidatePath("/pools");
  redirect(`/pools/${poolId}`);
}
