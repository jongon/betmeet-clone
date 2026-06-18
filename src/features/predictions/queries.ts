import { unstable_cache } from "next/cache";
import { COMPETITION_FIXTURE_TAG } from "@/features/competition/cache-tags";
import { toTeamView } from "@/features/competition/queries";
import type { MatchView } from "@/features/competition/types";
import { resolvePoints, type ScoreRow } from "@/features/scoring-rankings/services/resolve-points";
import type { PredictionLockReason } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { getPredictionEligibility } from "./services/eligibility";
import { type FixtureDayGroup, groupFixtureByDay } from "./services/fixture-by-day";
import type { PredictionMatchView, PredictionView } from "./types";

export type { DayMatchView, FixtureDayGroup } from "./services/fixture-by-day";
export {
  coerceTimeZone,
  formatLocalDayKey,
  formatLocalDayLabel,
  partitionDaysByToday,
  regroupFixtureDaysByTimeZone,
} from "./services/fixture-by-day";

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

/** Static match row as read from Prisma (no phase/predictions joined). */
interface StaticMatchRow {
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
}

/** The per-user prediction row (with its persisted score) attached to a match. */
interface PredictionRow {
  id: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  penaltyWinnerTeamId: string | null;
  lockedAt: Date | null;
  lockReason: PredictionLockReason | null;
  score: ScoreRow | null;
}

export function toMatchView(m: StaticMatchRow): MatchView {
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

/**
 * Combines a static {@link MatchView} (from the cached fixture) with the viewer's
 * prediction for that match into the editable/scored view the UI renders. The
 * prediction-dependent fields (eligibility vs. `now`, lock state, points) are
 * computed per request — only the static match shape is cached.
 */
export function toPredictionMatchView(
  m: MatchView,
  predictionRow: PredictionRow | null,
  phaseType: string,
  now: Date = new Date(),
): PredictionMatchView {
  const eligibility = getPredictionEligibility(
    {
      homeTeamId: m.homeTeam?.id ?? null,
      awayTeamId: m.awayTeam?.id ?? null,
      kickoffAt: m.kickoffAt ? new Date(m.kickoffAt) : null,
      status: m.status,
    },
    now,
  );

  const prediction = predictionRow ? toPredictionView(predictionRow) : null;
  const isKnockout = phaseType === "KNOCKOUT";

  // Unit 6: resolve real points/status/breakdown from the persisted score (BL-7).
  const resolved = resolvePoints({
    hasPrediction: predictionRow !== null,
    matchStatus: m.status,
    score: predictionRow?.score ?? null,
  });

  return {
    ...m,
    prediction,
    canEdit: !prediction?.lockedAt && eligibility.editable,
    lockReason: prediction?.lockedAt
      ? prediction.lockReason
      : eligibility.editable
        ? null
        : eligibility.reason,
    showPenaltySelector: isKnockout && !prediction?.lockedAt,
    points: resolved.points,
    pointsStatus: resolved.status,
    breakdown: resolved.breakdown,
    phaseType,
    status: m.status,
  };
}

interface StaticFixture {
  competitionName: string;
  phases: {
    id: string;
    name: string;
    type: string;
    groupCode: string | null;
    matches: MatchView[];
  }[];
}

/**
 * The static fixture (competition + phases + matches + teams + status/scores),
 * WITHOUT any per-user prediction. It only changes on a sync or an admin override,
 * so it is cached and invalidated by {@link COMPETITION_FIXTURE_TAG} instead of being
 * re-read on every `/matches` request (NFR-PERF-REFINE-22.3). The returned shape is
 * fully serializable (kickoffAt is an ISO string), so it survives the cache boundary.
 */
const getStaticFixture = unstable_cache(
  async (): Promise<StaticFixture | null> => {
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

    return {
      competitionName: competition.name,
      phases: competition.phases.map((phase) => ({
        id: phase.id,
        name: phase.name,
        type: phase.type,
        groupCode: phase.groupCode,
        matches: phase.matches.map(toMatchView),
      })),
    };
  },
  ["static-fixture"],
  { tags: [COMPETITION_FIXTURE_TAG], revalidate: 300 },
);

/**
 * BL-5.4: Get fixture phases with current user predictions attached.
 * Reads the cached static fixture and enriches each match with the user's
 * prediction state (a small, per-user query that stays dynamic).
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
  const fixture = await getStaticFixture();
  if (!fixture) return null;

  const predictionRows: PredictionRow[] = userId
    ? await prisma.prediction.findMany({
        where: { userId },
        select: {
          id: true,
          matchId: true,
          homeScore: true,
          awayScore: true,
          penaltyWinnerTeamId: true,
          lockedAt: true,
          lockReason: true,
          score: {
            select: {
              matchedCase: true,
              basePoints: true,
              penaltyApplied: true,
              penaltyPoints: true,
              totalPoints: true,
            },
          },
        },
      })
    : [];

  const byMatch = new Map(predictionRows.map((p) => [p.matchId, p]));
  const now = new Date();

  const phases = fixture.phases.map((phase) => ({
    id: phase.id,
    name: phase.name,
    type: phase.type,
    groupCode: phase.groupCode,
    matches: phase.matches.map((m) =>
      toPredictionMatchView(m, byMatch.get(m.id) ?? null, phase.type, now),
    ),
  }));

  return {
    competitionName: fixture.competitionName,
    phases,
  };
}

/**
 * BL-5.4 + FR-REFINE-16.2: the same fixture as {@link getFixtureWithMyPredictions},
 * but grouped by calendar day via {@link groupFixtureByDay} so matches render in true
 * order of occurrence (kickoff time) instead of grouped by group/phase.
 */
export async function getFixtureByDayWithMyPredictions(userId: string | null): Promise<{
  competitionName: string;
  days: FixtureDayGroup[];
} | null> {
  const fixture = await getFixtureWithMyPredictions(userId);
  if (!fixture) return null;

  return {
    competitionName: fixture.competitionName,
    days: groupFixtureByDay(fixture.phases),
  };
}

export interface ResolvedPrediction {
  userId: string;
  matchId: string;
  predictedHome: number | null;
  predictedAway: number | null;
  isOverride: boolean;
  hasGlobal: boolean;
}

export function resolvePoolPredictions(
  predictions: {
    userId: string;
    matchId: string;
    poolId: string | null;
    homeScore: number;
    awayScore: number;
  }[],
  members: string[],
  matchIds: string[],
  poolId: string,
): ResolvedPrediction[] {
  const result: ResolvedPrediction[] = [];

  for (const userId of members) {
    for (const matchId of matchIds) {
      const override = predictions.find(
        (p) => p.userId === userId && p.matchId === matchId && p.poolId === poolId,
      );
      const global = predictions.find(
        (p) => p.userId === userId && p.matchId === matchId && p.poolId === null,
      );

      if (override) {
        result.push({
          userId,
          matchId,
          predictedHome: override.homeScore,
          predictedAway: override.awayScore,
          isOverride: true,
          hasGlobal: global != null,
        });
      } else if (global) {
        result.push({
          userId,
          matchId,
          predictedHome: global.homeScore,
          predictedAway: global.awayScore,
          isOverride: false,
          hasGlobal: false,
        });
      } else {
        result.push({
          userId,
          matchId,
          predictedHome: null,
          predictedAway: null,
          isOverride: false,
          hasGlobal: false,
        });
      }
    }
  }

  return result;
}
