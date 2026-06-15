export default function AdminLoading() {
  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <header className="space-y-2">
        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      </header>
      <div className="grid gap-6 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl border bg-muted/50" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl border bg-muted/50" />
    </main>
  );
}
