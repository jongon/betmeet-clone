import type { MatchView, TeamView } from "@/features/competition/types";
import type { MatchStatus, PredictionLockReason } from "@/generated/prisma/enums";

export type PredictionEligibility =
  | { editable: true }
  | { editable: false; reason: PredictionLockReason };

export interface PredictionInput {
  homeScore: number;
  awayScore: number;
  penaltyWinnerTeamId: string | null;
}

export interface PredictionView {
  id: string;
  homeScore: number;
  awayScore: number;
  penaltyWinnerTeamId: string | null;
  lockedAt: string | null;
  lockReason: PredictionLockReason | null;
}

export type PredictionPointsStatus = "PENDING_SCORING" | "NOT_SCORED" | "SCORED";

export interface PredictionMatchView extends MatchView {
  prediction: PredictionView | null;
  canEdit: boolean;
  lockReason: PredictionLockReason | null;
  showPenaltySelector: boolean;
  points: number | null;
  pointsStatus: PredictionPointsStatus;
  homeTeam: TeamView | null;
  awayTeam: TeamView | null;
  phaseType: string;
  status: MatchStatus;
}
