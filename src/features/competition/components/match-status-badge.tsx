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
  return <Badge variant={status === "LIVE" ? "default" : "secondary"}>{LABELS[status]}</Badge>;
}
