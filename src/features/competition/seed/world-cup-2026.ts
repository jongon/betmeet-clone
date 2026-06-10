import type { MatchStatus } from "@/generated/prisma/enums";

export const WORLD_CUP_2026 = {
  slug: "world-cup-2026",
  name: "FIFA World Cup 2026",
  season: "2026",
  startsAt: "2026-06-11T19:00:00.000Z",
  endsAt: "2026-07-19T23:59:59.000Z",
  timezone: "UTC",
  provider: "API_FOOTBALL",
  providerCompetitionId: null,
  isActive: true,
} as const;

export const WORLD_CUP_2026_TEAMS = [
  {
    name: "Canada",
    fifaCode: "CAN",
    isoAlpha2: "ca",
    flagKey: "ca",
    flagPath: "/flags/ca.svg",
    providerTeamId: null,
  },
  {
    name: "Mexico",
    fifaCode: "MEX",
    isoAlpha2: "mx",
    flagKey: "mx",
    flagPath: "/flags/mx.svg",
    providerTeamId: null,
  },
  {
    name: "United States",
    fifaCode: "USA",
    isoAlpha2: "us",
    flagKey: "us",
    flagPath: "/flags/us.svg",
    providerTeamId: null,
  },
] as const;

export const WORLD_CUP_2026_PHASES = [
  { name: "Group A", type: "GROUP", groupCode: "A", displayOrder: 10, providerPhaseId: null },
  { name: "Group B", type: "GROUP", groupCode: "B", displayOrder: 20, providerPhaseId: null },
  {
    name: "Round of 32",
    type: "KNOCKOUT",
    groupCode: null,
    displayOrder: 130,
    providerPhaseId: null,
  },
  {
    name: "Round of 16",
    type: "KNOCKOUT",
    groupCode: null,
    displayOrder: 140,
    providerPhaseId: null,
  },
  {
    name: "Quarter-finals",
    type: "KNOCKOUT",
    groupCode: null,
    displayOrder: 150,
    providerPhaseId: null,
  },
  {
    name: "Semi-finals",
    type: "KNOCKOUT",
    groupCode: null,
    displayOrder: 160,
    providerPhaseId: null,
  },
  { name: "Final", type: "KNOCKOUT", groupCode: null, displayOrder: 180, providerPhaseId: null },
] as const;

export const WORLD_CUP_2026_MATCHES = [
  {
    matchNumber: 1,
    phaseName: "Group A",
    kickoffAt: "2026-06-11T19:00:00.000Z",
    status: "SCHEDULED" satisfies MatchStatus,
    homeFifaCode: "MEX",
    awayFifaCode: null,
    homePlaceholder: null,
    awayPlaceholder: "Team to be confirmed",
    providerMatchId: null,
  },
  {
    matchNumber: 104,
    phaseName: "Final",
    kickoffAt: "2026-07-19T19:00:00.000Z",
    status: "SCHEDULED" satisfies MatchStatus,
    homeFifaCode: null,
    awayFifaCode: null,
    homePlaceholder: "Winner semi-final 1",
    awayPlaceholder: "Winner semi-final 2",
    providerMatchId: null,
  },
] as const;
