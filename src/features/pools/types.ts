/**
 * Public pool preview contract (Unit 2 → Unit 3).
 *
 * Unit 2's landing `PoolPreview` renders against this interface. Unit 3 (Pools
 * and Membership) provides the real data source; until then the landing renders
 * the empty/skeleton state (BR-2.25).
 */
export interface PoolPreviewItem {
  id: string;
  name: string;
  memberCount: number;
  capacity: number;
  isPublic: boolean;
}

export type PoolPreviewState = "loading" | "empty" | "error" | "ready";

export type PoolType = "PUBLIC" | "PRIVATE";

/** A pool as shown in the current user's "my pools" list. */
export interface MyPoolSummary {
  id: string;
  name: string;
  type: PoolType;
  memberCount: number;
  capacity: number;
  isOwner: boolean;
  isArchived: boolean;
}

/** A member row in the pool detail view (identity from Unit 1 Profile). */
export interface PoolMemberSummary {
  userId: string;
  nickname: string;
  avatarUrl: string;
  isOwner: boolean;
  joinedAt: string;
}

/** Full pool detail for the pool page. */
export interface PoolDetail {
  id: string;
  name: string;
  type: PoolType;
  capacity: number;
  memberCount: number;
  inviteToken: string;
  isOwner: boolean;
  isArchived: boolean;
  members: PoolMemberSummary[];
}

/** Pools the departing owner must reassign during account deletion (BL-9). */
export interface OwnedPoolTransfer {
  poolId: string;
  poolName: string;
  /** Other members, ordered oldest → newest (F2). Empty means the pool will be deleted (F3). */
  candidates: { userId: string; nickname: string }[];
}

/** One member's prediction for one match with its score (FR-REFINE-41.1–41.5). */
export interface PoolMemberPrediction {
  matchId: string;
  matchNumber: number | null;
  kickoffAt: string | null;
  matchStatus: string;
  homeTeam: import("@/features/competition/types").TeamView | null;
  awayTeam: import("@/features/competition/types").TeamView | null;
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
  homeScore: number | null;
  awayScore: number | null;
  phaseName: string;
  phaseType: string;
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  predictedHome: number | null;
  predictedAway: number | null;
  totalPoints: number | null;
  matchedCase: string | null;
}

/** Props for the pool predictions view component (FR-REFINE-41.3). */
export interface PoolPredictionsViewProps {
  predictions: PoolMemberPrediction[];
  members: PoolMemberSummary[];
}
