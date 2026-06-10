import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { LeaderboardRow } from "../types";

interface PoolLeaderboardProps {
  rows: LeaderboardRow[];
  /** Compact view shows only the top rows (for the pool detail section). */
  limit?: number;
}

/**
 * Pool leaderboard table (US-5.2). Position uses dense ranking; the viewer's row
 * is highlighted. Members with no scores show 0 (BR-6.12, BR-6.15).
 */
export function PoolLeaderboard({ rows, limit }: PoolLeaderboardProps) {
  const visible = limit ? rows.slice(0, limit) : rows;

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
