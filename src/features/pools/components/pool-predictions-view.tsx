import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/lib/locale";
import type { PoolPredictionsViewProps } from "../types";
import { buildDayGroups } from "./pool-predictions-view-helpers";

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
