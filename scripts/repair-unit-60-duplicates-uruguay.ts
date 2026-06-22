import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { sanitizeConnectionString } from "../src/lib/prisma";

/**
 * Unit 60 — one-off data repair (no schema change).
 *
 *  1. Consolidate the duplicate Uruguay team: the stale row written before the
 *     `URU -> URY` fix (commit a2cfb96) still points at `/flags/uru.svg`, which
 *     does not exist, so its flag renders broken. Re-point every reference to
 *     the canonical `URY` team (`/flags/uy.svg`) and delete the orphan.
 *
 *  2. De-duplicate the matches on 2026-06-27 and 2026-06-28. Each fixture was
 *     ingested twice and split into a pair: one row carries `providerMatchId`
 *     (football-data.org sync — receives live results) with `matchNumber = null`,
 *     the other carries `matchNumber` with `providerMatchId = null`. Keep the
 *     synced row (it also has >= predictions), backfill the lost `matchNumber`
 *     onto it (the @@unique([competitionId, matchNumber]) forces us to delete the
 *     loser first to free the number), and delete the loser — its predictions and
 *     prediction_scores cascade away.
 *
 * Default mode is a dry-run; pass `--apply` to write. Runs in a single
 * transaction against DIRECT_URL (non-pooled, session mode).
 */

const APPLY = process.argv.includes("--apply");

const TARGET_FROM = new Date("2026-06-27T00:00:00Z");
const TARGET_TO = new Date("2026-06-29T00:00:00Z"); // exclusive

const ORPHAN_FLAG_PATH = "/flags/uru.svg";
const CANONICAL_FIFA_CODE = "URY";

function makeClient() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DIRECT_URL or DATABASE_URL is required");
  const adapter = new PrismaPg({ connectionString: sanitizeConnectionString(url) });
  return new PrismaClient({ adapter });
}

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

function groupKey(m: {
  competitionId: string;
  kickoffAt: Date | null;
  phaseId: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
}): string {
  const base = [m.competitionId, m.kickoffAt?.toISOString() ?? "null"];
  // Group-stage rows are identified by their resolved teams. Knockout placeholder
  // rows have null teams, and the provider/snapshot twins disagree on placeholder
  // text (one carries "Runner-up Group A", the other null), so for those we key on
  // phase + kickoff instead — within a phase a kickoff slot holds a single fixture.
  if (m.homeTeamId !== null || m.awayTeamId !== null) {
    return [...base, m.homeTeamId ?? "null", m.awayTeamId ?? "null"].join("|");
  }
  return [...base, "tbd", m.phaseId].join("|");
}

async function consolidateUruguay(tx: Tx): Promise<void> {
  const orphans = await tx.team.findMany({
    where: { OR: [{ flagPath: ORPHAN_FLAG_PATH }, { fifaCode: "URU" }] },
  });
  const canonical = await tx.team.findFirst({ where: { fifaCode: CANONICAL_FIFA_CODE } });

  if (orphans.length === 0) {
    console.log("• Uruguay: no orphan team found — already consolidated.");
    return;
  }
  if (!canonical) {
    throw new Error(
      `Found orphan Uruguay team(s) but no canonical ${CANONICAL_FIFA_CODE} row to merge into — aborting.`,
    );
  }

  for (const orphan of orphans) {
    if (orphan.id === canonical.id) continue;

    const [homeCount, awayCount, winnerCount, penaltyCount] = await Promise.all([
      tx.match.count({ where: { homeTeamId: orphan.id } }),
      tx.match.count({ where: { awayTeamId: orphan.id } }),
      tx.match.count({ where: { winnerTeamId: orphan.id } }),
      tx.prediction.count({ where: { penaltyWinnerTeamId: orphan.id } }),
    ]);

    console.log(
      `• Uruguay: merge orphan ${orphan.id} (${orphan.fifaCode}, ${orphan.flagPath}) -> ` +
        `${canonical.id} (${canonical.fifaCode}, ${canonical.flagPath}); ` +
        `repoint home=${homeCount} away=${awayCount} winner=${winnerCount} penalty=${penaltyCount}, then delete orphan.`,
    );

    if (!APPLY) continue;

    await tx.match.updateMany({
      where: { homeTeamId: orphan.id },
      data: { homeTeamId: canonical.id },
    });
    await tx.match.updateMany({
      where: { awayTeamId: orphan.id },
      data: { awayTeamId: canonical.id },
    });
    await tx.match.updateMany({
      where: { winnerTeamId: orphan.id },
      data: { winnerTeamId: canonical.id },
    });
    await tx.prediction.updateMany({
      where: { penaltyWinnerTeamId: orphan.id },
      data: { penaltyWinnerTeamId: canonical.id },
    });
    await tx.team.delete({ where: { id: orphan.id } });
  }
}

async function dedupeMatches(tx: Tx): Promise<{ pairs: number; predictionsDeleted: number }> {
  const matches = await tx.match.findMany({
    where: { kickoffAt: { gte: TARGET_FROM, lt: TARGET_TO } },
    include: { _count: { select: { predictions: true } } },
    orderBy: { kickoffAt: "asc" },
  });

  const groups = new Map<string, typeof matches>();
  for (const m of matches) {
    const key = groupKey(m);
    const bucket = groups.get(key) ?? [];
    bucket.push(m);
    groups.set(key, bucket);
  }

  let pairs = 0;
  let predictionsDeleted = 0;

  for (const [, group] of groups) {
    if (group.length < 2) continue;

    const providerRows = group.filter((m) => m.providerMatchId !== null && m.matchNumber === null);
    const numberOnlyRows = group.filter(
      (m) => m.providerMatchId === null && m.matchNumber !== null,
    );

    // Safety guard: only act on the exact corrupt shape (one synced row + one
    // snapshot-only row). Anything else (healthy rows with both fields, or an
    // unexpected cardinality) is left untouched and surfaced for review.
    if (group.length !== 2 || providerRows.length !== 1 || numberOnlyRows.length !== 1) {
      console.warn(
        `! Skipping unexpected group of ${group.length} at ${group[0].kickoffAt?.toISOString()} ` +
          `(ids: ${group.map((m) => m.id).join(", ")}) — does not match the provider/number split pattern.`,
      );
      continue;
    }

    const keeper = providerRows[0];
    const loser = numberOnlyRows[0];
    const keeperPreds = keeper._count.predictions;
    const loserPreds = loser._count.predictions;

    console.log(
      `• Dedup ${keeper.kickoffAt?.toISOString()}: keep ${keeper.id} (provider ${keeper.providerMatchId}, ` +
        `${keeperPreds} preds) | delete ${loser.id} (#${loser.matchNumber}, ${loserPreds} preds) | ` +
        `backfill matchNumber=${loser.matchNumber}`,
    );

    // Carry over any identity/display field the synced keeper is missing but the
    // snapshot loser has: the match number, and (for knockout placeholder rows)
    // the "Runner-up Group A" style labels, plus team ids defensively.
    const backfill: {
      matchNumber?: number;
      homeTeamId?: string;
      awayTeamId?: string;
      homePlaceholder?: string;
      awayPlaceholder?: string;
    } = {};
    if (keeper.matchNumber === null && loser.matchNumber !== null)
      backfill.matchNumber = loser.matchNumber;
    if (keeper.homeTeamId === null && loser.homeTeamId !== null)
      backfill.homeTeamId = loser.homeTeamId;
    if (keeper.awayTeamId === null && loser.awayTeamId !== null)
      backfill.awayTeamId = loser.awayTeamId;
    if (keeper.homePlaceholder === null && loser.homePlaceholder !== null)
      backfill.homePlaceholder = loser.homePlaceholder;
    if (keeper.awayPlaceholder === null && loser.awayPlaceholder !== null)
      backfill.awayPlaceholder = loser.awayPlaceholder;

    if (Object.keys(backfill).length > 0) {
      console.log(`    backfill onto keeper: ${JSON.stringify(backfill)}`);
    }

    pairs += 1;
    predictionsDeleted += loserPreds;

    if (!APPLY) continue;

    // Delete the loser first to free up the (competitionId, matchNumber) unique slot.
    await tx.match.delete({ where: { id: loser.id } });
    if (Object.keys(backfill).length > 0) {
      await tx.match.update({ where: { id: keeper.id }, data: backfill });
    }
  }

  return { pairs, predictionsDeleted };
}

async function main() {
  const prisma = makeClient();
  console.log(`\n=== Unit 60 repair — ${APPLY ? "APPLY (writing)" : "DRY-RUN (no writes)"} ===\n`);

  try {
    const result = await prisma.$transaction(async (tx) => {
      await consolidateUruguay(tx);
      console.log("");
      return dedupeMatches(tx);
    });

    console.log(
      `\nSummary: ${result.pairs} duplicate pair(s) ${APPLY ? "removed" : "to remove"}, ` +
        `${result.predictionsDeleted} linked prediction(s) ${APPLY ? "deleted" : "to delete"}.`,
    );
    if (!APPLY) {
      console.log("\nDry-run only. Re-run with --apply to perform the changes.");
    } else {
      console.log("\nDone.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
