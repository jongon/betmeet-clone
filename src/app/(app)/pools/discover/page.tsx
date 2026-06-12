import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PoolDirectoryList } from "@/features/pools/components/pool-directory-list";
import { PoolSearchBar } from "@/features/pools/components/pool-search-bar";
import { listPublicPools } from "@/features/pools/queries";

interface DiscoverPoolsPageProps {
  searchParams: Promise<{ q?: string; withCapacity?: string; page?: string }>;
}

export default async function DiscoverPoolsPage({ searchParams }: DiscoverPoolsPageProps) {
  const params = await searchParams;
  const query = params.q ?? "";
  const onlyWithCapacity = params.withCapacity === "1";
  const page = Number(params.page ?? 0) || 0;
  const pools = await listPublicPools({ query, onlyWithCapacity, page });

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Directorio</p>
          <h1 className="text-3xl font-semibold tracking-tight">Ligas públicas</h1>
          <p className="text-muted-foreground">
            Busca ligas abiertas y únete antes del inicio del partido.
          </p>
        </div>
        <Link className={buttonVariants({ variant: "outline" })} href="/pools">
          Mis ligas
        </Link>
      </header>
      <PoolSearchBar query={query} onlyWithCapacity={onlyWithCapacity} />
      <PoolDirectoryList pools={pools} />
    </main>
  );
}
