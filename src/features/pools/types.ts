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
