"use client";

import { useState, useTransition } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { joinPublicPool } from "../actions/join-public-pool";
import type { PoolPreviewItem } from "../types";

export function PoolPreviewCard({ pool }: { pool: PoolPreviewItem }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const hasCapacity = pool.memberCount < pool.capacity;

  function join() {
    setError(null);
    startTransition(async () => {
      const result = await joinPublicPool(pool.id);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <Card data-testid={`pool-preview-card-${pool.id}`}>
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">{pool.name}</p>
          <p className="text-sm text-muted-foreground">
            {pool.memberCount}/{pool.capacity} participantes
          </p>
          <FormError messages={error ? [error] : undefined} />
        </div>
        <Button
          onClick={join}
          disabled={!hasCapacity || pending}
          data-testid={`join-public-pool-${pool.id}`}
        >
          {hasCapacity ? (pending ? "Uniendo..." : "Unirme") : "Lleno"}
        </Button>
      </CardContent>
    </Card>
  );
}
