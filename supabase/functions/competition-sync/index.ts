// Supabase Edge Function scaffold for Unit 4 competition sync.
// The production implementation should call the shared sync orchestrator or an
// equivalent Deno-compatible wrapper during code hardening.
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
