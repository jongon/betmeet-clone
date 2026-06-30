import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { FootballDataProvider } from "../src/features/competition/services/providers/football-data";
import { derivePenaltyWinner } from "../src/features/scoring/compute-score";
import { PrismaClient } from "../src/generated/prisma/client";
import { sanitizeConnectionString } from "../src/lib/prisma";

/**
 * Unit 75 — one-off data repair (no schema change).
 *
 * Knockout matches decided on penalties were synced before the Unit 75 fix, when the
 * provider's penalty-inclusive `score.fullTime` was mapped as the match score (e.g.
 * Germany vs Paraguay stored as 4–5 instead of 1–1, with no shootout score and no winner).
 * This re-reads the FINISHED matches from football-data.org through the **fixed**
 * `FootballDataProvider` (whose `splitScore` now separates the run-of-play result from the
 * shootout) and rewrites only the penalty matches: match goals + penalty score + derived
 * winner. It is exactly what a `RESULTS` admin sync now does, scoped to the shootout rows.
 *
 * Manual overrides are never touched (the sync freezes them; so does this script). It does
 * NOT recompute prediction points — that's a separate `scoreMatch()`/recálculo step.
 *
 * Default mode is a dry-run; pass `--apply` to write. Idempotent.
 */
const APPLY = process.argv.includes("--apply");

function makeClient() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DIRECT_URL or DATABASE_URL is required");
  const adapter = new PrismaPg({ connectionString: sanitizeConnectionString(url) });
  return new PrismaClient({ adapter });
}

async function main() {
  const provider = new FootballDataProvider();
  const payload = await provider.fetch("RESULTS", { windowKey: "repair-unit-75" });
  const penaltyMatches = payload.matches.filter(
    (m) => m.homePenaltyScore != null && m.awayPenaltyScore != null && m.providerMatchId,
  );
  console.log(
    `Provider returned ${payload.matches.length} FINISHED matches; ${penaltyMatches.length} decided on penalties.`,
  );

  const prisma = makeClient();
  let changed = 0;
  try {
    for (const nm of penaltyMatches) {
      const existing = await prisma.match.findFirst({
        where: { providerMatchId: nm.providerMatchId as string },
        include: { homeTeam: true, awayTeam: true },
      });
      if (!existing) {
        console.log(`  [skip] providerMatchId ${nm.providerMatchId} not found in DB`);
        continue;
      }
      const label = `${existing.homeTeam?.fifaCode ?? "?"} vs ${existing.awayTeam?.fifaCode ?? "?"}`;
      if (existing.manualOverride) {
        console.log(
          `  [skip] ${label} (${nm.providerMatchId}) has a manual override — left untouched.`,
        );
        continue;
      }

      const hs = nm.homeScore ?? null;
      const as = nm.awayScore ?? null;
      const hp = nm.homePenaltyScore ?? null;
      const ap = nm.awayPenaltyScore ?? null;

      // Winner: by match score, or by the shootout when the play ended level.
      let winnerTeamId: string | null = null;
      if (hs != null && as != null) {
        if (hs > as) winnerTeamId = existing.homeTeamId;
        else if (hs < as) winnerTeamId = existing.awayTeamId;
        else if (hp != null && ap != null) {
          const side = derivePenaltyWinner(hp, ap);
          winnerTeamId =
            side === "home" ? existing.homeTeamId : side === "away" ? existing.awayTeamId : null;
        }
      }

      console.log(`\n  ${label} (providerMatchId ${nm.providerMatchId})`);
      console.log(
        `    BEFORE: ${existing.homeScore} - ${existing.awayScore}  pens=${existing.homePenaltyScore}-${existing.awayPenaltyScore}  winner=${existing.winnerTeamId ?? "null"}  status=${existing.status}`,
      );
      console.log(
        `    AFTER : ${hs} - ${as}  pens=${hp}-${ap}  winner=${winnerTeamId ?? "null"}  status=FINISHED`,
      );

      if (APPLY) {
        await prisma.match.update({
          where: { id: existing.id },
          data: {
            homeScore: hs,
            awayScore: as,
            homePenaltyScore: hp,
            awayPenaltyScore: ap,
            winnerTeamId,
            status: "FINISHED",
          },
        });
        console.log("    APPLIED.");
      }
      changed++;
    }
    console.log(
      APPLY
        ? `\nDone — ${changed} match(es) updated.`
        : `\nDry-run only — ${changed} match(es) would change. Re-run with --apply to write.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
