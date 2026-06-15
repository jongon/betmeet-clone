import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUserId } from "@/features/pools/services/session";
import { PoolLeaderboard } from "@/features/scoring-rankings/components/pool-leaderboard";
import { getPoolLeaderboard } from "@/features/scoring-rankings/queries";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/lib/locale";

interface PoolLeaderboardPageProps {
  params: Promise<{ id: string }>;
}

export default async function PoolLeaderboardPage({ params }: PoolLeaderboardPageProps) {
  const dictionary = getDictionary(await getRequestLocale());
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) notFound();

  const rows = await getPoolLeaderboard(id, userId);
  if (!rows) notFound(); // not a member (BR-6.16)

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <Link className={buttonVariants({ variant: "ghost" })} href={`/pools/${id}`}>
        {dictionary.pools.backToPool}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{dictionary.pools.ranking}</h1>
      <PoolLeaderboard rows={rows} />
    </main>
  );
}
