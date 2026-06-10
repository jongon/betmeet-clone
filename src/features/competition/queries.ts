import { prisma } from "@/lib/prisma";
import { getFixtureFreshness } from "./services/fixture-freshness";
import type { FixtureView, MatchView, PhaseView, TeamView } from "./types";

function toTeamView(
  team: { id: string; name: string; fifaCode: string; flagPath: string } | null,
): TeamView | null {
  if (!team) return null;
  return { id: team.id, name: team.name, fifaCode: team.fifaCode, flagPath: team.flagPath };
}

function toMatchView(match: {
  id: string;
  matchNumber: number | null;
  kickoffAt: Date | null;
  status: MatchView["status"];
  homeTeam: { id: string; name: string; fifaCode: string; flagPath: string } | null;
  awayTeam: { id: string; name: string; fifaCode: string; flagPath: string } | null;
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
}): MatchView {
  return {
    id: match.id,
    matchNumber: match.matchNumber,
    kickoffAt: match.kickoffAt?.toISOString() ?? null,
    status: match.status,
    homeTeam: toTeamView(match.homeTeam),
    awayTeam: toTeamView(match.awayTeam),
    homePlaceholder: match.homePlaceholder,
    awayPlaceholder: match.awayPlaceholder,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    homePenaltyScore: match.homePenaltyScore,
    awayPenaltyScore: match.awayPenaltyScore,
  };
}

export async function getFixture(): Promise<FixtureView | null> {
  const competition = await prisma.competition.findFirst({
    where: { isActive: true },
    include: {
      phases: {
        orderBy: { displayOrder: "asc" },
        include: {
          matches: {
            include: { homeTeam: true, awayTeam: true },
            orderBy: [{ kickoffAt: "asc" }, { matchNumber: "asc" }],
          },
        },
      },
    },
  });

  if (!competition) return null;

  const phases: PhaseView[] = competition.phases.map((phase) => ({
    id: phase.id,
    name: phase.name,
    type: phase.type,
    groupCode: phase.groupCode,
    matches: phase.matches.map(toMatchView),
  }));

  return {
    competitionName: competition.name,
    phases,
    freshness: await getFixtureFreshness(),
  };
}
