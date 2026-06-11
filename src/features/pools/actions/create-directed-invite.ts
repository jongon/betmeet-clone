"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { queueNotificationEvent } from "@/features/notifications/services/events";
import { prisma } from "@/lib/prisma";
import { CreateDirectedInviteSchema } from "../schemas";
import { getCurrentUserId } from "../services/session";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function hashEmail(email: string) {
  return createHash("sha256").update(email).digest("hex");
}

function parseNickname(value: string) {
  const trimmed = value.trim();
  const [base, discriminator] = trimmed.split("#");
  if (!base || !discriminator || discriminator.length !== 4) return null;
  return { base, discriminator };
}

async function resolveUserByEmail(email: string): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT p.id
    FROM auth.users u
    INNER JOIN public.profiles p ON p.id = u.id
    WHERE lower(u.email) = ${email}
    LIMIT 1
  `;
  return rows[0]?.id ?? null;
}

async function resolveUserByTarget(target: string) {
  if (target.includes("@")) {
    const email = normalizeEmail(target);
    return {
      invitedUserId: await resolveUserByEmail(email),
      invitedEmailHash: hashEmail(email),
      invitedNickname: null,
    };
  }

  const nickname = parseNickname(target);
  if (!nickname) return { invitedUserId: null, invitedEmailHash: null, invitedNickname: target };

  const profile = await prisma.profile.findFirst({
    where: {
      nicknameBase: { equals: nickname.base, mode: "insensitive" },
      nicknameDiscriminator: nickname.discriminator,
      deletedAt: null,
    },
    select: { id: true },
  });
  return { invitedUserId: profile?.id ?? null, invitedEmailHash: null, invitedNickname: target };
}

export async function createDirectedInvite(input: unknown) {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "No autenticado" };

  const parsed = CreateDirectedInviteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invitación inválida" };

  const pool = await prisma.pool.findUnique({
    where: { id: parsed.data.poolId },
    select: { id: true, name: true, inviteToken: true, ownerId: true },
  });
  if (!pool) return { error: "Liga no encontrada" };
  if (pool.ownerId !== userId) return { error: "Solo el administrador puede invitar" };

  const resolved = await resolveUserByTarget(parsed.data.target);
  if (!resolved.invitedUserId && !resolved.invitedEmailHash) {
    return {
      error: "No encontramos un usuario con ese nickname. Usa formato Nombre#1234 o email.",
    };
  }

  const invite = resolved.invitedUserId
    ? await prisma.poolDirectedInvite.upsert({
        where: { poolId_invitedUserId: { poolId: pool.id, invitedUserId: resolved.invitedUserId } },
        update: { status: "PENDING", inviteToken: pool.inviteToken },
        create: {
          poolId: pool.id,
          createdByUserId: userId,
          inviteToken: pool.inviteToken,
          ...resolved,
        },
      })
    : await prisma.poolDirectedInvite.create({
        data: {
          poolId: pool.id,
          createdByUserId: userId,
          inviteToken: pool.inviteToken,
          ...resolved,
        },
      });

  if (invite.invitedUserId) {
    await queueNotificationEvent({
      type: "POOL_INVITE",
      dedupeKey: `pool-invite:${pool.id}:${invite.invitedUserId}`,
      recipientUserId: invite.invitedUserId,
      payload: {
        title: "Te invitaron a una liga",
        body: `Tienes una invitación para ${pool.name}`,
        url: `/pools/join/${pool.inviteToken}`,
      },
    });
  }

  revalidatePath(`/pools/${pool.id}`);
  return { success: true, pushQueued: Boolean(invite.invitedUserId) };
}
