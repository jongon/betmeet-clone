"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLiveResults } from "@/features/competition/hooks/use-live-results";
import { useDictionary } from "@/i18n/dictionary-provider";
import type { MatchView, PoolMemberPrediction, PoolMemberSummary } from "../types";
import { PoolLiveNowBanner } from "./pool-live-now-banner";

type TabValue = "ranking" | "predictions" | "members";

const VALID_TABS: readonly TabValue[] = ["ranking", "predictions", "members"];

function resolveTab(raw: string | null): TabValue {
  if (raw && (VALID_TABS as readonly string[]).includes(raw)) return raw as TabValue;
  return "ranking";
}

/**
 * Unit 61 — client wrapper for the `/pools/[id]` detail body.
 *
 * Responsibilities:
 * - Mounts `useLiveResults()` **once** so both the «En vivo ahora» banner and
 *   the Predicciones grid refresh from a single Realtime subscription, on any
 *   tab (BR-61.7). Replaces the per-grid subscription that lived in
 *   `PoolPredictionsView`.
 * - Drives the active tab from the URL (`?tab=…`, default `ranking`) so the
 *   banner can deep-link to the Predicciones tab (BR-61.6, supersedes BR-41.7).
 *   A normal tab click updates `?tab` via `router.replace` (no full reload);
 *   `?page` is preserved when present.
 * - Renders `PoolLiveNowBanner` above the `<Tabs>` (cross-tab, BR-61.2).
 *
 * The server (`page.tsx`) computes `liveMatches` and passes the server-rendered
 * content of each tab + the sidebar as children/props.
 */
export function PoolDetailTabs({
  liveMatches,
  predictions,
  matches,
  members,
  initialTab,
  rankingContent,
  predictionsContent,
  membersContent,
  aside,
}: {
  liveMatches: MatchView[];
  predictions: PoolMemberPrediction[];
  matches: MatchView[];
  members: PoolMemberSummary[];
  initialTab: string | undefined;
  rankingContent: ReactNode;
  predictionsContent: ReactNode;
  membersContent: ReactNode;
  aside: ReactNode;
}) {
  const dictionary = useDictionary();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Unit 58/61: single Realtime subscription for the whole pool detail.
  useLiveResults();

  const tab = resolveTab(searchParams.get("tab") ?? initialTab ?? null);

  const handleTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", value);
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  return (
    <div className="space-y-6">
      <PoolLiveNowBanner
        liveMatches={liveMatches}
        predictions={predictions}
        matches={matches}
        members={members}
      />

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="ranking">{dictionary.pools.ranking}</TabsTrigger>
          <TabsTrigger value="predictions">{dictionary.pools.predictions.tab}</TabsTrigger>
          <TabsTrigger value="members">{dictionary.pools.members}</TabsTrigger>
        </TabsList>

        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-6 pt-6">
            <TabsContent value="ranking">{rankingContent}</TabsContent>
            <TabsContent value="predictions">{predictionsContent}</TabsContent>
            <TabsContent value="members">{membersContent}</TabsContent>
          </div>
          <aside className="space-y-4 pt-6">{aside}</aside>
        </div>
      </Tabs>
    </div>
  );
}
