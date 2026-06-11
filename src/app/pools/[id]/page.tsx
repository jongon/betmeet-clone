import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { DirectedInviteForm } from "@/features/pools/components/directed-invite-form";
import { InviteShare } from "@/features/pools/components/invite-share";
import { MemberList } from "@/features/pools/components/member-list";
import { PoolActions } from "@/features/pools/components/pool-actions";
import { getPoolDetail } from "@/features/pools/queries";
import { getCurrentUserId } from "@/features/pools/services/session";
import { PoolLeaderboard } from "@/features/scoring-rankings/components/pool-leaderboard";
import { getPoolLeaderboard } from "@/features/scoring-rankings/queries";

interface PoolDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PoolDetailPage({ params }: PoolDetailPageProps) {
  const { id } = await params;
  const pool = await getPoolDetail(id);
  if (!pool) notFound();

  const userId = await getCurrentUserId();
  const leaderboard = userId ? await getPoolLeaderboard(id, userId) : null;

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <Link className={buttonVariants({ variant: "ghost" })} href="/pools">
        Volver
      </Link>

      <header className="space-y-3 rounded-xl border p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{pool.name}</h1>
          <Badge variant={pool.type === "PUBLIC" ? "default" : "secondary"}>
            {pool.type === "PUBLIC" ? "Público" : "Privado"}
          </Badge>
          {pool.isFrozen && <Badge variant="secondary">Congelado</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          {pool.memberCount}/{pool.capacity} participantes ·{" "}
          {pool.isOwner ? "Eres administrador" : "Miembro"}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          {leaderboard && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Ranking</h2>
                {leaderboard.length > 5 && (
                  <Link
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                    href={`/pools/${id}/leaderboard`}
                  >
                    Ver completa
                  </Link>
                )}
              </div>
              <PoolLeaderboard rows={leaderboard} limit={5} />
            </section>
          )}
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Miembros</h2>
            <MemberList pool={pool} />
          </section>
        </div>
        <aside className="space-y-4">
          <InviteShare token={pool.inviteToken} />
          {pool.isOwner && <DirectedInviteForm poolId={pool.id} />}
          <PoolActions pool={pool} />
        </aside>
      </div>
    </main>
  );
}
