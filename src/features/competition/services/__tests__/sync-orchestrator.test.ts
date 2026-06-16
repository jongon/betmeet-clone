import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    providerSyncRun: { upsert: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    team: { upsert: vi.fn(), findUnique: vi.fn() },
    competition: { findFirst: vi.fn() },
    competitionPhase: { findMany: vi.fn() },
    match: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/features/notifications/services/match-events", () => ({
  emitMatchNotificationEvents: vi.fn(),
}));

import { emitMatchNotificationEvents } from "@/features/notifications/services/match-events";
import { prisma } from "@/lib/prisma";
import { cleanupOldSyncRuns, runCompetitionSync } from "../sync-orchestrator";

const scheduledMatch = {
  providerMatchId: "101",
  matchNumber: 1,
  phaseName: "Group A",
  kickoffAt: "2026-06-20T18:00:00Z",
  status: "SCHEDULED" as const,
  homeFifaCode: "MEX",
  awayFifaCode: "CAN",
  homePlaceholder: null,
  awayPlaceholder: null,
};

const finishedMatch = {
  ...scheduledMatch,
  providerMatchId: "102",
  status: "FINISHED" as const,
  homeScore: 2,
  awayScore: 1,
};

function setupBaseRun() {
  vi.mocked(prisma.providerSyncRun.upsert).mockResolvedValue({ id: "run-1" } as never);
  vi.mocked(prisma.providerSyncRun.update).mockResolvedValue({} as never);
  vi.mocked(prisma.team.upsert).mockResolvedValue({} as never);
  vi.mocked(prisma.team.findUnique).mockResolvedValue(null);
}

describe("sync orchestrator", () => {
  beforeEach(() => vi.clearAllMocks());

  it("validates and persists normalized teams", async () => {
    setupBaseRun();
    vi.mocked(prisma.competition.findFirst).mockResolvedValue(null);

    const provider = {
      fetch: vi.fn().mockResolvedValue({
        teams: [
          {
            name: "Canada",
            fifaCode: "CAN",
            isoAlpha2: "ca",
            flagKey: "ca",
            flagPath: "/flags/ca.svg",
            providerTeamId: null,
          },
        ],
        matches: [],
      }),
    };

    await runCompetitionSync(provider, "FIXTURES", { windowKey: "test" });

    expect(prisma.team.upsert).toHaveBeenCalled();
    expect(prisma.providerSyncRun.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "SUCCESS" }) }),
    );
  });

  it("creates a SCHEDULED match that does not exist", async () => {
    setupBaseRun();
    vi.mocked(prisma.competition.findFirst).mockResolvedValue({ id: "comp-1" } as never);
    vi.mocked(prisma.competitionPhase.findMany).mockResolvedValue([
      { id: "phase-1", name: "Group A" },
    ] as never);
    vi.mocked(prisma.match.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.match.create).mockResolvedValue({} as never);

    const provider = {
      fetch: vi.fn().mockResolvedValue({ teams: [], matches: [scheduledMatch] }),
    };

    await runCompetitionSync(provider, "FIXTURES", { windowKey: "test" });

    expect(prisma.match.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          providerMatchId: "101",
          status: "SCHEDULED",
          phaseId: "phase-1",
          matchNumber: null,
        }),
      }),
    );
    expect(prisma.providerSyncRun.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ itemsUpdated: 1 }) }),
    );
  });

  it("updates an existing match by providerMatchId", async () => {
    setupBaseRun();
    const existingMatch = { id: "match-1", homeTeam: null, awayTeam: null };
    vi.mocked(prisma.competition.findFirst).mockResolvedValue({ id: "comp-1" } as never);
    vi.mocked(prisma.competitionPhase.findMany).mockResolvedValue([
      { id: "phase-1", name: "Group A" },
    ] as never);
    vi.mocked(prisma.match.findFirst).mockResolvedValue(existingMatch as never);
    vi.mocked(prisma.match.update).mockResolvedValue({
      ...existingMatch,
      status: "FINISHED",
      homeScore: 2,
      awayScore: 1,
    } as never);

    const provider = {
      fetch: vi.fn().mockResolvedValue({ teams: [], matches: [finishedMatch] }),
    };

    await runCompetitionSync(provider, "RESULTS", { windowKey: "test" });

    expect(prisma.match.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "match-1" },
        data: expect.objectContaining({ status: "FINISHED", homeScore: 2, awayScore: 1 }),
      }),
    );
    expect(prisma.match.create).not.toHaveBeenCalled();
    expect(prisma.providerSyncRun.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ itemsUpdated: 1 }) }),
    );
  });

  it("skips a FINISHED match that does not exist in the DB", async () => {
    setupBaseRun();
    vi.mocked(prisma.competition.findFirst).mockResolvedValue({ id: "comp-1" } as never);
    vi.mocked(prisma.competitionPhase.findMany).mockResolvedValue([
      { id: "phase-1", name: "Group A" },
    ] as never);
    vi.mocked(prisma.match.findFirst).mockResolvedValue(null);

    const provider = {
      fetch: vi.fn().mockResolvedValue({ teams: [], matches: [finishedMatch] }),
    };

    await runCompetitionSync(provider, "RESULTS", { windowKey: "test" });

    expect(prisma.match.create).not.toHaveBeenCalled();
    expect(prisma.match.update).not.toHaveBeenCalled();
    expect(prisma.providerSyncRun.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ itemsUpdated: 0 }) }),
    );
  });

  it("skips a match when its phase is not found and continues with others", async () => {
    setupBaseRun();
    const scheduledMatch2 = { ...scheduledMatch, providerMatchId: "103", phaseName: "Group B" };
    vi.mocked(prisma.competition.findFirst).mockResolvedValue({ id: "comp-1" } as never);
    vi.mocked(prisma.competitionPhase.findMany).mockResolvedValue([
      { id: "phase-2", name: "Group B" },
    ] as never);
    vi.mocked(prisma.match.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.match.create).mockResolvedValue({} as never);

    const provider = {
      fetch: vi.fn().mockResolvedValue({
        teams: [],
        matches: [scheduledMatch, scheduledMatch2], // "Group A" not in phaseMap
      }),
    };

    await runCompetitionSync(provider, "FIXTURES", { windowKey: "test" });

    expect(prisma.match.create).toHaveBeenCalledTimes(1);
    expect(prisma.match.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ providerMatchId: "103", phaseId: "phase-2" }),
      }),
    );
  });

  it("skips all match sync when competition is not found", async () => {
    setupBaseRun();
    vi.mocked(prisma.competition.findFirst).mockResolvedValue(null);

    const provider = {
      fetch: vi.fn().mockResolvedValue({ teams: [], matches: [scheduledMatch] }),
    };

    await runCompetitionSync(provider, "FIXTURES", { windowKey: "test" });

    expect(prisma.match.create).not.toHaveBeenCalled();
    expect(prisma.match.update).not.toHaveBeenCalled();
    expect(prisma.providerSyncRun.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ itemsUpdated: 0 }) }),
    );
  });

  it("continues match sync when emitMatchNotificationEvents throws", async () => {
    setupBaseRun();
    const existingMatch = { id: "match-1", homeTeam: null, awayTeam: null };
    vi.mocked(prisma.competition.findFirst).mockResolvedValue({ id: "comp-1" } as never);
    vi.mocked(prisma.competitionPhase.findMany).mockResolvedValue([
      { id: "phase-1", name: "Group A" },
    ] as never);
    vi.mocked(prisma.match.findFirst).mockResolvedValue(existingMatch as never);
    vi.mocked(prisma.match.update).mockResolvedValue({ ...existingMatch } as never);
    vi.mocked(emitMatchNotificationEvents).mockRejectedValue(new Error("outbox down"));

    const provider = {
      fetch: vi.fn().mockResolvedValue({ teams: [], matches: [finishedMatch] }),
    };

    await expect(
      runCompetitionSync(provider, "RESULTS", { windowKey: "test" }),
    ).resolves.not.toThrow();
    expect(prisma.providerSyncRun.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "SUCCESS" }) }),
    );
  });

  it("cleans up runs older than 90 days", async () => {
    vi.mocked(prisma.providerSyncRun.deleteMany).mockResolvedValue({ count: 0 });
    await cleanupOldSyncRuns(new Date("2026-06-10T00:00:00Z"));
    expect(prisma.providerSyncRun.deleteMany).toHaveBeenCalled();
  });
});
