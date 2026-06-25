import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { ProjectedLeaderboardRow } from "../services/project-leaderboard";
import type { LeaderboardRow } from "../types";
import { LeaderboardConfetti } from "./leaderboard-confetti";

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

const MEDALS = ["🥇", "🥈", "🥉"] as const;

/** Per-position podium treatment (Unit 70). Keys off the **displayed** position
 *  (confirmed `position`, or `projectedPosition` during a live projection) so the
 *  podium re-orders live alongside Unit 62. */
function podiumFor(position: number): {
  medal: string | null;
  rowClass: string;
  champion: boolean;
  topFive: boolean;
} {
  switch (position) {
    case 1:
      return {
        medal: MEDALS[0],
        rowClass:
          "bg-gradient-to-r from-amber-200/70 via-amber-100/40 to-transparent ring-1 ring-inset ring-amber-400/50 dark:from-amber-400/20 dark:via-amber-400/[0.06] dark:ring-amber-400/30",
        champion: true,
        topFive: true,
      };
    case 2:
      return {
        medal: MEDALS[1],
        rowClass:
          "bg-gradient-to-r from-zinc-300/60 via-zinc-200/30 to-transparent dark:from-zinc-300/[0.12] dark:via-zinc-300/[0.04]",
        champion: false,
        topFive: true,
      };
    case 3:
      return {
        medal: MEDALS[2],
        rowClass:
          "bg-gradient-to-r from-orange-300/50 via-orange-200/25 to-transparent dark:from-orange-500/[0.18] dark:via-orange-500/[0.05]",
        champion: false,
        topFive: true,
      };
    case 4:
    case 5:
      return { medal: null, rowClass: "bg-muted/40", champion: false, topFive: true };
    default:
      return { medal: null, rowClass: "", champion: false, topFive: false };
  }
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
 *
 * Unit 70 — competition podium: the top-5 displayed positions are styled
 * distinctly (gold/silver/bronze gradients + medal emojis on 1-3, a tinted
 * "top 5" chip on 4-5), and the 1st-place row carries a continuous CSS
 * serpentinas overlay. The styling keys off the displayed position, so in
 * projection mode it follows `projectedPosition`.
 */
export function PoolLeaderboard({
  rows,
  limit,
  projectedRows,
  hasLive,
  copy,
}: PoolLeaderboardProps) {
  const projectionMode = hasLive === true && projectedRows != null && copy != null;
  const source: LeaderboardRow[] = projectionMode ? (projectedRows ?? []) : rows;
  const visible = limit ? source.slice(0, limit) : source;

  return (
    <ol
      className="divide-y rounded-xl border"
      data-testid="pool-leaderboard"
      data-projection={projectionMode ? "true" : undefined}
      title={projectionMode ? copy?.disclaimer : undefined}
    >
      {visible.map((row) => {
        const projected = row as ProjectedLeaderboardRow;
        const displayPosition = projectionMode ? projected.projectedPosition : row.position;
        const podium = podiumFor(displayPosition);

        return (
          <li
            key={row.userId}
            data-testid={`leaderboard-row-${row.userId}`}
            data-projection={projectionMode ? "true" : undefined}
            className={cn(
              "relative flex items-center justify-between gap-3 overflow-hidden border-l-2 border-transparent p-3",
              podium.champion && "py-4",
              podium.rowClass,
              row.isViewer && !podium.topFive && "bg-muted/50",
              row.isViewer && "border-l-primary",
            )}
          >
            {podium.champion && <LeaderboardConfetti />}

            <div className="relative z-10 flex min-w-0 items-center gap-3">
              <span className="flex w-9 shrink-0 flex-col items-center justify-center gap-0.5">
                {podium.medal ? (
                  <>
                    <span aria-hidden="true" className="text-xl leading-none drop-shadow-sm">
                      {podium.medal}
                    </span>
                    <span
                      className="tabular-nums-display text-[11px] font-semibold text-muted-foreground"
                      data-testid={`leaderboard-position-${row.userId}`}
                    >
                      {displayPosition}
                    </span>
                  </>
                ) : (
                  <span
                    className={cn(
                      "tabular-nums-display text-center font-bold",
                      podium.topFive
                        ? "flex h-6 w-6 items-center justify-center rounded-full bg-foreground/5 text-sm"
                        : "text-lg",
                    )}
                    data-testid={`leaderboard-position-${row.userId}`}
                  >
                    {displayPosition}
                  </span>
                )}
              </span>
              <Avatar
                className={cn(
                  podium.champion &&
                    "ring-2 ring-amber-400/70 ring-offset-1 ring-offset-background",
                )}
              >
                <AvatarImage src={row.avatarUrl} alt="" />
                <AvatarFallback>{row.nickname.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="truncate font-medium">
                {row.nickname}
                {row.isViewer && <span className="ml-2 text-xs text-muted-foreground">(tú)</span>}
              </span>
            </div>

            {projectionMode && copy ? (
              <ProjectionPoints row={projected} copy={copy} />
            ) : (
              <span className="relative z-10 shrink-0 font-semibold">
                <span className="tabular-nums-display text-base">{row.totalPoints}</span>{" "}
                <span className="text-xs text-muted-foreground">pts</span>
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Right-hand cell for projection mode: `<total> → <projected>` + badge + delta. */
function ProjectionPoints({
  row,
  copy,
}: {
  row: ProjectedLeaderboardRow;
  copy: NonNullable<PoolLeaderboardProps["copy"]>;
}) {
  const delta = row.positionDelta;
  const deltaLabel =
    delta === null
      ? copy.newEntry
      : delta === 0
        ? copy.same
        : delta > 0
          ? `${copy.rise} ${delta}`
          : `${copy.fall} ${-delta}`;
  const deltaTone =
    delta === null || delta === 0
      ? "text-muted-foreground"
      : delta > 0
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-red-600 dark:text-red-400";

  return (
    <div className="relative z-10 flex shrink-0 flex-col items-end gap-0.5">
      <span className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground line-through">{row.totalPoints}</span>
        <span className="text-muted-foreground">→</span>
        <span
          className="tabular-nums-display text-base font-semibold"
          data-testid={`leaderboard-projected-${row.userId}`}
        >
          {row.projectedPoints}
        </span>
        <span className="text-xs text-muted-foreground">pts</span>
        <span className="rounded bg-muted px-1 text-[10px] font-semibold uppercase">
          {copy.badge}
        </span>
      </span>
      <span
        className={cn("text-[11px] tabular-nums-display", deltaTone)}
        data-testid={`leaderboard-delta-${row.userId}`}
      >
        {deltaLabel}
      </span>
    </div>
  );
}
