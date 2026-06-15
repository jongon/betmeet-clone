export default function MatchesLoading() {
  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-8 w-56 animate-pulse rounded bg-muted" />
          <div className="h-4 w-72 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
      </header>
      <div className="space-y-8">
        {[1, 2].map((day) => (
          <section key={day} className="space-y-3">
            <div className="h-7 w-36 animate-pulse rounded bg-muted" />
            <div className="space-y-3">
              {[1, 2, 3].map((m) => (
                <div key={m} className="h-28 animate-pulse rounded-xl border bg-muted/50" />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
