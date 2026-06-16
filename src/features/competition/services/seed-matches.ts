import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FootballDataProvider } from "./providers/football-data";
import type {
  CompetitionProvider,
  NormalizedProviderPayload,
  ProviderSyncWindow,
} from "./providers/types";
import { runCompetitionSync } from "./sync-orchestrator";

// Committed snapshot of the last successful football-data.org fetch. Acts as the offline
// fallback so the seed can run (e.g. in CI/dev) without FOOTBALL_DATA_KEY, and so a single
// API outage never breaks seeding. Rewritten on every successful fetch.
const SNAPSHOT_PATH = fileURLToPath(
  new URL("../seed/snapshots/world-cup-2026-fixtures.json", import.meta.url),
);

// One call to /competitions/WC/matches returns the whole competition, so a single stable
// sync window/run is enough. Scope FULL omits the API-side `status` filter: football-data.org
// marks upcoming matches as TIMED (not only SCHEDULED), and the persistence layer already
// keeps only pending matches (creates SCHEDULED/LIVE, skips FINISHED/POSTPONED/CANCELLED).
const SEED_SCOPE = "FULL" as const;
const SEED_WINDOW: ProviderSyncWindow = { windowKey: "seed-full" };

type FixturesSnapshot = NormalizedProviderPayload & { fetchedAt: string };

async function writeSnapshot(payload: NormalizedProviderPayload): Promise<void> {
  const snapshot: FixturesSnapshot = { ...payload, fetchedAt: new Date().toISOString() };
  await mkdir(dirname(SNAPSHOT_PATH), { recursive: true });
  await writeFile(SNAPSHOT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
}

async function readSnapshot(): Promise<NormalizedProviderPayload | null> {
  try {
    const raw = await readFile(SNAPSHOT_PATH, "utf8");
    const parsed = JSON.parse(raw) as FixturesSnapshot;
    return {
      teams: parsed.teams ?? [],
      matches: parsed.matches ?? [],
      providerRequestId: parsed.providerRequestId,
    };
  } catch {
    return null;
  }
}

/**
 * Seeds the World Cup 2026 matches from football-data.org.
 *
 * Primary path: one API call (scope FULL) for the whole competition, then refresh the
 * committed snapshot. Fallback: if the API fails (missing key, rate limit, network) and a
 * snapshot exists, seed from it with a warning. If there is neither API nor snapshot, the
 * seed fails. Persistence reuses {@link runCompetitionSync}, so it stays idempotent
 * (keyed by providerMatchId) and registers only matches that are yet to occur.
 *
 * Requires {@link seedCompetitionStructure} to have run first (competition, phases, teams).
 */
export async function seedMatchesFromFootballData(): Promise<void> {
  let payload: NormalizedProviderPayload;

  try {
    payload = await new FootballDataProvider().fetch(SEED_SCOPE, SEED_WINDOW);
    await writeSnapshot(payload);
    console.log(
      `[seed] Fetched ${payload.matches.length} matches from football-data.org; snapshot refreshed`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const snapshot = await readSnapshot();
    if (!snapshot) {
      throw new Error(
        `[seed] football-data.org fetch failed (${message}) and no snapshot fallback exists at ${SNAPSHOT_PATH}`,
      );
    }
    console.warn(
      `[seed] football-data.org fetch failed (${message}); seeding from snapshot fallback (${snapshot.matches.length} matches)`,
    );
    payload = snapshot;
  }

  // Feed the already-resolved payload (live or snapshot) into the existing sync pipeline.
  const provider: CompetitionProvider = { fetch: async () => payload };
  await runCompetitionSync(provider, SEED_SCOPE, SEED_WINDOW);
}
