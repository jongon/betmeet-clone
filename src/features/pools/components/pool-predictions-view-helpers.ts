import {
  formatLocalDayKey,
  formatLocalDayLabel,
} from "@/features/predictions/services/fixture-by-day";
import type { MatchView, PoolMemberPrediction, PoolPredictionsViewProps } from "../types";

export interface MatchColumn {
  matchId: string;
  label: string;
  homeLabel: string;
  awayLabel: string;
  sublabel: string | null;
  kickoffAt: string | null;
  matchStatus: string;
  phaseType: string;
  homeFlag: string | null;
  awayFlag: string | null;
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
      isOverride: boolean;
      hasGlobal: boolean;
      hidden: boolean;
      /** Unit 56: true when this match kicked off before the member joined the pool
       *  (kickoff < joinedAt). The cell is shown empty — those points don't count
       *  toward the pool leaderboard (Unit 55). Mutually exclusive with `hidden`. */
      preJoin: boolean;
    }
  >;
}

export const DAYS_PER_PAGE = 1;

export function buildMatchLabel(match: {
  homeTeam: { fifaCode: string } | null;
  awayTeam: { fifaCode: string } | null;
  homePlaceholder: string | null;
  awayPlaceholder: string | null;
  matchStatus: string;
  homeScore: number | null;
  awayScore: number | null;
}): { label: string; sublabel: string | null } {
  const home = match.homeTeam?.fifaCode ?? match.homePlaceholder ?? "?";
  const away = match.awayTeam?.fifaCode ?? match.awayPlaceholder ?? "?";
  const label = `${home} vs ${away}`;
  const scored =
    match.matchStatus === "FINISHED" && match.homeScore != null && match.awayScore != null;
  const sublabel = scored ? `${match.homeScore} - ${match.awayScore}` : null;
  return { label, sublabel };
}

export function buildDayGroups(
  predictions: PoolMemberPrediction[],
  members: PoolPredictionsViewProps["members"],
  locale: string,
  timeZone = "UTC",
  allMatches?: MatchView[],
): DayGroup[] {
  const matchData =
    allMatches ??
    (() => {
      const matchSet = new Map<string, PoolMemberPrediction>();
      for (const p of predictions) {
        if (!matchSet.has(p.matchId)) matchSet.set(p.matchId, p);
      }
      return [...matchSet.values()] as unknown as MatchView[];
    })();

  const sorted = [...matchData].sort((a, b) => {
    const ta = a.kickoffAt ? Date.parse(a.kickoffAt) : Number.POSITIVE_INFINITY;
    const tb = b.kickoffAt ? Date.parse(b.kickoffAt) : Number.POSITIVE_INFINITY;
    if (ta !== tb) return ta - tb;
    return (a.matchNumber ?? 0) - (b.matchNumber ?? 0);
  });

  const byDay = new Map<string, DayGroup>();
  for (const match of sorted) {
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
      kickoffAt: match.kickoffAt,
      matchStatus: match.matchStatus,
      phaseType: match.phaseType,
      homeFlag: match.homeTeam?.flagPath ?? null,
      awayFlag: match.awayTeam?.flagPath ?? null,
      homeLabel: match.homeTeam?.fifaCode ?? match.homePlaceholder ?? "?",
      awayLabel: match.awayTeam?.fifaCode ?? match.awayPlaceholder ?? "?",
    });
  }

  const days = [...byDay.values()];

  const predictionsByUser = new Map<string, Map<string, PoolMemberPrediction[]>>();
  for (const p of predictions) {
    let byMatch = predictionsByUser.get(p.userId);
    if (!byMatch) {
      byMatch = new Map();
      predictionsByUser.set(p.userId, byMatch);
    }
    const existing = byMatch.get(p.matchId) ?? [];
    existing.push(p);
    byMatch.set(p.matchId, existing);
  }

  for (const day of days) {
    day.memberRows = members.map((m) => {
      const userPredictions = predictionsByUser.get(m.userId);
      const cells: MemberPredictionRow["cells"] = {};
      for (const col of day.matches) {
        // Unit 56: a match that kicked off before this member joined the pool is shown
        // empty — its points don't count toward the pool leaderboard (Unit 55). Past
        // match, not anti-bias sensitive, so it's resolved here in the view.
        const preJoin =
          col.kickoffAt != null &&
          m.joinedAt != null &&
          Date.parse(col.kickoffAt) < Date.parse(m.joinedAt);

        if (preJoin) {
          cells[col.matchId] = {
            predictedHome: null,
            predictedAway: null,
            totalPoints: null,
            isOverride: false,
            hasGlobal: false,
            hidden: false,
            preJoin: true,
          };
          continue;
        }

        const preds = userPredictions?.get(col.matchId) ?? [];
        const override = preds.find((p) => p.isOverride);
        const global = preds.find((p) => !p.isOverride);
        const chosen = override ?? global ?? null;
        cells[col.matchId] = {
          predictedHome: chosen?.predictedHome ?? null,
          predictedAway: chosen?.predictedAway ?? null,
          totalPoints: chosen?.totalPoints ?? null,
          isOverride: chosen?.isOverride ?? false,
          hasGlobal: global != null && override != null,
          hidden: chosen?.hidden ?? false,
          preJoin: false,
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

  return days;
}

export function paginateDays(
  days: DayGroup[],
  timeZone: string,
  page: number,
): {
  visibleDays: DayGroup[];
  currentPage: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
} {
  if (days.length === 0) {
    return { visibleDays: [], currentPage: 0, totalPages: 0, hasPrev: false, hasNext: false };
  }

  const totalPages = Math.ceil(days.length / DAYS_PER_PAGE);

  const now = new Date();
  const todayKey = formatLocalDayKey(now, timeZone);
  const todayIndex = days.findIndex((d) => d.dayKey === todayKey);
  const defaultPage = todayIndex >= 0 ? Math.floor(todayIndex / DAYS_PER_PAGE) : 0;

  const resolvedPage = Number.isFinite(page) ? page : defaultPage;
  const clampedPage = Math.max(0, Math.min(totalPages - 1, resolvedPage));

  const start = clampedPage * DAYS_PER_PAGE;
  const end = Math.min(start + DAYS_PER_PAGE, days.length);

  return {
    visibleDays: days.slice(start, end),
    currentPage: clampedPage,
    totalPages,
    hasPrev: clampedPage > 0,
    hasNext: clampedPage < totalPages - 1,
  };
}
