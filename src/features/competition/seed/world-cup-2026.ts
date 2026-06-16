import type { CompetitionPhaseType } from "@/generated/prisma/enums";

// FIFA World Cup 2026 — estructura de la competición (competición, equipos, fases).
// Códigos FIFA (trigrama) y banderas (ISO alpha-2 / subdivisión gb-eng, gb-sct) propios.
//
// Los partidos NO se definen aquí: se obtienen de football-data.org en el seed
// (ver services/seed-matches.ts) con respaldo en un snapshot commiteado.

export const WORLD_CUP_2026 = {
  slug: "world-cup-2026",
  name: "FIFA World Cup 2026",
  season: "2026",
  startsAt: "2026-06-11T19:00:00.000Z",
  endsAt: "2026-07-19T23:59:59.000Z",
  timezone: "UTC",
  provider: "FOOTBALL_DATA",
  providerCompetitionId: "WC",
  isActive: true,
} as const;

type SeedTeam = {
  name: string;
  fifaCode: string;
  isoAlpha2: string | null;
  flagKey: string;
  flagPath: string;
  providerTeamId: string | null;
};

const t = (
  name: string,
  fifaCode: string,
  flagKey: string,
  isoAlpha2: string | null = flagKey,
): SeedTeam => ({
  name,
  fifaCode,
  isoAlpha2,
  flagKey,
  flagPath: `/flags/${flagKey}.svg`,
  providerTeamId: null,
});

export const WORLD_CUP_2026_TEAMS: SeedTeam[] = [
  // Group A
  t("Mexico", "MEX", "mx"),
  t("South Africa", "RSA", "za"),
  t("South Korea", "KOR", "kr"),
  t("Czechia", "CZE", "cz"),
  // Group B
  t("Canada", "CAN", "ca"),
  t("Bosnia and Herzegovina", "BIH", "ba"),
  t("Qatar", "QAT", "qa"),
  t("Switzerland", "SUI", "ch"),
  // Group C
  t("Brazil", "BRA", "br"),
  t("Morocco", "MAR", "ma"),
  t("Haiti", "HAI", "ht"),
  t("Scotland", "SCO", "gb-sct", null),
  // Group D
  t("United States", "USA", "us"),
  t("Paraguay", "PAR", "py"),
  t("Australia", "AUS", "au"),
  t("Türkiye", "TUR", "tr"),
  // Group E
  t("Germany", "GER", "de"),
  t("Curaçao", "CUW", "cw"),
  t("Ivory Coast", "CIV", "ci"),
  t("Ecuador", "ECU", "ec"),
  // Group F
  t("Netherlands", "NED", "nl"),
  t("Japan", "JPN", "jp"),
  t("Sweden", "SWE", "se"),
  t("Tunisia", "TUN", "tn"),
  // Group G
  t("Belgium", "BEL", "be"),
  t("Egypt", "EGY", "eg"),
  t("Iran", "IRN", "ir"),
  t("New Zealand", "NZL", "nz"),
  // Group H
  t("Spain", "ESP", "es"),
  t("Cape Verde", "CPV", "cv"),
  t("Saudi Arabia", "KSA", "sa"),
  t("Uruguay", "URY", "uy"),
  // Group I
  t("France", "FRA", "fr"),
  t("Senegal", "SEN", "sn"),
  t("Iraq", "IRQ", "iq"),
  t("Norway", "NOR", "no"),
  // Group J
  t("Argentina", "ARG", "ar"),
  t("Algeria", "ALG", "dz"),
  t("Austria", "AUT", "at"),
  t("Jordan", "JOR", "jo"),
  // Group K
  t("Portugal", "POR", "pt"),
  t("DR Congo", "COD", "cd"),
  t("Uzbekistan", "UZB", "uz"),
  t("Colombia", "COL", "co"),
  // Group L
  t("England", "ENG", "gb-eng", null),
  t("Croatia", "CRO", "hr"),
  t("Ghana", "GHA", "gh"),
  t("Panama", "PAN", "pa"),
];

type SeedPhase = {
  name: string;
  type: CompetitionPhaseType;
  groupCode: string | null;
  displayOrder: number;
  providerPhaseId: string | null;
};

const groupPhase = (letter: string, order: number): SeedPhase => ({
  name: `Group ${letter}`,
  type: "GROUP",
  groupCode: letter,
  displayOrder: order,
  providerPhaseId: null,
});

const koPhase = (name: string, order: number): SeedPhase => ({
  name,
  type: "KNOCKOUT",
  groupCode: null,
  displayOrder: order,
  providerPhaseId: null,
});

export const WORLD_CUP_2026_PHASES: SeedPhase[] = [
  groupPhase("A", 10),
  groupPhase("B", 20),
  groupPhase("C", 30),
  groupPhase("D", 40),
  groupPhase("E", 50),
  groupPhase("F", 60),
  groupPhase("G", 70),
  groupPhase("H", 80),
  groupPhase("I", 90),
  groupPhase("J", 100),
  groupPhase("K", 110),
  groupPhase("L", 120),
  koPhase("Round of 32", 130),
  koPhase("Round of 16", 140),
  koPhase("Quarter-finals", 150),
  koPhase("Semi-finals", 160),
  koPhase("Third place play-off", 170),
  koPhase("Final", 180),
];
