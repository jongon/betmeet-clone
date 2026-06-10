import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MyPoolSummary } from "../types";

export function PoolCard({ pool }: { pool: MyPoolSummary }) {
  return (
    <Card data-testid={`pool-card-${pool.id}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {pool.name}
          {pool.isArchived && <Badge variant="secondary">Archivado</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>
            {pool.memberCount}/{pool.capacity} participantes ·{" "}
            {pool.type === "PUBLIC" ? "Público" : "Privado"}
          </p>
          <p>{pool.isOwner ? "Eres administrador" : "Miembro"}</p>
          {pool.isFrozen && <p>Lista congelada por inicio del torneo.</p>}
        </div>
        <Link className={buttonVariants({ variant: "outline" })} href={`/pools/${pool.id}`}>
          Ver liga
        </Link>
      </CardContent>
    </Card>
  );
}
