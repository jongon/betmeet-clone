import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    match: { findUnique: vi.fn() },
    prediction: { upsert: vi.fn(), updateMany: vi.fn() },
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/features/profile/queries", () => ({
  getOnboardedUserId: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { getOnboardedUserId } from "@/features/profile/queries";
import { prisma } from "@/lib/prisma";
import { savePrediction } from "../../actions/save-prediction";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const MATCH_ID = "22222222-2222-4222-8222-222222222222";
const HOME_TEAM = "33333333-3333-4333-8333-333333333333";
const AWAY_TEAM = "44444444-4444-4444-8444-444444444444";
const FUTURE_KICKOFF = new Date(Date.now() + 86400000);

function mockMatch(overrides: Record<string, unknown> = {}) {
  return {
    id: MATCH_ID,
    homeTeam: { id: HOME_TEAM },
    awayTeam: { id: AWAY_TEAM },
    kickoffAt: FUTURE_KICKOFF,
    status: "SCHEDULED",
    phase: { type: "GROUP" },
    predictions: [],
    ...overrides,
  };
}

function stubAuth(userId: string | null) {
  vi.mocked(getOnboardedUserId).mockResolvedValue(userId);
}

describe("savePrediction", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when user is not onboarded", async () => {
    stubAuth(null);
    const result = await savePrediction({
      matchId: MATCH_ID,
      homeScore: 2,
      awayScore: 1,
      penaltyWinnerTeamId: null,
    });
    expect(result).toEqual({ error: "Completa tu perfil para predecir." });
  });

  it("creates a new prediction", async () => {
    stubAuth(USER_ID);
    vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatch() as never);
    vi.mocked(prisma.prediction.upsert).mockResolvedValue({ id: "pred-1" } as never);

    const result = await savePrediction({
      matchId: MATCH_ID,
      homeScore: 2,
      awayScore: 1,
      penaltyWinnerTeamId: null,
    });

    expect(result).toEqual({ success: true });
    expect(prisma.prediction.upsert).toHaveBeenCalledTimes(1);
  });

  it("updates an existing unlocked prediction", async () => {
    stubAuth(USER_ID);
    vi.mocked(prisma.match.findUnique).mockResolvedValue(
      mockMatch({
        predictions: [{ id: "pred-1", homeScore: 1, awayScore: 0, lockedAt: null }],
      }) as never,
    );
    vi.mocked(prisma.prediction.upsert).mockResolvedValue({ id: "pred-1" } as never);

    const result = await savePrediction({
      matchId: MATCH_ID,
      homeScore: 1,
      awayScore: 2,
      penaltyWinnerTeamId: null,
    });

    expect(result).toEqual({ success: true });
  });

  it("rejects save after kickoff and locks existing prediction", async () => {
    stubAuth(USER_ID);
    const pastKickoff = new Date(Date.now() - 3600000);
    vi.mocked(prisma.match.findUnique).mockResolvedValue(
      mockMatch({
        kickoffAt: pastKickoff,
        predictions: [{ id: "pred-1", homeScore: 1, awayScore: 0, lockedAt: null }],
      }) as never,
    );
    vi.mocked(prisma.prediction.updateMany).mockResolvedValue({ count: 1 } as never);

    const result = await savePrediction({
      matchId: MATCH_ID,
      homeScore: 2,
      awayScore: 2,
      penaltyWinnerTeamId: null,
    });

    expect("error" in result).toBe(true);
    expect(prisma.prediction.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER_ID, matchId: MATCH_ID, lockedAt: null },
        data: expect.objectContaining({ lockReason: "KICKOFF_REACHED" }),
      }),
    );
  });

  it("rejects save after kickoff with no existing prediction and does not create one", async () => {
    stubAuth(USER_ID);
    vi.mocked(prisma.match.findUnique).mockResolvedValue(
      mockMatch({ kickoffAt: new Date(Date.now() - 3600000) }) as never,
    );

    const result = await savePrediction({
      matchId: MATCH_ID,
      homeScore: 2,
      awayScore: 1,
      penaltyWinnerTeamId: null,
    });

    expect("error" in result).toBe(true);
    expect(prisma.prediction.upsert).not.toHaveBeenCalled();
  });

  it("rejects update to an already-locked prediction", async () => {
    stubAuth(USER_ID);
    vi.mocked(prisma.match.findUnique).mockResolvedValue(
      mockMatch({
        kickoffAt: new Date(Date.now() - 3600000),
        predictions: [
          {
            id: "pred-1",
            homeScore: 1,
            awayScore: 0,
            lockedAt: new Date(),
            lockReason: "KICKOFF_REACHED",
          },
        ],
      }) as never,
    );

    const result = await savePrediction({
      matchId: MATCH_ID,
      homeScore: 2,
      awayScore: 2,
      penaltyWinnerTeamId: null,
    });

    expect("error" in result).toBe(true);
    expect(prisma.prediction.upsert).not.toHaveBeenCalled();
  });

  it("rejects validation errors server-side", async () => {
    stubAuth(USER_ID);
    vi.mocked(prisma.match.findUnique).mockResolvedValue(mockMatch() as never);

    const result = await savePrediction({
      matchId: MATCH_ID,
      homeScore: 25,
      awayScore: 1,
      penaltyWinnerTeamId: null,
    });

    expect("error" in result).toBe(true);
    expect(prisma.prediction.upsert).not.toHaveBeenCalled();
  });

  it("saves knockout draw with penalty winner", async () => {
    stubAuth(USER_ID);
    vi.mocked(prisma.match.findUnique).mockResolvedValue(
      mockMatch({ phase: { type: "KNOCKOUT" } }) as never,
    );
    vi.mocked(prisma.prediction.upsert).mockResolvedValue({ id: "pred-2" } as never);

    const result = await savePrediction({
      matchId: MATCH_ID,
      homeScore: 1,
      awayScore: 1,
      penaltyWinnerTeamId: HOME_TEAM,
    });

    expect(result).toEqual({ success: true });
  });
});
