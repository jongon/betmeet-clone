import type { CompetitionPhaseType, MatchStatus } from "@/generated/prisma/enums";

// FIFA World Cup 2026 — datos reales del sorteo (5-dic-2025) y calendario oficial.
// Fuente: sorteo + fixtures públicos (Wikipedia/ESPN), consultados 2026-06-11.
// Códigos FIFA (trigrama) y banderas (ISO alpha-2 / subdivisión gb-eng, gb-sct) propios.
//
// NOTA sobre kickoffAt: horas derivadas de las publicadas en horario del Este (ET = UTC−4
// en junio/julio) y convertidas a UTC. Las fechas de grupos son exactas; las horas pueden
// requerir ajuste fino, y las fechas de knockout son aproximadas dentro de su ventana
// oficial (los equipos aún no están resueltos). El admin puede ajustar vía override.

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
  t("Uruguay", "URU", "uy"),
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

type SeedMatch = {
  matchNumber: number;
  phaseName: string;
  kickoffAt: string;
  status: MatchStatus;
  homeFifaCode: string | null;
  awayFifaCode: string | null;
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
  providerMatchId: string | null;
};

// Group match: real teams by FIFA code.
const g = (
  matchNumber: number,
  group: string,
  kickoffAt: string,
  home: string,
  away: string,
): SeedMatch => ({
  matchNumber,
  phaseName: `Group ${group}`,
  kickoffAt,
  status: "SCHEDULED",
  homeFifaCode: home,
  awayFifaCode: away,
  homePlaceholder: null,
  awayPlaceholder: null,
  providerMatchId: null,
});

// Knockout match: placeholders until teams are resolved.
const k = (
  matchNumber: number,
  phaseName: string,
  kickoffAt: string,
  home: string,
  away: string,
): SeedMatch => ({
  matchNumber,
  phaseName,
  kickoffAt,
  status: "SCHEDULED",
  homeFifaCode: null,
  awayFifaCode: null,
  homePlaceholder: home,
  awayPlaceholder: away,
  providerMatchId: null,
});

export const WORLD_CUP_2026_MATCHES: SeedMatch[] = [
  // ---- Matchday 1 ----
  g(1, "A", "2026-06-11T19:00:00.000Z", "MEX", "RSA"),
  g(2, "A", "2026-06-12T02:00:00.000Z", "KOR", "CZE"),
  g(3, "B", "2026-06-12T19:00:00.000Z", "CAN", "BIH"),
  g(4, "D", "2026-06-13T01:00:00.000Z", "USA", "PAR"),
  g(5, "B", "2026-06-13T19:00:00.000Z", "QAT", "SUI"),
  g(6, "C", "2026-06-13T22:00:00.000Z", "BRA", "MAR"),
  g(7, "C", "2026-06-14T01:00:00.000Z", "HAI", "SCO"),
  g(8, "D", "2026-06-15T04:00:00.000Z", "AUS", "TUR"),
  g(9, "E", "2026-06-14T17:00:00.000Z", "GER", "CUW"),
  g(10, "F", "2026-06-14T20:00:00.000Z", "NED", "JPN"),
  g(11, "E", "2026-06-14T23:00:00.000Z", "CIV", "ECU"),
  g(12, "F", "2026-06-15T02:00:00.000Z", "SWE", "TUN"),
  g(13, "H", "2026-06-15T17:00:00.000Z", "ESP", "CPV"),
  g(14, "G", "2026-06-15T22:00:00.000Z", "BEL", "EGY"),
  g(15, "H", "2026-06-15T22:00:00.000Z", "KSA", "URU"),
  g(16, "G", "2026-06-17T04:00:00.000Z", "IRN", "NZL"),
  g(17, "I", "2026-06-16T19:00:00.000Z", "FRA", "SEN"),
  g(18, "I", "2026-06-16T22:00:00.000Z", "IRQ", "NOR"),
  g(19, "J", "2026-06-17T01:00:00.000Z", "ARG", "ALG"),
  g(20, "J", "2026-06-18T04:00:00.000Z", "AUT", "JOR"),
  g(21, "K", "2026-06-17T17:00:00.000Z", "POR", "COD"),
  g(22, "L", "2026-06-17T20:00:00.000Z", "ENG", "CRO"),
  g(23, "L", "2026-06-17T23:00:00.000Z", "GHA", "PAN"),
  g(24, "K", "2026-06-18T02:00:00.000Z", "UZB", "COL"),
  // ---- Matchday 2 ----
  g(25, "A", "2026-06-18T16:00:00.000Z", "CZE", "RSA"),
  g(26, "B", "2026-06-18T19:00:00.000Z", "SUI", "BIH"),
  g(27, "B", "2026-06-18T22:00:00.000Z", "CAN", "QAT"),
  g(28, "A", "2026-06-19T03:00:00.000Z", "MEX", "KOR"),
  g(29, "D", "2026-06-19T19:00:00.000Z", "USA", "AUS"),
  g(30, "C", "2026-06-19T22:00:00.000Z", "SCO", "MAR"),
  g(31, "C", "2026-06-20T01:00:00.000Z", "BRA", "HAI"),
  g(32, "D", "2026-06-21T04:00:00.000Z", "TUR", "PAR"),
  g(33, "F", "2026-06-20T17:00:00.000Z", "NED", "SWE"),
  g(34, "E", "2026-06-20T20:00:00.000Z", "GER", "CIV"),
  g(35, "E", "2026-06-21T00:00:00.000Z", "ECU", "CUW"),
  g(36, "F", "2026-06-21T04:00:00.000Z", "TUN", "JPN"),
  g(37, "H", "2026-06-21T16:00:00.000Z", "ESP", "KSA"),
  g(38, "G", "2026-06-21T19:00:00.000Z", "BEL", "IRN"),
  g(39, "H", "2026-06-21T22:00:00.000Z", "URU", "CPV"),
  g(40, "G", "2026-06-22T01:00:00.000Z", "NZL", "EGY"),
  g(41, "J", "2026-06-22T17:00:00.000Z", "ARG", "AUT"),
  g(42, "I", "2026-06-22T21:00:00.000Z", "FRA", "IRQ"),
  g(43, "I", "2026-06-23T00:00:00.000Z", "NOR", "SEN"),
  g(44, "J", "2026-06-23T03:00:00.000Z", "JOR", "ALG"),
  g(45, "K", "2026-06-23T17:00:00.000Z", "POR", "UZB"),
  g(46, "L", "2026-06-23T20:00:00.000Z", "ENG", "GHA"),
  g(47, "L", "2026-06-23T23:00:00.000Z", "PAN", "CRO"),
  g(48, "K", "2026-06-24T02:00:00.000Z", "COL", "COD"),
  // ---- Matchday 3 (simultaneous pairs) ----
  g(49, "B", "2026-06-24T19:00:00.000Z", "SUI", "CAN"),
  g(50, "B", "2026-06-24T19:00:00.000Z", "BIH", "QAT"),
  g(51, "C", "2026-06-24T22:00:00.000Z", "SCO", "BRA"),
  g(52, "C", "2026-06-24T22:00:00.000Z", "MAR", "HAI"),
  g(53, "A", "2026-06-25T01:00:00.000Z", "CZE", "MEX"),
  g(54, "A", "2026-06-25T01:00:00.000Z", "RSA", "KOR"),
  g(55, "E", "2026-06-25T20:00:00.000Z", "ECU", "GER"),
  g(56, "E", "2026-06-25T20:00:00.000Z", "CUW", "CIV"),
  g(57, "F", "2026-06-25T23:00:00.000Z", "JPN", "SWE"),
  g(58, "F", "2026-06-25T23:00:00.000Z", "TUN", "NED"),
  g(59, "D", "2026-06-26T02:00:00.000Z", "TUR", "USA"),
  g(60, "D", "2026-06-26T02:00:00.000Z", "PAR", "AUS"),
  g(61, "I", "2026-06-26T19:00:00.000Z", "NOR", "FRA"),
  g(62, "I", "2026-06-26T19:00:00.000Z", "SEN", "IRQ"),
  g(63, "H", "2026-06-27T00:00:00.000Z", "CPV", "KSA"),
  g(64, "H", "2026-06-27T00:00:00.000Z", "URU", "ESP"),
  g(65, "G", "2026-06-27T03:00:00.000Z", "EGY", "IRN"),
  g(66, "G", "2026-06-27T03:00:00.000Z", "NZL", "BEL"),
  g(67, "L", "2026-06-27T21:00:00.000Z", "PAN", "ENG"),
  g(68, "L", "2026-06-27T21:00:00.000Z", "CRO", "GHA"),
  g(69, "K", "2026-06-27T23:30:00.000Z", "COL", "POR"),
  g(70, "K", "2026-06-27T23:30:00.000Z", "COD", "UZB"),
  g(71, "J", "2026-06-28T02:00:00.000Z", "ALG", "AUT"),
  g(72, "J", "2026-06-28T02:00:00.000Z", "JOR", "ARG"),
  // ---- Round of 32 (28 Jun – 3 Jul; placeholders per official bracket) ----
  k(73, "Round of 32", "2026-06-28T19:00:00.000Z", "Runner-up Group A", "Runner-up Group B"),
  k(74, "Round of 32", "2026-06-28T23:00:00.000Z", "Winner Group C", "Runner-up Group F"),
  k(75, "Round of 32", "2026-06-29T19:00:00.000Z", "Winner Group E", "Third place A/B/C/D/F"),
  k(76, "Round of 32", "2026-06-29T23:00:00.000Z", "Winner Group F", "Runner-up Group C"),
  k(77, "Round of 32", "2026-06-30T19:00:00.000Z", "Runner-up Group E", "Runner-up Group I"),
  k(78, "Round of 32", "2026-06-30T23:00:00.000Z", "Winner Group I", "Third place C/D/F/G/H"),
  k(79, "Round of 32", "2026-07-01T19:00:00.000Z", "Winner Group A", "Third place C/E/F/H/I"),
  k(80, "Round of 32", "2026-07-01T23:00:00.000Z", "Winner Group L", "Third place E/H/I/J/K"),
  k(81, "Round of 32", "2026-07-02T19:00:00.000Z", "Winner Group G", "Third place A/E/H/I/J"),
  k(82, "Round of 32", "2026-07-02T23:00:00.000Z", "Winner Group D", "Third place B/E/F/I/J"),
  k(83, "Round of 32", "2026-06-29T16:00:00.000Z", "Winner Group H", "Runner-up Group J"),
  k(84, "Round of 32", "2026-06-30T16:00:00.000Z", "Runner-up Group K", "Runner-up Group L"),
  k(85, "Round of 32", "2026-07-01T16:00:00.000Z", "Winner Group B", "Third place E/F/G/I/J"),
  k(86, "Round of 32", "2026-07-02T16:00:00.000Z", "Runner-up Group D", "Runner-up Group G"),
  k(87, "Round of 32", "2026-07-03T19:00:00.000Z", "Winner Group J", "Runner-up Group H"),
  k(88, "Round of 32", "2026-07-03T23:00:00.000Z", "Winner Group K", "Third place D/E/I/J/L"),
  // ---- Round of 16 (4–7 Jul) ----
  k(89, "Round of 16", "2026-07-04T19:00:00.000Z", "Winner Match 74", "Winner Match 77"),
  k(90, "Round of 16", "2026-07-04T23:00:00.000Z", "Winner Match 73", "Winner Match 75"),
  k(91, "Round of 16", "2026-07-05T19:00:00.000Z", "Winner Match 76", "Winner Match 78"),
  k(92, "Round of 16", "2026-07-05T23:00:00.000Z", "Winner Match 79", "Winner Match 80"),
  k(93, "Round of 16", "2026-07-06T19:00:00.000Z", "Winner Match 83", "Winner Match 85"),
  k(94, "Round of 16", "2026-07-06T23:00:00.000Z", "Winner Match 81", "Winner Match 82"),
  k(95, "Round of 16", "2026-07-07T19:00:00.000Z", "Winner Match 84", "Winner Match 86"),
  k(96, "Round of 16", "2026-07-07T23:00:00.000Z", "Winner Match 87", "Winner Match 88"),
  // ---- Quarter-finals (9–11 Jul) ----
  k(97, "Quarter-finals", "2026-07-09T23:00:00.000Z", "Winner Match 89", "Winner Match 90"),
  k(98, "Quarter-finals", "2026-07-10T23:00:00.000Z", "Winner Match 91", "Winner Match 92"),
  k(99, "Quarter-finals", "2026-07-11T19:00:00.000Z", "Winner Match 93", "Winner Match 94"),
  k(100, "Quarter-finals", "2026-07-11T23:00:00.000Z", "Winner Match 95", "Winner Match 96"),
  // ---- Semi-finals (14–15 Jul) ----
  k(101, "Semi-finals", "2026-07-14T23:00:00.000Z", "Winner Match 97", "Winner Match 98"),
  k(102, "Semi-finals", "2026-07-15T23:00:00.000Z", "Winner Match 99", "Winner Match 100"),
  // ---- Third place play-off (18 Jul) ----
  k(103, "Third place play-off", "2026-07-18T20:00:00.000Z", "Loser Match 101", "Loser Match 102"),
  // ---- Final (19 Jul) ----
  k(104, "Final", "2026-07-19T19:00:00.000Z", "Winner Match 101", "Winner Match 102"),
];
