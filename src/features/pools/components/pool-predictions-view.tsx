import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/lib/locale";
import type { PoolMemberPrediction, PoolPredictionsViewProps } from "../types";

interface MatchColumn {
  matchId: string;
  label: string;
  sublabel: string | null;
}

interface DayGroup {
  dayKey: string;
  label: string;
  matches: MatchColumn[];
  memberRows: MemberPredictionRow[];
}

interface MemberPredictionRow {
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

const DAY_FORMATTERS: Record<string, Intl.DateTimeFormat> = {};

function formatDayLabel(iso: string, locale: string): string {
  if (!DAY_FORMATTERS[locale]) {
    DAY_FORMATTERS[locale] = new Intl.DateTimeFormat(locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    });
  }
  const formatted = DAY_FORMATTERS[locale].format(new Date(iso));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function buildMatchLabel(prediction: PoolMemberPrediction): {
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

function buildDayGroups(
  predictions: PoolMemberPrediction[],
  members: PoolPredictionsViewProps["members"],
  locale: string,
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
    const dayKey = match.kickoffAt?.slice(0, 10) ?? "__tbd__";
    let group = byDay.get(dayKey);
    if (!group) {
      const label = match.kickoffAt
        ? formatDayLabel(match.kickoffAt, locale)
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

export async function PoolPredictionsView({ predictions, members }: PoolPredictionsViewProps) {
  const dictionary = getDictionary(await getRequestLocale());
  const t = dictionary.pools.predictions;
  const locale = await getRequestLocale();

  if (predictions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <p className="text-lg font-semibold text-muted-foreground">{t.emptyTitle}</p>
        <p className="text-sm text-muted-foreground">{t.emptyDescription}</p>
      </div>
    );
  }

  const days = buildDayGroups(predictions, members, locale);

  return (
    <div className="space-y-8">
      {days.map((day) => (
        <section key={day.dayKey} className="space-y-3">
          <h3 className="text-lg font-semibold">{day.label}</h3>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm" data-testid="pool-predictions-table">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th
                    className="sticky left-0 z-10 bg-muted/50 px-3 py-2 text-left font-medium whitespace-nowrap"
                    data-testid="pool-predictions-member-header"
                  >
                    {t.memberHeader}
                  </th>
                  {day.matches.map((col) => (
                    <th
                      key={col.matchId}
                      className="px-3 py-2 text-center font-medium whitespace-nowrap"
                    >
                      <div>{col.label}</div>
                      {col.sublabel && (
                        <div className="text-xs font-normal text-muted-foreground">
                          {col.sublabel}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {day.memberRows.map((member) => (
                  <tr key={member.userId} className="border-b last:border-b-0">
                    <td className="sticky left-0 z-10 bg-background px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6">
                          <AvatarImage src={member.avatarUrl ?? undefined} alt="" />
                          <AvatarFallback>
                            {member.nickname.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate font-medium">{member.nickname}</span>
                      </div>
                    </td>
                    {day.matches.map((col) => {
                      const cell = member.cells[col.matchId];
                      const hasPrediction =
                        cell?.predictedHome != null && cell?.predictedAway != null;
                      const hasPoints = cell?.totalPoints != null;
                      return (
                        <td
                          key={col.matchId}
                          className="px-3 py-2 text-center whitespace-nowrap"
                          data-testid={`prediction-cell-${member.userId}-${col.matchId}`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span className="tabular-nums-display">
                              {hasPrediction
                                ? `${cell.predictedHome} - ${cell.predictedAway}`
                                : t.noPrediction}
                            </span>
                            {hasPoints ? (
                              <Badge variant="secondary" className="text-xs">
                                {cell.totalPoints} pts
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {t.pendingScore}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
