import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { computeScore } from "../src/features/scoring/compute-score";
import { PrismaClient } from "../src/generated/prisma/client";
import { sanitizeConnectionString } from "../src/lib/prisma";

/**
 * Unit 75 — re-score a match after its result was corrected by the penalty repair.
 *
 * `scripts/repair-unit-75-penalty-scores.ts` rewrote the match goals/shootout, but the
 * persisted `PredictionScore` rows were computed against the OLD result and are now stale.
 * This recomputes them against the corrected result, reusing the single source of truth for
 * the rules (`computeScore`, BR-6.1) and only replicating the thin adapter + upsert that
 * `scoreMatch()` does (which can't be imported here — it pulls the `@/` alias that tsx
 * doesn't resolve). It does NOT bust the rankings cache (`RANKINGS_TAG`) — that needs a
 * Next request context; it self-refreshes by TTL or on the next admin sync/override.
 *
 * Default mode is a dry-run; pass `--apply` to write. Idempotent.
 */
const APPLY = process.argv.includes("--apply");
const PROVIDER_MATCH_ID = process.argv.find((a) => /^\d+$/.test(a)) ?? "537415";

function makeClient() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DIRECT_URL or DATABASE_URL is required");
  const adapter = new PrismaPg({ connectionString: sanitizeConnectionString(url) });
  return new PrismaClient({ adapter });
}

const teamToSide = (
  teamId: string | null,
  homeTeamId: string | null,
  awayTeamId: string | null,
): "home" | "away" | null =>
  teamId === null ? null : teamId === homeTeamId ? "home" : teamId === awayTeamId ? "away" : null;

async function main() {
  const prisma = makeClient();
  try {
    const match = await prisma.match.findFirst({
      where: { providerMatchId: PROVIDER_MATCH_ID },
      include: { phase: true, predictions: true, homeTeam: true, awayTeam: true },
    });
    if (!match) throw new Error(`Match providerMatchId ${PROVIDER_MATCH_ID} not found`);

    const label = `${match.homeTeam?.fifaCode ?? "?"} vs ${match.awayTeam?.fifaCode ?? "?"}`;
    const scoreable =
      match.status === "FINISHED" && match.homeScore !== null && match.awayScore !== null;
    console.log(
      `${label} (${PROVIDER_MATCH_ID}) — ${match.homeScore} - ${match.awayScore}  pens=${match.homePenaltyScore}-${match.awayPenaltyScore}  winner=${match.winnerTeamId ?? "null"}  status=${match.status}  scoreable=${scoreable}`,
    );
    console.log(`Predictions: ${match.predictions.length}`);

    if (!scoreable) {
      console.log("Match not scoreable — scores would be removed. Aborting (handle manually).");
      return;
    }

    const isKnockout = match.phase.type === "KNOCKOUT";
    const existing = await prisma.predictionScore.findMany({ where: { matchId: match.id } });
    const prevByPrediction = new Map(existing.map((s) => [s.predictionId, s.totalPoints]));

    let prevTotal = 0;
    let nextTotal = 0;
    const scoredAt = new Date();

    for (const p of match.predictions) {
      const breakdown = computeScore({
        predictedHome: p.homeScore,
        predictedAway: p.awayScore,
        actualHome: match.homeScore as number,
        actualAway: match.awayScore as number,
        isKnockout,
        predictedPenaltyWinner: teamToSide(
          p.penaltyWinnerTeamId,
          match.homeTeamId,
          match.awayTeamId,
        ),
        actualPenaltyWinner: teamToSide(match.winnerTeamId, match.homeTeamId, match.awayTeamId),
      });
      const prev = prevByPrediction.get(p.id) ?? null;
      prevTotal += prev ?? 0;
      nextTotal += breakdown.totalPoints;
      console.log(
        `  pred ${p.id.slice(0, 8)} user ${p.userId.slice(0, 8)}  ${p.homeScore}-${p.awayScore}` +
          `${p.penaltyWinnerTeamId ? " (pen)" : ""}  ${prev ?? "—"} → ${breakdown.totalPoints} pts  [${breakdown.matchedCase}${breakdown.penaltyApplied ? "+pen" : ""}]`,
      );

      if (APPLY) {
        await prisma.predictionScore.upsert({
          where: { predictionId: p.id },
          create: {
            id: randomUUID(),
            predictionId: p.id,
            matchId: match.id,
            userId: p.userId,
            matchedCase: breakdown.matchedCase,
            basePoints: breakdown.basePoints,
            penaltyApplied: breakdown.penaltyApplied,
            penaltyPoints: breakdown.penaltyPoints,
            totalPoints: breakdown.totalPoints,
            scoredAt,
          },
          update: {
            matchId: match.id,
            userId: p.userId,
            matchedCase: breakdown.matchedCase,
            basePoints: breakdown.basePoints,
            penaltyApplied: breakdown.penaltyApplied,
            penaltyPoints: breakdown.penaltyPoints,
            totalPoints: breakdown.totalPoints,
            scoredAt,
          },
        });
      }
    }

    console.log(
      `\nTotal points for this match: ${prevTotal} → ${nextTotal}` +
        (APPLY ? "  (APPLIED)" : "  (dry-run — re-run with --apply to write)"),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
