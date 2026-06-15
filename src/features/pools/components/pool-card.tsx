"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDictionary } from "@/i18n/dictionary-provider";
import type { MyPoolSummary } from "../types";

export function PoolCard({ pool }: { pool: MyPoolSummary }) {
  const t = useDictionary().pools;

  return (
    <Card data-testid={`pool-card-${pool.id}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          {pool.name}
          {pool.isOwner && !pool.isArchived && <Badge variant="brand">{t.adminBadge}</Badge>}
          {pool.isArchived && <Badge variant="secondary">{t.archived}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            {pool.memberCount}/{pool.capacity} {t.participants} ·{" "}
            {pool.type === "PUBLIC" ? t.public : t.private}
          </p>
          <p>{pool.isOwner ? t.ownerStatus : t.member}</p>
        </div>
        <Link className={buttonVariants({ variant: "outline" })} href={`/pools/${pool.id}`}>
          {t.view}
        </Link>
      </CardContent>
    </Card>
  );
}
