import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { sanitizeConnectionString } from "../src/lib/prisma";

/**
 * Unit 74 — one-off data repair (no schema change).
 *
 * The original Unit-4 seed (commit 093fbd3) hardcoded the whole knockout bracket
 * as placeholder rows ("Winner Group C", "Runner-up Group F", …) created with
 * `providerMatchId = null`. When the seed later switched to football-data.org
 * (commit d1eba0b) every knockout fixture was ingested again, this time with a
 * real `providerMatchId`. The sync upserts by `providerMatchId`, so it never
 * touched the old null-id rows: each knockout phase ended up with both sets,
 * doubling the fixtures (e.g. Round of 32 showed 31 instead of 16).
 *
 * These null-`providerMatchId` rows never sync results and are now fully
 * superseded by the provider rows. They carry no predictions. Delete them.
 *
 * Default mode is a dry-run; pass `--apply` to write. Runs in a single
 * transaction against DIRECT_URL (non-pooled, session mode). Aborts if any
 * phantom row unexpectedly carries predictions, so nothing user-owned is lost.
 */

const APPLY = process.argv.includes("--apply");

function makeClient() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("DIRECT_URL or DATABASE_URL is required");
  const adapter = new PrismaPg({ connectionString: sanitizeConnectionString(url) });
  return new PrismaClient({ adapter });
}

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

async function removePhantomMatches(tx: Tx): Promise<{ deleted: number }> {
  const phantoms = await tx.match.findMany({
    where: { providerMatchId: null },
    include: {
      phase: { select: { name: true } },
      _count: { select: { predictions: true } },
    },
    orderBy: { kickoffAt: "asc" },
  });

  if (phantoms.length === 0) {
    console.log("• No phantom matches (providerMatchId = null) found — already clean.");
    return { deleted: 0 };
  }

  // Safety guard: these rows must be inert. A phantom with predictions would mean
  // users predicted a duplicate fixture — bail out and surface it for review
  // rather than cascade-deleting their data.
  const withPredictions = phantoms.filter((m) => m._count.predictions > 0);
  if (withPredictions.length > 0) {
    throw new Error(
      `Aborting: ${withPredictions.length} phantom match(es) carry predictions ` +
        `(ids: ${withPredictions.map((m) => m.id).join(", ")}). Manual review required.`,
    );
  }

  const byPhase = new Map<string, number>();
  for (const m of phantoms) {
    const name = m.phase?.name ?? "(no phase)";
    byPhase.set(name, (byPhase.get(name) ?? 0) + 1);
  }

  console.log(`• Found ${phantoms.length} phantom match(es) to delete (0 predictions):`);
  for (const [phase, count] of byPhase) {
    console.log(`    ${phase}: ${count}`);
  }
  for (const m of phantoms) {
    console.log(
      `    - ${m.id} | ${m.phase?.name} | ${m.homePlaceholder ?? "TBD"} vs ${m.awayPlaceholder ?? "TBD"} | ${m.kickoffAt?.toISOString()}`,
    );
  }

  if (!APPLY) return { deleted: phantoms.length };

  const result = await tx.match.deleteMany({ where: { providerMatchId: null } });
  return { deleted: result.count };
}

async function main() {
  const prisma = makeClient();
  console.log(`\n=== Unit 74 repair — ${APPLY ? "APPLY (writing)" : "DRY-RUN (no writes)"} ===\n`);

  try {
    const result = await prisma.$transaction((tx) => removePhantomMatches(tx));
    console.log(
      `\nSummary: ${result.deleted} phantom match(es) ${APPLY ? "deleted" : "to delete"}.`,
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
