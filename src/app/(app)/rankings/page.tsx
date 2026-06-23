import type { Metadata } from "next";
import { getCurrentUserId } from "@/features/pools/services/session";
import { LeaderboardLiveRefresh } from "@/features/scoring-rankings/components/leaderboard-live-refresh";
import { PoolLeaderboard } from "@/features/scoring-rankings/components/pool-leaderboard";
import { getGlobalRankingProjection } from "@/features/scoring-rankings/queries";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/lib/locale";

export async function generateMetadata(): Promise<Metadata> {
  const dictionary = getDictionary(await getRequestLocale());
  return { title: dictionary.pages.rankingsTitle };
}

export default async function RankingsPage() {
  const dictionary = getDictionary(await getRequestLocale());
  const viewerId = await getCurrentUserId();
  const { rows, hasLive } = await getGlobalRankingProjection(viewerId);

  const projectedRows = hasLive ? rows : undefined;

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{dictionary.pages.rankingsTitle}</h1>
        <p className="text-sm text-muted-foreground">{dictionary.pages.rankingsDescription}</p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
          {dictionary.pages.rankingsEmpty}
        </div>
      ) : (
        <LeaderboardLiveRefresh>
          <PoolLeaderboard
            rows={rows}
            projectedRows={projectedRows}
            hasLive={hasLive}
            copy={dictionary.rankings.liveProjection}
          />
        </LeaderboardLiveRefresh>
      )}
    </main>
  );
}
