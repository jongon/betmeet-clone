import { NextResponse } from "next/server";
import { revalidateResultViews } from "@/features/admin/services/revalidate-result-views";
import { broadcastResultsUpdated } from "@/features/competition/services/broadcast-results-updated";
import {
  hasActiveMatchWindow,
  isKnockoutResolutionWindow,
  runScheduledSync,
} from "@/features/competition/services/run-scheduled-sync";
import type { ProviderSyncScope } from "@/generated/prisma/enums";

export const runtime = "nodejs";

// Scopes the scheduler may request. Mirrors the provider scopes plus CLEANUP
// (purge of old ProviderSyncRun rows). Admin-only scopes (TEAMS) stay excluded.
const ALLOWED_SCOPES: ProviderSyncScope[] = [
  "FIXTURES",
  "LIVE_STATUS",
  "RESULTS",
  "FULL",
  "CLEANUP",
];

/**
 * Automated sync/scoring entrypoint (Unit 50). Invoked by Supabase pg_cron via
 * pg_net on a tiered schedule. Guarded by the same `x-sync-secret` header as
 * the notification dispatch route. Reuses the shared `runScheduledSync`
 * orchestration (provider sync → scoring → dispatch).
 */
export async function POST(request: Request) {
  const expected = process.env.SYNC_TRIGGER_SECRET;
  if (expected) {
    const provided = request.headers.get("x-sync-secret");
    if (provided !== expected) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const scopeParam = new URL(request.url).searchParams.get("scope");
  if (!scopeParam || !ALLOWED_SCOPES.includes(scopeParam as ProviderSyncScope)) {
    return NextResponse.json({ error: "Scope inválido" }, { status: 400 });
  }
  const scope = scopeParam as ProviderSyncScope;

  try {
    // Quota saver: skip the live poll entirely when no match is live or imminent.
    if (scope === "LIVE_STATUS" && !(await hasActiveMatchWindow())) {
      return NextResponse.json({ ok: true, scope, skipped: true });
    }

    const result = await runScheduledSync(scope, { source: "cron" });
    if (!result.ok) {
      return NextResponse.json({ ok: false, scope, error: result.error }, { status: 502 });
    }

    // Knockout catch-up: a just-finished knockout match resolves the next round's
    // teams at the provider, but only the FIXTURES scope pulls SCHEDULED matches
    // (and it runs once a day). Piggyback a FIXTURES pass on the frequent RESULTS
    // cron while a bracket is waiting to be filled, so newly-decided matchups —
    // and the cache invalidation below — land within one RESULTS tick. Best-effort:
    // RESULTS already persisted, so a chained failure must not fail the run.
    if (scope === "RESULTS" && (await isKnockoutResolutionWindow())) {
      const chained = await runScheduledSync("FIXTURES", { source: "cron" });
      if (!chained.ok) {
        console.error("[cron/sync] chained FIXTURES after RESULTS failed", {
          error: chained.error,
        });
      }
    }

    // Best-effort: sync/scoring already persisted. Cache revalidation must not
    // fail the run (and `next/cache` helpers can throw in a Route Handler).
    if (scope !== "CLEANUP") {
      try {
        revalidateResultViews({ adminDashboard: true });
      } catch (error) {
        console.error("[cron/sync] revalidateResultViews failed", error);
      }
      // Unit 58: push to live viewers AFTER the cache is invalidated so their
      // router.refresh() reads fresh data. Self-handles its own errors.
      await broadcastResultsUpdated();
    }

    return NextResponse.json({ ok: true, scope });
  } catch (error) {
    console.error("[cron/sync] unhandled error", { scope, error });
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json({ ok: false, scope, error: message }, { status: 500 });
  }
}
