import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { match: { findMany: vi.fn() }, providerSyncRun: { findMany: vi.fn() } },
}));
vi.mock("../services/require-admin", () => ({ getAdminUserId: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { getAdminMatches } from "../queries";
import { getAdminUserId } from "../services/require-admin";

function match(overrides: Record<string, unknown>) {
  return {
    id: "match-1",
    homeTeam: null,
    awayTeam: null,
    phase: { type: "GROUP" },
    status: "SCHEDULED",
    homeTeamId: null,
    awayTeamId: null,
    homePlaceholder: null,
    awayPlaceholder: null,
    homeScore: null,
    awayScore: null,
    manualOverride: false,
    overriddenAt: null,
    kickoffAt: null,
    ...overrides,
  };
}

describe("getAdminMatches (Unit 34)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAdminUserId).mockResolvedValue("admin-1");
  });

  it("uses FIFA codes for resolved admin match labels", async () => {
    vi.mocked(prisma.match.findMany).mockResolvedValue([
      match({
        homeTeam: { name: "Brazil", fifaCode: "bra" },
        awayTeam: { name: "Argentina", fifaCode: "ARG" },
        homeTeamId: "team-bra",
        awayTeamId: "team-arg",
      }),
    ] as never);

    const rows = await getAdminMatches();

    expect(rows?.[0]).toMatchObject({
      label: "BRA vs ARG",
      homeTeamLabel: "BRA",
      awayTeamLabel: "ARG",
      homeTeamName: "Brazil",
      awayTeamName: "Argentina",
    });
  });

  it("keeps placeholders for unresolved sides", async () => {
    vi.mocked(prisma.match.findMany).mockResolvedValue([
      match({
        homePlaceholder: "1ro Grupo A",
        awayPlaceholder: "2do Grupo B",
      }),
    ] as never);

    const rows = await getAdminMatches();

    expect(rows?.[0]).toMatchObject({
      label: "1ro Grupo A vs 2do Grupo B",
      homeTeamLabel: "1ro Grupo A",
      awayTeamLabel: "2do Grupo B",
    });
  });
});
