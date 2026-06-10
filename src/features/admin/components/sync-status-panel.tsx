import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SyncStatusView } from "../types";

export function SyncStatusPanel({ data }: { data: SyncStatusView }) {
  return (
    <section className="space-y-3" data-testid="sync-status-panel">
      <h2 className="text-lg font-semibold">Última sincronización por scope</h2>
      {data.lastSuccessByScope.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sin sincronizaciones exitosas todavía.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.lastSuccessByScope.map((scope) => (
            <Card key={scope.scope} data-testid={`sync-scope-${scope.scope}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{scope.scope}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>{scope.finishedAt ? new Date(scope.finishedAt).toLocaleString("es") : "—"}</p>
                <p className="text-xs">{scope.itemsUpdated} items actualizados</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
