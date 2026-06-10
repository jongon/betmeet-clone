// Supabase Edge Function scaffold for Unit 4 competition sync.
// The production implementation should call the shared sync orchestrator or an
// equivalent Deno-compatible wrapper during code hardening.
//
// Unit 6 integration (sweeper post-sync): after a successful results sync, the
// composition root must invoke the scoring sweeper
// `scoreFinishedUnscoredMatches()` (src/features/scoring-rankings/services/
// score-sweeper.ts) so finished matches are scored (US-5.1, BR-6.8). Kept out
// of the pure sync orchestrator to avoid Unit 4 → Unit 6 coupling.
declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

Deno.serve(async (request) => {
  const secret = Deno.env.get("SYNC_TRIGGER_SECRET");
  if (secret) {
    const provided = request.headers.get("x-sync-secret");
    if (provided !== secret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
  }

  return new Response(JSON.stringify({ ok: true, message: "competition-sync scaffold" }), {
    headers: { "content-type": "application/json" },
  });
});
