export default function PoolDetailLoading() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
      <header className="space-y-3 rounded-xl border p-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
          <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
      </header>
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="h-7 w-32 animate-pulse rounded bg-muted" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className="h-4 w-6 animate-pulse rounded bg-muted" />
                <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                <div className="ml-auto h-4 w-10 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <div className="h-7 w-32 animate-pulse rounded bg-muted" />
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
        <aside className="space-y-4">
          <div className="h-40 animate-pulse rounded-xl border bg-muted/50" />
          <div className="h-60 animate-pulse rounded-xl border bg-muted/50" />
        </aside>
      </div>
    </main>
  );
}
