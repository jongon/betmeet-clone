"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDictionary } from "@/i18n/dictionary-provider";
import { joinPublicPool } from "../actions/join-public-pool";
import type { PoolPreviewItem } from "../types";

export function PoolPreviewCard({ pool }: { pool: PoolPreviewItem }) {
  const t = useDictionary().pools;
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const hasCapacity = pool.memberCount < pool.capacity;

  function join() {
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = await joinPublicPool(pool.id);
      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }
      // Already a member: stay in the directory with an info message (FR-REFINE-13.6).
      if ("alreadyMember" in result) {
        setInfo(t.alreadyMember);
        return;
      }
      // Successful join: go straight to the pool page (FR-REFINE-13.5).
      if ("success" in result) {
        router.push(`/pools/${result.poolId}`);
      }
    });
  }

  return (
    <Card data-testid={`pool-preview-card-${pool.id}`}>
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">{pool.name}</p>
          <p className="text-sm text-muted-foreground">
            {pool.memberCount}/{pool.capacity} {t.participants}
          </p>
          <FormError messages={error ? [error] : undefined} />
          {info ? (
            <p role="status" className="mt-1 text-sm text-muted-foreground">
              {info}{" "}
              <button
                type="button"
                className="underline underline-offset-4 hover:text-foreground"
                onClick={() => router.push(`/pools/${pool.id}`)}
              >
                {t.goToPool}
              </button>
            </p>
          ) : null}
        </div>
        <Button
          onClick={join}
          disabled={!hasCapacity || pending}
          data-testid={`join-public-pool-${pool.id}`}
        >
          {hasCapacity ? (pending ? t.joining : t.join) : t.full}
        </Button>
      </CardContent>
    </Card>
  );
}
