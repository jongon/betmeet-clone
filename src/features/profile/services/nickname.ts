import { prisma } from "@/lib/prisma";

export async function assignDiscriminator(nicknameBase: string): Promise<string | null> {
  const MAX_RETRIES = 10;

  for (let i = 0; i < MAX_RETRIES; i++) {
    const discriminator = String(Math.floor(Math.random() * 10000)).padStart(4, "0");

    const existing = await prisma.profile.findFirst({
      where: {
        nicknameBase: { equals: nicknameBase, mode: "insensitive" },
        nicknameDiscriminator: discriminator,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!existing) return discriminator;
  }

  return null; // All 10 retries exhausted — extremely rare
}
