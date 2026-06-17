import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FootballDataProvider } from "../football-data";

const mockMatches = [
  {
    id: 1001,
    utcDate: "2026-06-11T18:00:00Z",
    status: "FINISHED",
    matchday: 1,
    stage: "GROUP_STAGE",
    group: "GROUP_A",
    lastUpdated: "2026-06-11T20:00:00Z",
    homeTeam: { id: 700, name: "Mexico", shortName: "Mexico", tla: "MEX" },
    awayTeam: { id: 800, name: "South Africa", shortName: "S Africa", tla: "RSA" },
    score: {
      winner: "HOME_TEAM",
      duration: "REGULAR",
      fullTime: { home: 2, away: 0 },
      halfTime: { home: 1, away: 0 },
    },
  },
  {
    id: 1002,
    utcDate: "2026-06-15T18:00:00Z",
    status: "SCHEDULED",
    matchday: 2,
    stage: "QUARTER_FINALS",
    group: null,
    lastUpdated: "2026-06-10T12:00:00Z",
    homeTeam: { id: 700, name: "Mexico", shortName: "Mexico", tla: "MEX" },
    awayTeam: { id: 900, name: "Argentina", shortName: "Argentina", tla: "ARG" },
    score: {
      winner: null,
      duration: "REGULAR",
      fullTime: { home: null, away: null },
      halfTime: { home: null, away: null },
    },
  },
];

function mockFetch(status: number, body: unknown, headers?: HeadersInit) {
  return vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(JSON.stringify(body), { status, headers: new Headers(headers) }),
    );
}

describe("FootballDataProvider", () => {
  beforeEach(() => {
    vi.stubEnv("FOOTBALL_DATA_KEY", "test-api-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("throws when FOOTBALL_DATA_KEY is missing", async () => {
    vi.unstubAllEnvs();
    const provider = new FootballDataProvider();
    await expect(provider.fetch("FULL", { windowKey: "test" })).rejects.toThrow(
      "FOOTBALL_DATA_KEY_MISSING",
    );
  });

  it("fetches matches and normalizes them", async () => {
    mockFetch(200, { matches: mockMatches });

    const provider = new FootballDataProvider();
    const result = await provider.fetch("FULL", { windowKey: "test" });

    // Teams are extracted from matches and enriched with canonical data.
    expect(result.teams).toHaveLength(3);
    const teamCodes = result.teams.map((t) => t.fifaCode).sort();
    expect(teamCodes).toEqual(["ARG", "MEX", "RSA"]);
    // Canonical enrichment: Mexico should have flagPath from WORLD_CUP_2026_TEAMS.
    const mexico = result.teams.find((t) => t.fifaCode === "MEX");
    expect(mexico?.name).toBe("Mexico");
    expect(mexico?.flagPath).toBe("/flags/mx.svg");
    expect(mexico?.providerTeamId).toBe("700");

    expect(result.matches).toHaveLength(2);

    const finishedMatch = result.matches[0];
    if (!finishedMatch) throw new Error("expected match");
    expect(finishedMatch.providerMatchId).toBe("1001");
    expect(finishedMatch.status).toBe("FINISHED");
    expect(finishedMatch.homeFifaCode).toBe("MEX");
    expect(finishedMatch.awayFifaCode).toBe("RSA");
    expect(finishedMatch.homeScore).toBe(2);
    expect(finishedMatch.awayScore).toBe(0);
    expect(finishedMatch.phaseName).toBe("Group A");
    expect(finishedMatch.matchNumber).toBe(1);
    expect(finishedMatch.kickoffAt).toBe("2026-06-11T18:00:00Z");

    const scheduledMatch = result.matches[1];
    if (!scheduledMatch) throw new Error("expected match");
    expect(scheduledMatch.status).toBe("SCHEDULED");
    expect(scheduledMatch.homeScore).toBeNull();
    expect(scheduledMatch.awayScore).toBeNull();
    expect(scheduledMatch.phaseName).toBe("Quarter-finals");
    expect(scheduledMatch.homePlaceholder).toBeNull();
    expect(scheduledMatch.awayPlaceholder).toBeNull();
  });

  it("passes scope filter as status parameter", async () => {
    const fetchSpy = mockFetch(200, { matches: [] });

    const provider = new FootballDataProvider();
    await provider.fetch("RESULTS", { windowKey: "test" });

    const url = fetchSpy.mock.calls[0]?.[0] as string;
    expect(url).toContain("status=FINISHED");
    expect(url).toContain("season=2026");
  });

  it("throws RATE_LIMIT on 429", async () => {
    mockFetch(429, { message: "Too many requests" });

    const provider = new FootballDataProvider();
    await expect(provider.fetch("FULL", { windowKey: "test" })).rejects.toThrow("RATE_LIMIT");
  });

  it("throws on other HTTP errors", async () => {
    mockFetch(500, { message: "Internal error" });

    const provider = new FootballDataProvider();
    await expect(provider.fetch("FULL", { windowKey: "test" })).rejects.toThrow(
      "Football Data API error 500",
    );
  });

  it("captures request id from response header", async () => {
    mockFetch(200, { matches: [] }, { "x-request-id": "abc-123" });

    const provider = new FootballDataProvider();
    const result = await provider.fetch("FULL", { windowKey: "test" });

    expect(result.providerRequestId).toBe("abc-123");
  });

  it("includes date range filters from the window", async () => {
    const fetchSpy = mockFetch(200, { matches: [] });

    const provider = new FootballDataProvider();
    await provider.fetch("FULL", {
      windowKey: "test",
      from: new Date("2026-06-10"),
      to: new Date("2026-06-11"),
    });

    const url = fetchSpy.mock.calls[0]?.[0] as string;
    expect(url).toContain("dateFrom=2026-06-10");
    expect(url).toContain("dateTo=2026-06-11");
  });
});
