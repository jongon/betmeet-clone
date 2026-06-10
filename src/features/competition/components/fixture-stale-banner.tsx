import type { FixtureFreshness } from "../types";

export function FixtureStaleBanner({ freshness }: { freshness: FixtureFreshness }) {
  if (!freshness.isStale) return null;

  const last = freshness.lastSyncedAt
    ? new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(freshness.lastSyncedAt),
      )
    : "sin sincronización exitosa";

  return (
    <div
      className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm"
      data-testid="fixture-stale-banner"
    >
      Los datos del fixture pueden estar retrasados. Última sincronización: {last}.
    </div>
  );
}
