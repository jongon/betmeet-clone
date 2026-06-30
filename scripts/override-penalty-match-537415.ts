import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { sanitizeConnectionString } from "../src/lib/prisma";

/**
 * Unit 75 — one-off admin override for Germany vs Paraguay (providerMatchId 537415).
 *
 * football-data.org returns a broken shootout for this match: `score.penalties` is an
 * impossible 4–4 tie with `winner: null`. The real result (confirmed by the admin) is
 * Germany 1–1 Paraguay, shootout Germany 3 – Paraguay 4 (Paraguay advances). We freeze it
 * with `manualOverride = true` so the flaky provider data can't overwrite it again. This
 * mirrors what `forceMatchResult` writes; re-scoring is done by `rescore-penalty-match.ts`.
 *
 * Default mode is a dry-run; pass `--apply` to write.
 */
const APPLY = process.argv.includes("--apply");

// Confirmed real result.
const HOME_SCORE = 1;
const AWAY_SCORE = 1;
const HOME_PEN = 3; // Germany
const AWAY_PEN = 4; // Paraguay (winner)
const REASON =
  "Unit 75: football-data devolvió la tanda rota (penalties 4-4, winner null); resultado real confirmado por admin: 1-1, tanda 3-4 (gana Paraguay).";

function makeClient() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DIRECT_URL or DATABASE_URL is required");
  const adapter = new PrismaPg({ connectionString: sanitizeConnectionString(url) });
  return new PrismaClient({ adapter });
}

async function main() {
  const prisma = makeClient();
  try {
    const m = await prisma.match.findFirst({
      where: { providerMatchId: "537415" },
      include: { homeTeam: true, awayTeam: true },
    });
    if (!m) throw new Error("537415 not found");
    if (!m.homeTeamId || !m.awayTeamId) throw new Error("match has no resolved teams");

    const winnerTeamId = m.awayTeamId; // Paraguay won the shootout.
    const admin = await prisma.profile.findFirst({
      where: { verificationStatus: "ADMIN" },
      select: { id: true },
    });

    console.log(`${m.homeTeam?.fifaCode} vs ${m.awayTeam?.fifaCode} (537415)`);
    console.log(
      `  BEFORE: ${m.homeScore}-${m.awayScore}  pens=${m.homePenaltyScore}-${m.awayPenaltyScore}  winner=${m.winnerTeamId ?? "null"}  manualOverride=${m.manualOverride}`,
    );
    console.log(
      `  AFTER : ${HOME_SCORE}-${AWAY_SCORE}  pens=${HOME_PEN}-${AWAY_PEN}  winner=${m.awayTeam?.fifaCode} (${winnerTeamId})  manualOverride=true`,
    );

    if (APPLY) {
      await prisma.match.update({
        where: { id: m.id },
        data: {
          homeScore: HOME_SCORE,
          awayScore: AWAY_SCORE,
          homePenaltyScore: HOME_PEN,
          awayPenaltyScore: AWAY_PEN,
          winnerTeamId,
          status: "FINISHED",
          manualOverride: true,
          manualOverrideReason: REASON,
          overriddenByUserId: admin?.id ?? null,
          overriddenAt: new Date(),
        },
      });
      console.log("  APPLIED (frozen — provider syncs will no longer overwrite it).");
    } else {
      console.log("\nDry-run only. Re-run with --apply to write.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
