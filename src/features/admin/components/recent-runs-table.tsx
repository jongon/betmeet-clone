"use client";

import { Badge } from "@/components/ui/badge";
import { useDictionary } from "@/i18n/dictionary-provider";
import { LocalDate } from "@/lib/format-date";
import type { SyncRunRow } from "../types";

function statusVariant(status: SyncRunRow["status"]): "default" | "secondary" | "destructive" {
  if (status === "SUCCESS") return "default";
  if (status === "FAILED" || status === "RATE_LIMITED") return "destructive";
  return "secondary";
}

export function RecentRunsTable({ runs }: { runs: SyncRunRow[] }) {
  const t = useDictionary().admin;

  if (runs.length === 0) {
    return <p className="text-sm text-muted-foreground">{t.noRuns}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm" data-testid="recent-runs-table">
        <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            <th className="p-2">{t.scope}</th>
            <th className="p-2">{t.status}</th>
            <th className="p-2">{t.start}</th>
            <th className="p-2">{t.end}</th>
            <th className="p-2 text-right">{t.items}</th>
            <th className="p-2">{t.error}</th>
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
                <LocalDate value={run.startedAt} />
              </td>
              <td className="p-2 text-muted-foreground">
                <LocalDate value={run.finishedAt} />
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
