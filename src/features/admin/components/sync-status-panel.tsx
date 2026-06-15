"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDictionary, useLocale } from "@/i18n/dictionary-provider";
import type { SyncStatusView } from "../types";

export function SyncStatusPanel({ data }: { data: SyncStatusView }) {
  const t = useDictionary().admin;
  const locale = useLocale();

  return (
    <section className="space-y-3" data-testid="sync-status-panel">
      <h2 className="text-lg font-semibold">{t.lastSyncByScope}</h2>
      {data.lastSuccessByScope.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.noSuccessfulSync}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.lastSuccessByScope.map((scope) => (
            <Card key={scope.scope} data-testid={`sync-scope-${scope.scope}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{scope.scope}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>{scope.finishedAt ? new Date(scope.finishedAt).toLocaleString(locale) : "—"}</p>
                <p className="text-xs">
                  {scope.itemsUpdated} {t.itemsUpdated}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
