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
  homeTeam: { id: number; name: string; shortName: string; tla: string };
  awayTeam: { id: number; name: string; shortName: string; tla: string };
  score: {
    winner: string | null;
    duration: string;
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
};

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

function resolveScopeStatus(scope: ProviderSyncScope): string | null {
  switch (scope) {
    case "FIXTURES":
      return "SCHEDULED";
    case "LIVE_STATUS":
      return "LIVE";
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

    const matches = data.matches.map((match) => ({
      providerMatchId: String(match.id),
      matchNumber: match.matchday,
      phaseName: stageToPhaseName(match.stage, match.group),
      kickoffAt: match.utcDate,
      status: mapFootballDataStatus(match.status),
      homeFifaCode: canonicalFifaCode(match.homeTeam.tla),
      awayFifaCode: canonicalFifaCode(match.awayTeam.tla),
      homePlaceholder: null,
      awayPlaceholder: null,
      homeScore: match.score.fullTime.home,
      awayScore: match.score.fullTime.away,
    }));

    // Extract unique teams from matches and enrich with canonical data (isoAlpha2, flagKey, flagPath).
    // This ensures the sync path upserts teams, so the snapshot fallback also contains team data.
    const teamsMap = new Map<string, { fifaCode: string; name: string; providerTeamId: string }>();
    for (const match of data.matches) {
      const homeCode = canonicalFifaCode(match.homeTeam.tla);
      if (homeCode) {
        teamsMap.set(homeCode, {
          fifaCode: homeCode,
          name: match.homeTeam.name,
          providerTeamId: String(match.homeTeam.id),
        });
      }
      const awayCode = canonicalFifaCode(match.awayTeam.tla);
      if (awayCode) {
        teamsMap.set(awayCode, {
          fifaCode: awayCode,
          name: match.awayTeam.name,
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
