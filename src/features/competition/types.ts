import type { MatchStatus } from "@/generated/prisma/enums";

export interface TeamView {
  id: string;
  name: string;
  fifaCode: string;
  flagPath: string;
}

export interface MatchView {
  id: string;
  matchNumber: number | null;
  kickoffAt: string | null;
  status: MatchStatus;
  homeTeam: TeamView | null;
  awayTeam: TeamView | null;
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
}

export interface PhaseView {
  id: string;
  name: string;
  type: string;
  groupCode: string | null;
  matches: MatchView[];
}

export interface FixtureView {
  competitionName: string;
  phases: PhaseView[];
  freshness: FixtureFreshness;
}

export interface FixtureFreshness {
  isStale: boolean;
  lastSyncedAt: string | null;
  reason: "NO_SUCCESSFUL_SYNC" | "LIVE_WINDOW_MISSED" | "RATE_LIMITED" | null;
}
