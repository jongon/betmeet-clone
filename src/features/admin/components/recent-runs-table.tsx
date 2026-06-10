import { Badge } from "@/components/ui/badge";
import type { SyncRunRow } from "../types";

function statusVariant(status: SyncRunRow["status"]): "default" | "secondary" | "destructive" {
  if (status === "SUCCESS") return "default";
  if (status === "FAILED" || status === "RATE_LIMITED") return "destructive";
  return "secondary";
}

export function RecentRunsTable({ runs }: { runs: SyncRunRow[] }) {
  if (runs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Aún no hay sincronizaciones registradas.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm" data-testid="recent-runs-table">
        <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            <th className="p-2">Scope</th>
            <th className="p-2">Estado</th>
            <th className="p-2">Inicio</th>
            <th className="p-2">Fin</th>
            <th className="p-2 text-right">Items</th>
            <th className="p-2">Error</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id} className="border-b last:border-0" data-testid={`sync-run-${run.id}`}>
              <td className="p-2 font-medium">{run.scope}</td>
              <td className="p-2">
                <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
              </td>
              <td className="p-2 text-muted-foreground">
                {new Date(run.startedAt).toLocaleString("es")}
              </td>
              <td className="p-2 text-muted-foreground">
                {run.finishedAt ? new Date(run.finishedAt).toLocaleString("es") : "—"}
              </td>
              <td className="p-2 text-right tabular-nums">
                {run.itemsUpdated}/{run.itemsFetched}
              </td>
              <td className="max-w-[16rem] truncate p-2 text-destructive">
                {run.errorMessage ?? ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
