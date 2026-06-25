import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * Champion serpentinas overlay (Unit 70). Pure CSS — **no client JS** (this is a
 * Server Component): a continuous, subtle loop of falling streamers rendered over
 * the 1st-place leaderboard row. Pieces are deterministic so SSR is stable. The
 * animation lives in `globals.css` (`leaderboard-streamer-fall`) and is disabled
 * under `prefers-reduced-motion`. Purely decorative → `aria-hidden`.
 */
const STREAMERS: ReadonlyArray<{
  x: number;
  w: number;
  h: number;
  d: number;
  delay: number;
  c: string;
}> = [
  { x: 6, w: 3, h: 14, d: 3.2, delay: 0, c: "#f5a524" },
  { x: 14, w: 4, h: 18, d: 3.8, delay: 0.6, c: "#ef4444" },
  { x: 22, w: 3, h: 12, d: 2.9, delay: 1.2, c: "#3b82f6" },
  { x: 31, w: 5, h: 20, d: 4.1, delay: 0.3, c: "#22c55e" },
  { x: 39, w: 3, h: 15, d: 3.4, delay: 1.8, c: "#a855f7" },
  { x: 47, w: 4, h: 16, d: 3.0, delay: 0.9, c: "#fbbf24" },
  { x: 55, w: 3, h: 13, d: 3.7, delay: 2.1, c: "#ec4899" },
  { x: 63, w: 4, h: 19, d: 4.3, delay: 0.2, c: "#f5a524" },
  { x: 71, w: 3, h: 14, d: 3.1, delay: 1.4, c: "#3b82f6" },
  { x: 79, w: 5, h: 17, d: 3.9, delay: 0.7, c: "#22c55e" },
  { x: 86, w: 3, h: 12, d: 2.8, delay: 1.9, c: "#ef4444" },
  { x: 92, w: 4, h: 18, d: 4.0, delay: 0.5, c: "#a855f7" },
];

export function LeaderboardConfetti({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-testid="leaderboard-confetti"
      className={cn(
        "leaderboard-confetti pointer-events-none absolute inset-0 z-0 overflow-hidden",
        className,
      )}
    >
      {STREAMERS.map((s) => (
        <span
          key={`${s.x}-${s.c}`}
          className="leaderboard-confetti__piece"
          style={
            {
              left: `${s.x}%`,
              width: `${s.w}px`,
              height: `${s.h}px`,
              background: s.c,
              animationDuration: `${s.d}s`,
              animationDelay: `${s.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}
