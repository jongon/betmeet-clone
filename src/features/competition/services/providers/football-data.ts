import type { ProviderSyncScope } from "@/generated/prisma/enums";
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
      homeFifaCode: match.homeTeam.tla?.length === 3 ? match.homeTeam.tla : null,
      awayFifaCode: match.awayTeam.tla?.length === 3 ? match.awayTeam.tla : null,
      homePlaceholder: null,
      awayPlaceholder: null,
      homeScore: match.score.fullTime.home,
      awayScore: match.score.fullTime.away,
    }));

    return { teams: [], matches, providerRequestId: requestId };
  }
}
