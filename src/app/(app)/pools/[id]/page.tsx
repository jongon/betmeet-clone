import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DirectedInviteForm } from "@/features/pools/components/directed-invite-form";
import { InviteShare } from "@/features/pools/components/invite-share";
import { MemberList } from "@/features/pools/components/member-list";
import { PoolActions } from "@/features/pools/components/pool-actions";
import { PoolPredictionsView } from "@/features/pools/components/pool-predictions-view";
import { PoolSettingsCard } from "@/features/pools/components/pool-settings-card";
import { getPoolDetail, getPoolMemberPredictions } from "@/features/pools/queries";
import { getCurrentUserId } from "@/features/pools/services/session";
import { PoolLeaderboard } from "@/features/scoring-rankings/components/pool-leaderboard";
import { getPoolLeaderboard } from "@/features/scoring-rankings/queries";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/lib/locale";

interface PoolDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PoolDetailPage({ params }: PoolDetailPageProps) {
  const dictionary = getDictionary(await getRequestLocale());
  const { id } = await params;

  const userId = await getCurrentUserId();
  const [pool, leaderboard, predictions] = await Promise.all([
    getPoolDetail(id),
    userId ? getPoolLeaderboard(id, userId) : Promise.resolve(null),
    getPoolMemberPredictions(id),
  ]);
  if (!pool) notFound();

  // Unit 47: BR-47.4 — gate UI. PUBLIC pools siempre permiten invitar/compartir.
  // PRIVATE pools dependen del toggle `membersCanInvite`. Owner siempre puede.
  const canInvite = pool.isOwner || pool.type === "PUBLIC" || pool.membersCanInvite;

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <Link className={buttonVariants({ variant: "ghost" })} href="/pools">
        {dictionary.pools.back}
      </Link>

      <header className="space-y-3 rounded-xl border p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{pool.name}</h1>
          <Badge variant={pool.type === "PUBLIC" ? "default" : "secondary"}>
            {pool.type === "PUBLIC" ? dictionary.pools.public : dictionary.pools.private}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {pool.memberCount}/{pool.capacity} {dictionary.pools.participants} ·{" "}
          {pool.isOwner ? dictionary.pools.ownerStatus : dictionary.pools.member}
        </p>
      </header>

      <Tabs defaultValue="ranking">
        <TabsList>
          <TabsTrigger value="ranking">{dictionary.pools.ranking}</TabsTrigger>
          <TabsTrigger value="predictions">{dictionary.pools.predictions.tab}</TabsTrigger>
          <TabsTrigger value="members">{dictionary.pools.members}</TabsTrigger>
        </TabsList>

        <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-6 pt-6">
            <TabsContent value="ranking">
              {leaderboard && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">{dictionary.pools.ranking}</h2>
                    {leaderboard.length > 5 && (
                      <Link
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                        href={`/pools/${id}/leaderboard`}
                      >
                        {dictionary.pools.fullRanking}
                      </Link>
                    )}
                  </div>
                  <PoolLeaderboard rows={leaderboard} limit={5} />
                </section>
              )}
            </TabsContent>

            <TabsContent value="predictions">
              {predictions && (
                <PoolPredictionsView predictions={predictions} members={pool.members} />
              )}
            </TabsContent>

            <TabsContent value="members">
              <section className="space-y-3">
                <h2 className="text-xl font-semibold">{dictionary.pools.members}</h2>
                <MemberList pool={pool} />
              </section>
            </TabsContent>
          </div>

          <aside className="space-y-4 pt-6">
            {canInvite && <InviteShare token={pool.inviteToken} />}
            {canInvite ? (
              <DirectedInviteForm poolId={pool.id} />
            ) : (
              <p className="text-sm text-muted-foreground">
                {dictionary.pools.invite.membersBlockedHint}
              </p>
            )}
            {/* Unit 47: BR-47.5 — PoolSettingsCard solo para PRIVATE (PUBLIC siempre permite invitar) */}
            {pool.isOwner && pool.type === "PRIVATE" && (
              <PoolSettingsCard poolId={pool.id} initialMembersCanInvite={pool.membersCanInvite} />
            )}
            <PoolActions pool={pool} />
          </aside>
        </div>
      </Tabs>
    </main>
  );
}
