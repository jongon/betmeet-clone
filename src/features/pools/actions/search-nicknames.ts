"use server";

import { prisma } from "@/lib/prisma";
import { SearchNicknameSchema } from "../schemas";
import { getCurrentUserId } from "../services/session";
import type { SearchNicknameResult } from "../types";

export async function searchNicknames(
  input: unknown,
): Promise<SearchNicknameResult[] | { error: string }> {
  const parsed = SearchNicknameSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Busqueda invalida" };
  }

  const userId = await getCurrentUserId();

  const profiles = await prisma.profile.findMany({
    where: {
      nicknameBase: { startsWith: parsed.data.query, mode: "insensitive" },
      deletedAt: null,
      ...(userId ? { id: { not: userId } } : {}),
    },
    select: { id: true, nicknameBase: true, nicknameDiscriminator: true, avatarUrl: true },
    orderBy: [{ nicknameBase: "asc" }, { nicknameDiscriminator: "asc" }],
    take: 8,
  });

  const results: SearchNicknameResult[] = [];
  for (const p of profiles) {
    if (p.nicknameBase && p.nicknameDiscriminator) {
      results.push({
        userId: p.id,
        nicknameBase: p.nicknameBase,
        nicknameDiscriminator: p.nicknameDiscriminator,
        avatarUrl: p.avatarUrl,
      });
    }
  }
  return results;
}
