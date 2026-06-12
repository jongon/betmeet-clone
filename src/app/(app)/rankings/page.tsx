import type { Metadata } from "next";
import { getCurrentUserId } from "@/features/pools/services/session";
import { PoolLeaderboard } from "@/features/scoring-rankings/components/pool-leaderboard";
import { getGlobalRanking } from "@/features/scoring-rankings/queries";

export const metadata: Metadata = { title: "Ranking global" };

export default async function RankingsPage() {
  const viewerId = await getCurrentUserId();
  const rows = await getGlobalRanking(viewerId);

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Ranking global</h1>
        <p className="text-sm text-muted-foreground">
          Tu posición frente a todos los jugadores del Mundial.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
          Aún no hay puntuaciones. Vuelve cuando empiecen los partidos.
        </div>
      ) : (
        <PoolLeaderboard rows={rows} />
      )}
    </main>
  );
}
