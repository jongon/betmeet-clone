"use client";

import { useRouter } from "next/navigation";
import { useMemo, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { MatchStatusBadge } from "@/features/competition/components/match-status-badge";
import { useDictionary, useLocale } from "@/i18n/dictionary-provider";
import type { MatchView, PoolMemberPrediction, PoolMemberSummary } from "../types";
import { MemberPredictionRowView } from "./pool-predictions-view";
import {
  buildDayGroups,
  type DayGroup,
  type MatchColumn,
  pageForDayKey,
} from "./pool-predictions-view-helpers";

function subscribeToTimeZone() {
  return () => {};
}

function getBrowserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function TeamFlag({ src }: { src: string | null }) {
  if (!src) return null;
  // biome-ignore lint/performance/noImgElement: flag icons are small static SVGs
  return <img src={src} alt="" className="size-4 shrink-0 object-contain" />;
}

/**
 * Unit 61 — «En vivo ahora» cross-tab banner for `/pools/[id]`.
 *
 * Surfaces the pool's in-play matches (matchStatus === "LIVE") with the live
 * score + badge, plus a per-member list reusing the exact same cell resolution
 * as the Predicciones grid (override ?? global, preJoin, points). A CTA deep-
 * links into the Predicciones tab on the day/page of the match.
 *
 * The data (liveMatches, predictions, matches, members) comes from the server
 * (`page.tsx`); this component only renders. Live refresh is handled by the
 * `useLiveResults()` subscription mounted once in `PoolDetailTabs`.
 *
 * Returns null when there are no LIVE matches (no empty hole).
 */
export function PoolLiveNowBanner({
  liveMatches,
  predictions,
  matches,
  members,
}: {
  liveMatches: MatchView[];
  predictions: PoolMemberPrediction[];
  matches: MatchView[];
  members: PoolMemberSummary[];
}) {
  const dictionary = useDictionary();
  const t = dictionary.pools.predictions;
  const liveNow = dictionary.pools.liveNow;
  const locale = useLocale();
  const router = useRouter();
  const timeZone = useSyncExternalStore(subscribeToTimeZone, getBrowserTimeZone, () => "UTC");

  // Build the day groups once (same structure as the grid) so the banner can
  // resolve each live match's DayGroup + MatchColumn + member cells.
  const allDays = useMemo(
    () => buildDayGroups(predictions, members, locale, timeZone, matches),
    [predictions, members, locale, timeZone, matches],
  );

  // Map each live match to its DayGroup + MatchColumn so we can render the
  // per-member cells and compute the CTA page.
  const liveEntries = useMemo(() => {
    const entries: { day: DayGroup; col: MatchColumn }[] = [];
    for (const live of liveMatches) {
      for (const day of allDays) {
        const col = day.matches.find((m) => m.matchId === live.matchId);
        if (col) {
          entries.push({ day, col });
          break;
        }
      }
    }
    return entries;
  }, [liveMatches, allDays]);

  if (liveEntries.length === 0) return null;

  const handleViewInPredictions = (day: DayGroup) => {
    const page = pageForDayKey(day.dayKey, allDays);
    const params = new URLSearchParams();
    params.set("tab", "predictions");
    params.set("page", String(page));
    router.push(`?${params.toString()}`);
  };

  return (
    <section
      className="space-y-3 rounded-xl border border-live/30 bg-live/5 p-4"
      aria-label={liveNow.title}
      data-testid="pool-live-now-banner"
    >
      <div className="flex items-center gap-2">
        <span className="size-2 animate-pulse rounded-full bg-live" aria-hidden="true" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-live">{liveNow.title}</h2>
      </div>
      <div className="flex flex-col gap-3">
        {liveEntries.map(({ day, col }) => {
          const liveScore =
            col.homeScore != null && col.awayScore != null
              ? `${col.homeScore} - ${col.awayScore}`
              : null;
          return (
            <div
              key={col.matchId}
              className="rounded-lg border bg-card overflow-hidden"
              data-testid={`pool-live-now-match-${col.matchId}`}
            >
              <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
                <div className="flex items-center gap-1.5 min-w-0">
                  <TeamFlag src={col.homeFlag} />
                  <span className="text-sm font-semibold truncate">{col.homeLabel}</span>
                  <span className="text-xs font-semibold tabular-nums shrink-0">
                    {liveScore ?? "vs"}
                  </span>
                  <span className="text-sm font-semibold truncate">{col.awayLabel}</span>
                  <TeamFlag src={col.awayFlag} />
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-auto">
                  <MatchStatusBadge status="LIVE" />
                </div>
              </div>
              <div className="divide-y">
                {day.memberRows.map((member) => {
                  const cell = member.cells[col.matchId];
                  const isPreJoin = cell?.preJoin ?? false;
                  const isHidden = cell?.hidden ?? false;
                  const hasPrediction = cell?.predictedHome != null && cell?.predictedAway != null;
                  const hasPoints = cell?.totalPoints != null;
                  return (
                    <MemberPredictionRowView
                      key={member.userId}
                      col={col}
                      cell={cell}
                      member={member}
                      canEdit={false}
                      hasPrediction={hasPrediction}
                      hasPoints={hasPoints}
                      isPreJoin={isPreJoin}
                      isHidden={isHidden}
                      isViewer={false}
                      t={t}
                      matchId={col.matchId}
                    />
                  );
                })}
              </div>
              <div className="flex justify-end p-2 border-t bg-muted/20">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewInPredictions(day)}
                  data-testid={`pool-live-now-cta-${col.matchId}`}
                >
                  {liveNow.viewInPredictions}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
