import {
  formatLocalDayKey,
  formatLocalDayLabel,
} from "@/features/predictions/services/fixture-by-day";
import type { PoolMemberPrediction, PoolPredictionsViewProps } from "../types";

export interface MatchColumn {
  matchId: string;
  label: string;
  sublabel: string | null;
}

export interface DayGroup {
  dayKey: string;
  label: string;
  matches: MatchColumn[];
  memberRows: MemberPredictionRow[];
}

export interface MemberPredictionRow {
  userId: string;
  nickname: string;
  avatarUrl: string | null;
  cells: Record<
    string,
    {
      predictedHome: number | null;
      predictedAway: number | null;
      totalPoints: number | null;
    }
  >;
}

export function buildMatchLabel(prediction: PoolMemberPrediction): {
  label: string;
  sublabel: string | null;
} {
  const home = prediction.homeTeam?.fifaCode ?? prediction.homePlaceholder ?? "?";
  const away = prediction.awayTeam?.fifaCode ?? prediction.awayPlaceholder ?? "?";
  const label = `${home} vs ${away}`;
  const scored =
    prediction.matchStatus === "FINISHED" &&
    prediction.homeScore != null &&
    prediction.awayScore != null;
  const sublabel = scored ? `${prediction.homeScore} - ${prediction.awayScore}` : null;
  return { label, sublabel };
}

export function buildDayGroups(
  predictions: PoolMemberPrediction[],
  members: PoolPredictionsViewProps["members"],
  locale: string,
  timeZone = "UTC",
): DayGroup[] {
  const matchSet = new Map<string, PoolMemberPrediction>();
  for (const p of predictions) {
    if (!matchSet.has(p.matchId)) matchSet.set(p.matchId, p);
  }
  const uniqueMatches = [...matchSet.values()].sort((a, b) => {
    const ta = a.kickoffAt ? Date.parse(a.kickoffAt) : Number.POSITIVE_INFINITY;
    const tb = b.kickoffAt ? Date.parse(b.kickoffAt) : Number.POSITIVE_INFINITY;
    if (ta !== tb) return ta - tb;
    return (a.matchNumber ?? 0) - (b.matchNumber ?? 0);
  });

  const byDay = new Map<string, DayGroup>();
  for (const match of uniqueMatches) {
    const kickoff = match.kickoffAt ? new Date(match.kickoffAt) : null;
    const dayKey = kickoff ? formatLocalDayKey(kickoff, timeZone) : "__tbd__";
    let group = byDay.get(dayKey);
    if (!group) {
      const label = kickoff
        ? formatLocalDayLabel(kickoff, { locale, timeZone })
        : "Fecha por confirmar";
      group = { dayKey, label, matches: [], memberRows: [] };
      byDay.set(dayKey, group);
    }
    group.matches.push({
      matchId: match.matchId,
      ...buildMatchLabel(match),
    });
  }

  const days = [...byDay.values()];

  const predictionsByUser = new Map<string, Map<string, PoolMemberPrediction>>();
  for (const p of predictions) {
    let byMatch = predictionsByUser.get(p.userId);
    if (!byMatch) {
      byMatch = new Map();
      predictionsByUser.set(p.userId, byMatch);
    }
    byMatch.set(p.matchId, p);
  }

  for (const day of days) {
    day.memberRows = members.map((m) => {
      const userPredictions = predictionsByUser.get(m.userId);
      const cells: MemberPredictionRow["cells"] = {};
      for (const col of day.matches) {
        const p = userPredictions?.get(col.matchId);
        cells[col.matchId] = {
          predictedHome: p?.predictedHome ?? null,
          predictedAway: p?.predictedAway ?? null,
          totalPoints: p?.totalPoints ?? null,
        };
      }
      return {
        userId: m.userId,
        nickname: m.nickname,
        avatarUrl: m.avatarUrl,
        cells,
      };
    });
  }

  return days.reverse();
}
