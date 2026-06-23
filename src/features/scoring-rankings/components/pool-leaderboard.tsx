import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ProjectedLeaderboardRow } from "../services/project-leaderboard";
import type { LeaderboardRow } from "../types";

interface PoolLeaderboardProps {
  rows: LeaderboardRow[];
  /** Compact view shows only the top rows (for the pool detail section). */
  limit?: number;
  /** Unit 62 projection: when `hasLive` is true, `rows` are re-ordered by
   *  `projectedPoints` and rendered with the live indicator. */
  projectedRows?: ProjectedLeaderboardRow[];
  hasLive?: boolean;
  /** i18n copy for the projection mode (passed from server). */
  copy?: {
    badge: string;
    current: string;
    projected: string;
    rise: string;
    fall: string;
    same: string;
    newEntry: string;
    disclaimer: string;
  };
}

/**
 * Pool leaderboard table (US-5.2). Position uses dense ranking; the viewer's
 * row is highlighted. Members with no scores show 0 (BR-6.12, BR-6.15).
 *
 * Unit 62 — when `hasLive` is true and `projectedRows` are provided, the table
 * switches into **projection mode**: rows are ordered by `projectedPoints`,
 * each row shows `<pts actual> → <pts projected>` and a `▲/▼/=/—` delta vs the
 * previous confirmed position. The original ranking stays intact server-side
 * (BR-62.7); nothing is persisted.
 */
export function PoolLeaderboard({
  rows,
  limit,
  projectedRows,
  hasLive,
  copy,
}: PoolLeaderboardProps) {
  const inProjection = hasLive === true && projectedRows != null;
  const visible = inProjection
    ? limit
      ? (projectedRows ?? []).slice(0, limit)
      : (projectedRows ?? [])
    : limit
      ? rows.slice(0, limit)
      : rows;

  if (inProjection && copy) {
    return (
      <ol
        className="divide-y rounded-xl border"
        data-testid="pool-leaderboard"
        data-projection="true"
        title={copy.disclaimer}
      >
        {visible.map((row) => {
          const projected = row as ProjectedLeaderboardRow;
          const delta = projected.positionDelta;
          const deltaLabel =
            delta === null
              ? copy.newEntry
              : delta === 0
                ? copy.same
                : delta > 0
                  ? `${copy.rise} ${delta}`
                  : `${copy.fall} ${-delta}`;
          const deltaTone =
            delta === null
              ? "text-muted-foreground"
              : delta === 0
                ? "text-muted-foreground"
                : delta > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400";
          return (
            <li
              key={projected.userId}
              data-testid={`leaderboard-row-${projected.userId}`}
              data-projection="true"
              className={cn(
                "flex items-center justify-between gap-3 border-l-2 border-transparent p-3",
                projected.isViewer && "border-l-primary bg-muted/50",
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={cn(
                    "tabular-nums-display w-7 shrink-0 text-center text-lg font-bold",
                    projected.projectedPosition === 1 && "text-brand",
                  )}
                  data-testid={`leaderboard-position-${projected.userId}`}
                >
                  {projected.projectedPosition}
                </span>
                <Avatar>
                  <AvatarImage src={projected.avatarUrl} alt="" />
                  <AvatarFallback>{projected.nickname.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="truncate font-medium">
                  {projected.nickname}
                  {projected.isViewer && (
                    <span className="ml-2 text-xs text-muted-foreground">(tú)</span>
                  )}
                </span>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <span className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground line-through">
                    {projected.totalPoints}
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span
                    className="tabular-nums-display text-base font-semibold"
                    data-testid={`leaderboard-projected-${projected.userId}`}
                  >
                    {projected.projectedPoints}
                  </span>
                  <span className="text-xs text-muted-foreground">pts</span>
                  <span className={cn("rounded bg-muted px-1 text-[10px] font-semibold uppercase")}>
                    {copy.badge}
                  </span>
                </span>
                <span
                  className={cn("text-[11px] tabular-nums-display", deltaTone)}
                  data-testid={`leaderboard-delta-${projected.userId}`}
                >
                  {deltaLabel}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol className="divide-y rounded-xl border" data-testid="pool-leaderboard">
      {visible.map((row) => (
        <li
          key={row.userId}
          data-testid={`leaderboard-row-${row.userId}`}
          className={cn(
            "flex items-center justify-between gap-3 border-l-2 border-transparent p-3",
            row.isViewer && "border-l-primary bg-muted/50",
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={cn(
                "tabular-nums-display w-7 shrink-0 text-center text-lg font-bold",
                row.position === 1 && "text-brand",
              )}
              data-testid={`leaderboard-position-${row.userId}`}
            >
              {row.position}
            </span>
            <Avatar>
              <AvatarImage src={row.avatarUrl} alt="" />
              <AvatarFallback>{row.nickname.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="truncate font-medium">
              {row.nickname}
              {row.isViewer && <span className="ml-2 text-xs text-muted-foreground">(tú)</span>}
            </span>
          </div>
          <span className="shrink-0 font-semibold">
            <span className="tabular-nums-display text-base">{row.totalPoints}</span>{" "}
            <span className="text-xs text-muted-foreground">pts</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
