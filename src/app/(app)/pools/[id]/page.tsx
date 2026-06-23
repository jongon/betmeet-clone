import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DirectedInviteForm } from "@/features/pools/components/directed-invite-form";
import { InviteShare } from "@/features/pools/components/invite-share";
import { MemberList } from "@/features/pools/components/member-list";
import { PoolActions } from "@/features/pools/components/pool-actions";
import { PoolDetailTabs } from "@/features/pools/components/pool-detail-tabs";
import { PoolPredictionsView } from "@/features/pools/components/pool-predictions-view";
import { PoolSettingsCard } from "@/features/pools/components/pool-settings-card";
import { getPoolDetail, getPoolMemberPredictions } from "@/features/pools/queries";
import { getCurrentUserId } from "@/features/pools/services/session";
import { PoolLeaderboard } from "@/features/scoring-rankings/components/pool-leaderboard";
import { getPoolLeaderboard } from "@/features/scoring-rankings/queries";
import { projectPoolLeaderboardFromLoaded } from "@/features/scoring-rankings/services/project-leaderboard";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/lib/locale";

interface PoolDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; tab?: string }>;
}

export default async function PoolDetailPage({ params, searchParams }: PoolDetailPageProps) {
  const dictionary = getDictionary(await getRequestLocale());
  const { id } = await params;
  const { page: pageRaw, tab: tabRaw } = await searchParams;

  const userId = await getCurrentUserId();
  const [pool, leaderboard, predictionsData] = await Promise.all([
    getPoolDetail(id),
    userId ? getPoolLeaderboard(id, userId) : Promise.resolve(null),
    getPoolMemberPredictions(id),
  ]);
  if (!pool) notFound();

  const initialPage = pageRaw != null ? parseInt(pageRaw, 10) || 0 : undefined;

  // Unit 47: BR-47.4 — gate UI. PUBLIC pools siempre permiten invitar/compartir.
  // PRIVATE pools dependen del toggle `membersCanInvite`. Owner siempre puede.
  const canInvite = pool.isOwner || pool.type === "PUBLIC" || pool.membersCanInvite;

  // Unit 61: LIVE matches surfaced cross-tab by the «En vivo ahora» banner.
  const liveMatches = predictionsData
    ? predictionsData.matches.filter((m) => m.matchStatus === "LIVE")
    : [];

  // Unit 62 — project the pool leaderboard against the live scoreboard when at
  // least one match is LIVE. Reuses the matches/predictions already loaded for
  // the grid (no extra DB hit). `PoolDetailTabs` already mounts
  // `useLiveResults()` once for the whole body, so the projection auto-refreshes
  // on every broadcast `results-updated`.
  const hasLive = liveMatches.length > 0;
  const projectedRows =
    hasLive && leaderboard && predictionsData
      ? projectPoolLeaderboardFromLoaded({
          rows: leaderboard,
          matches: predictionsData.matches,
          predictions: predictionsData.predictions,
          members: pool.members,
        })
      : undefined;

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

      <PoolDetailTabs
        liveMatches={liveMatches}
        predictions={predictionsData?.predictions ?? []}
        matches={predictionsData?.matches ?? []}
        members={pool.members}
        initialTab={tabRaw}
        rankingContent={
          leaderboard && (
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
              <PoolLeaderboard
                rows={leaderboard}
                limit={5}
                projectedRows={projectedRows}
                hasLive={hasLive}
                copy={dictionary.rankings.liveProjection}
              />
            </section>
          )
        }
        predictionsContent={
          predictionsData && (
            <PoolPredictionsView
              predictions={predictionsData.predictions}
              matches={predictionsData.matches}
              members={pool.members}
              poolId={pool.id}
              viewerId={userId ?? ""}
              initialPage={initialPage}
            />
          )
        }
        membersContent={
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">{dictionary.pools.members}</h2>
            <MemberList pool={pool} />
          </section>
        }
        aside={
          <>
            {canInvite && <InviteShare token={pool.inviteToken} />}
            {canInvite ? (
              <DirectedInviteForm poolId={pool.id} />
            ) : (
              <p className="text-sm text-muted-foreground">
                {dictionary.pools.invite.membersBlockedHint}
              </p>
            )}
            {/* Unit 54: BR-54.3 — el panel de ajustes (renombrar) se muestra a cualquier dueño,
                en PUBLIC y PRIVATE. El toggle de invitaciones interno sigue siendo solo PRIVATE. */}
            {pool.isOwner && (
              <PoolSettingsCard
                poolId={pool.id}
                poolType={pool.type}
                initialName={pool.name}
                initialMembersCanInvite={pool.membersCanInvite}
              />
            )}
            <PoolActions pool={pool} />
          </>
        }
      />
    </main>
  );
}
