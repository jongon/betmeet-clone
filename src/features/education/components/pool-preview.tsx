import { Card, CardContent } from "@/components/ui/card";
import type { PoolPreviewItem, PoolPreviewState } from "@/features/pools/types";
import { es } from "@/i18n/dictionaries/es";

interface PoolPreviewProps {
  pools?: PoolPreviewItem[] | null;
  state?: PoolPreviewState;
}

/**
 * Landing pool directory preview, wired to the PoolPreviewItem contract
 * (BR-2.25). Until Unit 3 provides data the page passes state="empty". On
 * "error" the parent IslandBoundary hides the section (BR-2.26).
 */
export function PoolPreview({ pools, state = "empty" }: PoolPreviewProps) {
  if (state === "error") return null;

  return (
    <section aria-labelledby="pools-heading" data-testid="pool-preview" className="space-y-3">
      <h2 id="pools-heading" className="text-lg font-semibold">
        {es.landing.poolsTitle}
      </h2>

      {state === "loading" && (
        <div className="grid gap-3 sm:grid-cols-2" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-md border bg-muted/50" />
          ))}
        </div>
      )}

      {(state === "empty" || !pools || pools.length === 0) && state !== "loading" && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {es.landing.poolsEmpty}
          </CardContent>
        </Card>
      )}

      {state === "ready" && pools && pools.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {pools.map((pool) => (
            <li key={pool.id}>
              <Card>
                <CardContent className="flex items-center justify-between py-4">
                  <span className="font-medium">{pool.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {pool.memberCount}/{pool.capacity}
                  </span>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
