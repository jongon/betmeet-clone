"use client";

import { useState } from "react";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { triggerSync } from "../actions/trigger-sync";

const SCOPES = ["FIXTURES", "LIVE_STATUS", "RESULTS", "FULL"] as const;

export function TriggerSyncControls() {
  const [scope, setScope] = useState<(typeof SCOPES)[number]>("RESULTS");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTrigger() {
    setPending(true);
    setError(null);
    const result = await triggerSync(scope);
    if (result?.error) setError(result.error);
    setPending(false);
  }

  return (
    <section className="space-y-2 rounded-xl border p-4" data-testid="trigger-sync">
      <h2 className="text-lg font-semibold">Sincronizar ahora</h2>
      <FormError messages={error ? [error] : undefined} />
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as (typeof SCOPES)[number])}
          data-testid="admin-sync-scope"
          className="h-9 rounded-md border bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {SCOPES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button onClick={handleTrigger} disabled={pending} data-testid="admin-sync-trigger">
          {pending ? "Sincronizando…" : "Sincronizar ahora"}
        </Button>
      </div>
    </section>
  );
}
