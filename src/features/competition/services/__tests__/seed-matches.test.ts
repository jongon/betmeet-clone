import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFetch } = vi.hoisted(() => ({ mockFetch: vi.fn() }));

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

vi.mock("../providers/football-data", () => ({
  FootballDataProvider: class {
    fetch = mockFetch;
  },
}));

vi.mock("../sync-orchestrator", () => ({
  runCompetitionSync: vi.fn(),
}));

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { seedMatchesFromFootballData } from "../seed-matches";
import { runCompetitionSync } from "../sync-orchestrator";

const apiPayload = {
  teams: [],
  matches: [
    {
      providerMatchId: "501",
      matchNumber: null,
      phaseName: "Group A",
      kickoffAt: "2026-06-20T18:00:00.000Z",
      status: "SCHEDULED" as const,
      homeFifaCode: "MEX",
      awayFifaCode: "CAN",
      homePlaceholder: null,
      awayPlaceholder: null,
      homeScore: null,
      awayScore: null,
    },
  ],
  providerRequestId: "req-1",
};

describe("seedMatchesFromFootballData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("fetches from football-data.org (scope FULL), refreshes the snapshot, and persists", async () => {
    mockFetch.mockResolvedValue(apiPayload);

    await seedMatchesFromFootballData();

    expect(mockFetch).toHaveBeenCalledWith("FULL", { windowKey: "seed-full" });
    expect(readFile).not.toHaveBeenCalled();
    expect(mkdir).toHaveBeenCalledTimes(1);
    expect(writeFile).toHaveBeenCalledTimes(1);

    const written = JSON.parse(vi.mocked(writeFile).mock.calls[0][1] as string);
    expect(written.matches).toHaveLength(1);
    expect(typeof written.fetchedAt).toBe("string");

    expect(runCompetitionSync).toHaveBeenCalledTimes(1);
    const [provider, scope, window] = vi.mocked(runCompetitionSync).mock.calls[0];
    expect(scope).toBe("FULL");
    expect(window).toEqual({ windowKey: "seed-full" });
    await expect(provider.fetch("FULL", window)).resolves.toEqual(apiPayload);
  });

  it("falls back to the committed snapshot when the API fails", async () => {
    mockFetch.mockRejectedValue(new Error("FOOTBALL_DATA_KEY_MISSING"));
    vi.mocked(readFile).mockResolvedValue(
      JSON.stringify({ ...apiPayload, fetchedAt: "2026-06-10T00:00:00.000Z" }),
    );

    await seedMatchesFromFootballData();

    expect(writeFile).not.toHaveBeenCalled();
    expect(runCompetitionSync).toHaveBeenCalledTimes(1);
    const [provider] = vi.mocked(runCompetitionSync).mock.calls[0];
    const resolved = await provider.fetch("FULL", { windowKey: "seed-full" });
    expect(resolved.matches).toHaveLength(1);
  });

  it("throws when the API fails and there is no snapshot fallback", async () => {
    mockFetch.mockRejectedValue(new Error("RATE_LIMIT"));
    vi.mocked(readFile).mockRejectedValue(new Error("ENOENT"));

    await expect(seedMatchesFromFootballData()).rejects.toThrow(/no snapshot fallback/);
    expect(runCompetitionSync).not.toHaveBeenCalled();
  });
});
