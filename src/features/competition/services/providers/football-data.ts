import type { ProviderSyncScope } from "@/generated/prisma/enums";
import { WORLD_CUP_2026_TEAMS } from "../../seed/world-cup-2026";
import { mapFootballDataStatus } from "../status-mapping";
import type { CompetitionProvider, NormalizedProviderPayload, ProviderSyncWindow } from "./types";

const BASE_URL = "https://api.football-data.org/v4/competitions/WC/matches";
const SEASON = "2026";

type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: string;
  matchday: number;
  stage: string;
  group: string | null;
  lastUpdated: string;
  // Knockout fixtures whose teams are not decided yet come back with null fields.
  homeTeam: {
    id: number | null;
    name: string | null;
    shortName: string | null;
    tla: string | null;
  };
  awayTeam: {
    id: number | null;
    name: string | null;
    shortName: string | null;
    tla: string | null;
  };
  score: {
    winner: string | null;
    duration: string;
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
    // Only present for knockout matches that ran past 90 minutes. `fullTime` for a
    // shootout match bakes in the penalties, so these break it back down (see splitScore).
    regularTime?: { home: number | null; away: number | null };
    extraTime?: { home: number | null; away: number | null };
    penalties?: { home: number | null; away: number | null };
  };
};

const nz = (n: number | null | undefined): number => n ?? 0;

/**
 * Splits football-data.org's score into the **run-of-play result** (the goals that count
 * as the match score) and the **penalty shootout**, when there is one.
 *
 * For a penalty-decided knockout the provider bakes the shootout into `fullTime`: Germany
 * 1–1 Paraguay with pens 5–4 comes back as `fullTime` 5–6 (`duration: PENALTY_SHOOTOUT`,
 * with the breakdown in `regularTime`/`extraTime`/`penalties`). Mapping `fullTime` as the
 * match score is what shows the penalties as the final result — which is wrong. Here the
 * match score is the 120-minute play (`regularTime` + `extraTime`) and the shootout is
 * surfaced separately. Non-shootout matches keep `fullTime` (already the real 90'/120'
 * result, no shootout to strip). Ref match: Germany vs Paraguay (Unit 75).
 */
function splitScore(score: FootballDataMatch["score"]): {
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
} {
  const pens = score.penalties;
  const hasShootout =
    score.duration === "PENALTY_SHOOTOUT" && pens != null && pens.home != null && pens.away != null;

  if (hasShootout) {
    const reg = score.regularTime ?? score.fullTime;
    const et = score.extraTime ?? { home: 0, away: 0 };
    return {
      homeScore: nz(reg.home) + nz(et.home),
      awayScore: nz(reg.away) + nz(et.away),
      homePenaltyScore: pens.home,
      awayPenaltyScore: pens.away,
    };
  }

  return {
    homeScore: score.fullTime.home,
    awayScore: score.fullTime.away,
    homePenaltyScore: null,
    awayPenaltyScore: null,
  };
}

// Build a lookup map from fifaCode to canonical team data for enrichment.
const canonicalTeamByFifaCode = new Map<string, (typeof WORLD_CUP_2026_TEAMS)[number]>(
  WORLD_CUP_2026_TEAMS.map((t) => [t.fifaCode, t]),
);

/**
 * Provider TLA → canonical `fifaCode` aliases.
 *
 * The whole team pipeline (enrichment, `sync-orchestrator` lookups, `upsertTeam`) keys on
 * `fifaCode`, which we take from the provider's three-letter `tla`. When the provider's TLA differs
 * from our canonical code the enrichment misses, the team gets a fabricated `/flags/<tla>.svg` path
 * (a non-existent asset → broken flag) and `upsertTeam` creates a duplicate row instead of updating
 * the canonical one. Uruguay is the live case: football-data.org returns `tla = "URU"` but our
 * canonical code is `URY` (asset `uy.svg`), which is what re-broke Uruguay's flag after the Unit 60
 * data repair. Aliasing here, at the normalization boundary, is the single source of truth that
 * keeps every downstream consumer landing on the canonical row. See Unit 69.
 */
const TLA_ALIAS: Record<string, string> = {
  URU: "URY",
};

function canonicalFifaCode(tla: string | null | undefined): string | null {
  if (tla?.length !== 3) return null;
  return TLA_ALIAS[tla] ?? tla;
}

/**
 * Maps a sync scope to the football-data.org `status` filter (comma-separated, the API accepts a
 * list). The provider's status vocabulary is the source of truth here, not our internal one:
 * upcoming matches with a confirmed date are `TIMED` (only date-TBD ones stay `SCHEDULED`), so
 * `FIXTURES` must request both or the cron silently misses every newly-dated knockout match (the
 * Round of 32 fixtures never landing in the DB). For the same reason live matches are `IN_PLAY` /
 * `PAUSED` — `LIVE` is our internal status, not a valid provider filter. `FULL` omits the filter
 * (matches the seed path, see seed-matches.ts).
 */
function resolveScopeStatus(scope: ProviderSyncScope): string | null {
  switch (scope) {
    case "FIXTURES":
      return "SCHEDULED,TIMED";
    case "LIVE_STATUS":
      return "IN_PLAY,PAUSED";
    case "RESULTS":
      return "FINISHED";
    default:
      return null;
  }
}

function stageToPhaseName(stage: string, group: string | null): string {
  const stageMap: Record<string, string> = {
    GROUP_STAGE: group ? group.replace("GROUP_", "Group ") : "Group Stage",
    LAST_16: "Round of 16",
    LAST_32: "Round of 32",
    QUARTER_FINALS: "Quarter-finals",
    SEMI_FINALS: "Semi-finals",
    THIRD_PLACE: "Third place play-off",
    FINAL: "Final",
  };
  return stageMap[stage] ?? stage;
}

export class FootballDataProvider implements CompetitionProvider {
  async fetch(
    scope: ProviderSyncScope,
    window: ProviderSyncWindow,
  ): Promise<NormalizedProviderPayload> {
    const apiKey = process.env.FOOTBALL_DATA_KEY;
    if (!apiKey) {
      throw new Error("FOOTBALL_DATA_KEY_MISSING");
    }

    const params = new URLSearchParams({ season: SEASON });
    const statusFilter = resolveScopeStatus(scope);
    if (statusFilter) params.set("status", statusFilter);
    if (window.from) params.set("dateFrom", window.from.toISOString().slice(0, 10));
    if (window.to) params.set("dateTo", window.to.toISOString().slice(0, 10));

    const url = `${BASE_URL}?${params.toString()}`;
    const response = await fetch(url, {
      headers: { "X-Auth-Token": apiKey },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      if (response.status === 429 || text.includes("rate") || text.includes("Rate")) {
        throw new Error("RATE_LIMIT");
      }
      throw new Error(`Football Data API error ${response.status}: ${text.slice(0, 200)}`);
    }

    const data = (await response.json()) as { matches: FootballDataMatch[] };
    const requestId = response.headers.get("x-request-id") ?? undefined;

    const matches = data.matches.map((match) => {
      const homeFifaCode = canonicalFifaCode(match.homeTeam.tla);
      const awayFifaCode = canonicalFifaCode(match.awayTeam.tla);
      const { homeScore, awayScore, homePenaltyScore, awayPenaltyScore } = splitScore(match.score);
      return {
        providerMatchId: String(match.id),
        matchNumber: match.matchday,
        phaseName: stageToPhaseName(match.stage, match.group),
        kickoffAt: match.utcDate,
        status: mapFootballDataStatus(match.status),
        homeFifaCode,
        awayFifaCode,
        // For knockout fixtures whose teams are not decided yet the provider has
        // no resolvable TLA. Keep its descriptive label (e.g. "Winner Group C")
        // as the placeholder so the real synced row still reads meaningfully
        // until the team resolves — without resurrecting the legacy hardcoded
        // placeholder rows (Unit 74). When the team resolves, fifaCode wins and
        // the placeholder is cleared.
        homePlaceholder: homeFifaCode ? null : (match.homeTeam.name ?? null),
        awayPlaceholder: awayFifaCode ? null : (match.awayTeam.name ?? null),
        homeScore,
        awayScore,
        homePenaltyScore,
        awayPenaltyScore,
      };
    });

    // Extract unique teams from matches and enrich with canonical data (isoAlpha2, flagKey, flagPath).
    // This ensures the sync path upserts teams, so the snapshot fallback also contains team data.
    const teamsMap = new Map<string, { fifaCode: string; name: string; providerTeamId: string }>();
    for (const match of data.matches) {
      const homeCode = canonicalFifaCode(match.homeTeam.tla);
      if (homeCode) {
        teamsMap.set(homeCode, {
          fifaCode: homeCode,
          name: match.homeTeam.name ?? homeCode,
          providerTeamId: String(match.homeTeam.id),
        });
      }
      const awayCode = canonicalFifaCode(match.awayTeam.tla);
      if (awayCode) {
        teamsMap.set(awayCode, {
          fifaCode: awayCode,
          name: match.awayTeam.name ?? awayCode,
          providerTeamId: String(match.awayTeam.id),
        });
      }
    }

    const teams = Array.from(teamsMap.values()).map((team) => {
      const canonical = canonicalTeamByFifaCode.get(team.fifaCode);
      return {
        name: canonical?.name ?? team.name,
        fifaCode: team.fifaCode,
        isoAlpha2: canonical?.isoAlpha2 ?? null,
        flagKey: canonical?.flagKey ?? team.fifaCode.toLowerCase(),
        flagPath: canonical?.flagPath ?? `/flags/${team.fifaCode.toLowerCase()}.svg`,
        providerTeamId: team.providerTeamId,
      };
    });

    return { teams, matches, providerRequestId: requestId };
  }
}
