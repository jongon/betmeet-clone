import { Badge } from "@/components/ui/badge";
import type { MatchStatus } from "@/generated/prisma/enums";

const LABELS: Record<MatchStatus, string> = {
  SCHEDULED: "Programado",
  LOCKED: "Bloqueado",
  LIVE: "En juego",
  FINISHED: "Finalizado",
  POSTPONED: "Postergado",
  CANCELLED: "Cancelado",
};

export function MatchStatusBadge({ status }: { status: MatchStatus }) {
  if (status === "LIVE") {
    return (
      <Badge variant="live">
        <span className="size-1.5 animate-pulse rounded-full bg-live" aria-hidden="true" />
        {LABELS[status]}
      </Badge>
    );
  }
  return <Badge variant="secondary">{LABELS[status]}</Badge>;
}
