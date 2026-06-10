import type { MatchStatus } from "@/generated/prisma/enums";

const LIVE_STATUSES = new Set(["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"]);
const FINISHED_STATUSES = new Set(["FT", "AET", "PEN", "FINISHED"]);
const POSTPONED_STATUSES = new Set(["PST", "POSTPONED"]);
const CANCELLED_STATUSES = new Set(["CANC", "ABD", "AWD", "WO", "CANCELLED"]);

export function mapProviderStatus(
  rawStatus: string | null | undefined,
  kickoffAt: Date | null,
  now = new Date(),
): MatchStatus {
  const normalized = rawStatus?.toUpperCase() ?? "";
  if (FINISHED_STATUSES.has(normalized)) return "FINISHED";
  if (LIVE_STATUSES.has(normalized)) return "LIVE";
  if (POSTPONED_STATUSES.has(normalized)) return "POSTPONED";
  if (CANCELLED_STATUSES.has(normalized)) return "CANCELLED";
  if (kickoffAt && now.getTime() >= kickoffAt.getTime()) return "LOCKED";
  return "SCHEDULED";
}
