import { prisma } from "@/lib/prisma";
import { scoreMatch } from "./score-match";

/**
 * Backstop sweeper (BL-3, Q2=A): scores every FINISHED match that still has at
 * least one prediction without a score. Invoked at the end of the competition
 * sync (sweeper post-sync) and safe to run on a cron.
 */
export async function scoreFinishedUnscoredMatches(): Promise<{ matches: number }> {
  const matches = await prisma.match.findMany({
    where: {
      status: "FINISHED",
      predictions: { some: { score: { is: null } } },
    },
    select: { id: true },
  });

  for (const match of matches) {
    await scoreMatch(match.id);
  }

  return { matches: matches.length };
}
