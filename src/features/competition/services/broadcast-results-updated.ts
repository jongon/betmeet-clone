import {
  LIVE_RESULTS_CHANNEL,
  RESULTS_UPDATED_EVENT,
} from "@/features/competition/live-results-channel";

/**
 * Live results push (Unit 58). Once a result mutation has invalidated the
 * Next.js cache (see `revalidateResultViews`), this signals subscribed browsers
 * over Supabase Realtime so `/matches` and the `/pools` predictions view update
 * without a manual refresh.
 *
 * It uses the Realtime *Broadcast REST* endpoint rather than an open socket:
 * the app runs on Vercel serverless, where a function cannot hold a Realtime
 * connection, and a single POST after the sync is enough. The message carries
 * no result data — the client re-fetches via `router.refresh()`, reusing the
 * server's scoring/points. Crucially, callers must invalidate the cache BEFORE
 * calling this so the refresh reads fresh data (pairs with Unit 52).
 *
 * Best-effort by design: a Realtime hiccup must never break the sync/scoring
 * path, so missing config and any network/HTTP failure are swallowed.
 */
export async function broadcastResultsUpdated(): Promise<void> {
  // Defensive: this uses the service_role key and must never run client-side.
  if (typeof window !== "undefined") return;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return;

  try {
    const response = await fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        messages: [
          {
            topic: LIVE_RESULTS_CHANNEL,
            event: RESULTS_UPDATED_EVENT,
            payload: { at: Date.now() },
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("[broadcastResultsUpdated] non-OK response", response.status);
    }
  } catch (error) {
    console.error("[broadcastResultsUpdated] failed", error);
  }
}
