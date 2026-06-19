import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { runScheduledSync, hasActiveMatchWindow } = vi.hoisted(() => ({
  runScheduledSync: vi.fn(),
  hasActiveMatchWindow: vi.fn(),
}));
vi.mock("@/features/competition/services/run-scheduled-sync", () => ({
  runScheduledSync,
  hasActiveMatchWindow,
}));
vi.mock("@/features/admin/services/revalidate-result-views", () => ({
  revalidateResultViews: vi.fn(),
}));

import { revalidateResultViews } from "@/features/admin/services/revalidate-result-views";
import { POST } from "../route";

const SECRET = "test-secret";

function req(scope?: string, secret?: string) {
  const url = scope
    ? `http://localhost/api/cron/sync?scope=${scope}`
    : "http://localhost/api/cron/sync";
  return new Request(url, {
    method: "POST",
    headers: secret ? { "x-sync-secret": secret } : {},
  });
}

describe("POST /api/cron/sync (Unit 50)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SYNC_TRIGGER_SECRET = SECRET;
    runScheduledSync.mockResolvedValue({ ok: true });
    hasActiveMatchWindow.mockResolvedValue(true);
  });

  afterEach(() => {
    process.env.SYNC_TRIGGER_SECRET = undefined;
  });

  it("returns 401 when the secret is missing or wrong", async () => {
    const res = await POST(req("RESULTS", "nope"));
    expect(res.status).toBe(401);
    expect(runScheduledSync).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid or missing scope", async () => {
    const bad = await POST(req("TEAMS", SECRET));
    expect(bad.status).toBe(400);

    const missing = await POST(req(undefined, SECRET));
    expect(missing.status).toBe(400);
    expect(runScheduledSync).not.toHaveBeenCalled();
  });

  it("runs the sync and revalidates for a valid scope", async () => {
    const res = await POST(req("RESULTS", SECRET));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, scope: "RESULTS" });
    expect(runScheduledSync).toHaveBeenCalledWith("RESULTS", { source: "cron" });
    expect(revalidateResultViews).toHaveBeenCalledWith({ adminDashboard: true });
  });

  it("skips LIVE_STATUS when no match is live or imminent", async () => {
    hasActiveMatchWindow.mockResolvedValue(false);

    const res = await POST(req("LIVE_STATUS", SECRET));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, scope: "LIVE_STATUS", skipped: true });
    expect(runScheduledSync).not.toHaveBeenCalled();
  });

  it("does not revalidate result views for CLEANUP", async () => {
    const res = await POST(req("CLEANUP", SECRET));

    expect(res.status).toBe(200);
    expect(runScheduledSync).toHaveBeenCalledWith("CLEANUP", { source: "cron" });
    expect(revalidateResultViews).not.toHaveBeenCalled();
  });

  it("surfaces sync failures as 502", async () => {
    runScheduledSync.mockResolvedValue({ ok: false, error: "boom" });

    const res = await POST(req("FIXTURES", SECRET));

    expect(res.status).toBe(502);
    await expect(res.json()).resolves.toEqual({ ok: false, scope: "FIXTURES", error: "boom" });
  });
});
