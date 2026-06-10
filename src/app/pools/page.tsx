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
          <p className="text-sm font-medium text-primary">Ligas</p>
          <h1 className="text-3xl font-semibold tracking-tight">Mis ligas</h1>
          <p className="text-muted-foreground">
            Administra tus ligas, invitaciones y participantes.
          </p>
        </div>
        <div className="flex gap-2">
          <Link className={buttonVariants({ variant: "outline" })} href="/pools/discover">
            Descubrir
          </Link>
          <Link className={buttonVariants()} href="/pools/new">
            Crear liga
          </Link>
        </div>
      </header>

      {pools.length === 0 ? (
        <section className="rounded-xl border p-8 text-center" data-testid="my-pools-empty">
          <h2 className="font-semibold">Aún no estás en ninguna liga</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Crea una liga privada para tus amigos o únete a una liga pública.
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
