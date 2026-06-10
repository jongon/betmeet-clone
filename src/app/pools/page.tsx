import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PoolCard } from "@/features/pools/components/pool-card";
import { getMyPools } from "@/features/pools/queries";

export default async function PoolsPage() {
  const pools = await getMyPools();

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Pools</p>
          <h1 className="text-3xl font-semibold tracking-tight">Mis quinielas</h1>
          <p className="text-muted-foreground">
            Administra tus pools, invitaciones y participantes.
          </p>
        </div>
        <div className="flex gap-2">
          <Link className={buttonVariants({ variant: "outline" })} href="/pools/discover">
            Descubrir
          </Link>
          <Link className={buttonVariants()} href="/pools/new">
            Crear pool
          </Link>
        </div>
      </header>

      {pools.length === 0 ? (
        <section className="rounded-xl border p-8 text-center" data-testid="my-pools-empty">
          <h2 className="font-semibold">Aún no estás en ningún pool</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Crea uno privado para tus amigos o únete a un pool público.
          </p>
        </section>
      ) : (
        <section className="space-y-3" data-testid="my-pools-list">
          {pools.map((pool) => (
            <PoolCard key={pool.id} pool={pool} />
          ))}
        </section>
      )}
    </main>
  );
}
