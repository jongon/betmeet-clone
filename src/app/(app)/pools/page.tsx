import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PoolCard } from "@/features/pools/components/pool-card";
import { getMyPools } from "@/features/pools/queries";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/lib/locale";

export default async function PoolsPage() {
  const dictionary = getDictionary(await getRequestLocale());
  const pools = await getMyPools();

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">{dictionary.pools.title}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{dictionary.pools.myPools}</h1>
          <p className="text-muted-foreground">{dictionary.pools.description}</p>
        </div>
        <div className="flex gap-2">
          <Link className={buttonVariants({ variant: "outline" })} href="/pools/discover">
            {dictionary.pools.discover}
          </Link>
          <Link className={buttonVariants()} href="/pools/new">
            {dictionary.pools.create}
          </Link>
        </div>
      </header>

      {pools.length === 0 ? (
        <section className="rounded-xl border p-8 text-center" data-testid="my-pools-empty">
          <h2 className="font-semibold">{dictionary.pools.emptyTitle}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{dictionary.pools.emptyDescription}</p>
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
