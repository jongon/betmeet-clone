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

const FD_LIVE_STATUSES = new Set(["IN_PLAY", "PAUSED", "LIVE"]);
const FD_FINISHED_STATUSES = new Set(["FINISHED", "AWARDED"]);
const FD_SCHEDULED_STATUSES = new Set(["SCHEDULED", "TIMED"]);
const FD_POSTPONED_STATUSES = new Set(["POSTPONED", "SUSPENDED"]);
const FD_CANCELLED_STATUSES = new Set(["CANCELLED"]);

export function mapFootballDataStatus(rawStatus: string | null | undefined): MatchStatus {
  const normalized = rawStatus?.toUpperCase() ?? "";
  if (FD_LIVE_STATUSES.has(normalized)) return "LIVE";
  if (FD_FINISHED_STATUSES.has(normalized)) return "FINISHED";
  if (FD_POSTPONED_STATUSES.has(normalized)) return "POSTPONED";
  if (FD_CANCELLED_STATUSES.has(normalized)) return "CANCELLED";
  if (FD_SCHEDULED_STATUSES.has(normalized)) return "SCHEDULED";
  return "SCHEDULED";
}
