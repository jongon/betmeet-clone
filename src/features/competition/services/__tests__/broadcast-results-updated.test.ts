import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LIVE_RESULTS_CHANNEL,
  RESULTS_UPDATED_EVENT,
} from "@/features/competition/live-results-channel";
import { broadcastResultsUpdated } from "../broadcast-results-updated";

describe("broadcastResultsUpdated (Unit 58)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("POSTs a results-updated broadcast to the Realtime endpoint", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://proj.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 202 }));

    await broadcastResultsUpdated();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://proj.supabase.co/realtime/v1/api/broadcast");
    expect(init.method).toBe("POST");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer service-key");
    expect(headers.apikey).toBe("service-key");
    const body = JSON.parse(init.body as string);
    expect(body.messages[0].topic).toBe(LIVE_RESULTS_CHANNEL);
    expect(body.messages[0].event).toBe(RESULTS_UPDATED_EVENT);
  });

  it("is a no-op when Supabase env is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await broadcastResultsUpdated();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("swallows a non-OK response without throwing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://proj.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 500 }));

    await expect(broadcastResultsUpdated()).resolves.toBeUndefined();
  });

  it("swallows a network error without throwing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://proj.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("boom"));

    await expect(broadcastResultsUpdated()).resolves.toBeUndefined();
  });
});
