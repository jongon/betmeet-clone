import type { MatchView, TeamView } from "@/features/competition/types";
import type { PredictionLockReason } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getPredictionEligibility } from "./services/eligibility";
import type { PredictionMatchView, PredictionView } from "./types";

function toPredictionView(p: {
  id: string;
  homeScore: number;
  awayScore: number;
  penaltyWinnerTeamId: string | null;
  lockedAt: Date | null;
  lockReason: PredictionLockReason | null;
}): PredictionView {
  return {
    id: p.id,
    homeScore: p.homeScore,
    awayScore: p.awayScore,
    penaltyWinnerTeamId: p.penaltyWinnerTeamId,
    lockedAt: p.lockedAt?.toISOString() ?? null,
    lockReason: p.lockReason,
  };
}

interface MatchWithPhase {
  id: string;
  matchNumber: number | null;
  kickoffAt: Date | null;
  status: string;
  homeTeam: { id: string; name: string; fifaCode: string; flagPath: string } | null;
  awayTeam: { id: string; name: string; fifaCode: string; flagPath: string } | null;
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homePenaltyScore: number | null;
  awayPenaltyScore: number | null;
  phase: { type: string };
  predictions: {
    id: string;
    homeScore: number;
    awayScore: number;
    penaltyWinnerTeamId: string | null;
    lockedAt: Date | null;
    lockReason: PredictionLockReason | null;
  }[];
}

function toTeamView(
  team: { id: string; name: string; fifaCode: string; flagPath: string } | null,
): TeamView | null {
  if (!team) return null;
  return { id: team.id, name: team.name, fifaCode: team.fifaCode, flagPath: team.flagPath };
}

export function toMatchView(m: MatchWithPhase): MatchView {
  return {
    id: m.id,
    matchNumber: m.matchNumber,
    kickoffAt: m.kickoffAt?.toISOString() ?? null,
    status: m.status as MatchView["status"],
    homeTeam: toTeamView(m.homeTeam),
    awayTeam: toTeamView(m.awayTeam),
    homePlaceholder: m.homePlaceholder,
    awayPlaceholder: m.awayPlaceholder,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    homePenaltyScore: m.homePenaltyScore,
    awayPenaltyScore: m.awayPenaltyScore,
  };
}

export function toPredictionMatchView(
  m: MatchWithPhase,
  now: Date = new Date(),
  _userId?: string | null,
): PredictionMatchView {
  const eligibility = getPredictionEligibility(
    {
      homeTeamId: m.homeTeam?.id ?? null,
      awayTeamId: m.awayTeam?.id ?? null,
      kickoffAt: m.kickoffAt,
      status: m.status,
    },
    now,
  );

  const prediction = m.predictions[0] ? toPredictionView(m.predictions[0]) : null;

  const isKnockout = m.phase.type === "KNOCKOUT";

  return {
    ...toMatchView(m),
    prediction,
    canEdit: !prediction?.lockedAt && eligibility.editable,
    lockReason: prediction?.lockedAt
      ? prediction.lockReason
      : eligibility.editable
        ? null
        : eligibility.reason,
    showPenaltySelector: isKnockout && !prediction?.lockedAt,
    points: null,
    pointsStatus: prediction ? "PENDING_SCORING" : "NOT_SCORED",
    homeTeam: toTeamView(m.homeTeam),
    awayTeam: toTeamView(m.awayTeam),
    phaseType: m.phase.type,
    status: m.status as MatchView["status"],
  };
}

/**
 * BL-5.4: Get fixture phases with current user predictions attached.
 * Reads existing competition fixture and enriches each match with the user's prediction state.
 */
export async function getFixtureWithMyPredictions(userId: string | null): Promise<{
  competitionName: string;
  phases: {
    id: string;
    name: string;
    type: string;
    groupCode: string | null;
    matches: PredictionMatchView[];
  }[];
} | null> {
  const competition = await prisma.competition.findFirst({
    where: { isActive: true },
    include: {
      phases: {
        orderBy: { displayOrder: "asc" },
        include: {
          matches: {
            include: {
              homeTeam: true,
              awayTeam: true,
              phase: true,
              predictions: userId ? { where: { userId } } : { where: { id: "__none__" } },
            },
            orderBy: [{ kickoffAt: "asc" }, { matchNumber: "asc" }],
          },
        },
      },
    },
  });

  if (!competition) return null;

  const now = new Date();

  const phases = competition.phases.map((phase) => ({
    id: phase.id,
    name: phase.name,
    type: phase.type,
    groupCode: phase.groupCode,
    matches: phase.matches.map((m) =>
      toPredictionMatchView(m as unknown as MatchWithPhase, now, userId),
    ),
  }));

  return {
    competitionName: competition.name,
    phases,
  };
}
