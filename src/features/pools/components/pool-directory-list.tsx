import type { PoolPreviewItem } from "../types";
import { PoolPreviewCard } from "./pool-preview-card";

export function PoolDirectoryList({ pools }: { pools: PoolPreviewItem[] }) {
  if (pools.length === 0) {
    return (
      <div
        className="rounded-xl border p-8 text-center text-sm text-muted-foreground"
        data-testid="pool-directory-empty"
      >
        No hay pools públicos con esos filtros.
      </div>
    );
  }

  return (
    <ul className="space-y-3" data-testid="pool-directory-list">
      {pools.map((pool) => (
        <li key={pool.id}>
          <PoolPreviewCard pool={pool} />
        </li>
      ))}
    </ul>
  );
}
