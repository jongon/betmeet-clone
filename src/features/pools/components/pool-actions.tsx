"use client";

import { useState, useTransition } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { deletePool } from "../actions/delete-pool";
import { leavePool } from "../actions/leave-pool";
import { setPoolArchived } from "../actions/set-pool-archived";
import type { PoolDetail } from "../types";

export function PoolActions({ pool }: { pool: PoolDetail }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ error?: string; success?: boolean } | undefined>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-3 rounded-xl border p-4" data-testid="pool-actions">
      <FormError messages={error ? [error] : undefined} />
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => run(() => setPoolArchived(pool.id, !pool.isArchived))}
        >
          {pool.isArchived ? "Desarchivar" : "Archivar"}
        </Button>
        {!pool.isOwner && (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run(() => leavePool(pool.id))}
          >
            Salir de la liga
          </Button>
        )}
        {pool.isOwner && (
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => run(() => deletePool(pool.id))}
          >
            Eliminar liga
          </Button>
        )}
      </div>
    </div>
  );
}
