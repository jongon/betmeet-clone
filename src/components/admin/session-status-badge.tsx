import { Badge } from "@/components/ui/badge";
import { getAdminSessionStateLabel } from "@/lib/admin-session-detail";
import type { Session } from "@/lib/sessions";

export function SessionStatusBadge({
  session,
}: {
  session: Pick<Session, "status" | "archivedAt">;
}) {
  const label = getAdminSessionStateLabel(session);

  if (label === "Abierta") {
    return (
      <Badge variant="secondary" className="bg-chart-4/20 text-foreground">
        {label}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="bg-muted text-muted-foreground">
      {label}
    </Badge>
  );
}
