import type { MatchStatus, ProviderSyncScope, ProviderSyncStatus } from "@/generated/prisma/enums";

export interface SyncRunRow {
  id: string;
  scope: ProviderSyncScope;
  status: ProviderSyncStatus;
  startedAt: string;
  finishedAt: string | null;
  itemsFetched: number;
  itemsUpdated: number;
  errorMessage: string | null;
}

export interface ScopeSuccess {
  scope: ProviderSyncScope;
  finishedAt: string | null;
  itemsUpdated: number;
}

export interface SyncStatusView {
  lastSuccessByScope: ScopeSuccess[];
  recentRuns: SyncRunRow[];
}

export interface AdminMatchRow {
  id: string;
  label: string;
  phaseType: string;
  status: MatchStatus;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamName: string | null;
  awayTeamName: string | null;
  homeScore: number | null;
  awayScore: number | null;
  isOverridden: boolean;
  overriddenAt: string | null;
  kickoffAt: string | null;
}
