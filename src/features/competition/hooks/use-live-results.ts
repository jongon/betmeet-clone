"use client";

import { useRouter } from "next/navigation";
import { startTransition, useEffect } from "react";
import {
  LIVE_RESULTS_CHANNEL,
  RESULTS_UPDATED_EVENT,
} from "@/features/competition/live-results-channel";
import { createClient } from "@/lib/supabase/client";

/** Coalesce broadcast bursts and let the server-side cache invalidation land. */
const REFRESH_DEBOUNCE_MS = 1000;

/**
 * Subscribes to the live-results Realtime broadcast and refreshes the current
 * route when a match result changes server-side (Unit 58). Used by `/matches`
 * and the `/pools` predictions view so scores and points update without a
 * manual refresh.
 *
 * It calls `router.refresh()` (debounced) instead of patching client state: the
 * broadcast carries no result payload and the server already recomputed
 * scores/points, so re-rendering the server components is the source of truth.
 * The result-view cache tag is invalidated just before the broadcast is sent
 * (`revalidateResultViews` → `broadcastResultsUpdated`), so the refresh reads
 * fresh data instead of the stale tag.
 */
export function useLiveResults(): void {
  const router = useRouter();

  useEffect(() => {
    // Skip silently if the Supabase public env isn't configured (e.g. tests):
    // live updates are an enhancement, never a hard dependency of the view.
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    const channel = supabase.channel(LIVE_RESULTS_CHANNEL);
    let timer: ReturnType<typeof setTimeout> | null = null;

    channel
      .on("broadcast", { event: RESULTS_UPDATED_EVENT }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          startTransition(() => router.refresh());
        }, REFRESH_DEBOUNCE_MS);
      })
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [router]);
}
