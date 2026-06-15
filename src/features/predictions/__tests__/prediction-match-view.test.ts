import { describe, expect, it, vi } from "vitest";
import type { MatchView } from "@/features/competition/types";

// `../queries` transitively imports `@/lib/prisma` (which instantiates a client at
// module load). `toPredictionMatchView` is pure and never touches the DB, so an
// empty prisma mock keeps the import side-effect-free in the test environment.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { toPredictionMatchView } from "../queries";

const NOW = new Date("2026-06-14T12:00:00Z");

function matchView(overrides: Partial<MatchView> = {}): MatchView {
  return {
    id: "match-1",
    matchNumber: 1,
    kickoffAt: "2026-06-20T16:00:00Z", // future relative to NOW
    status: "SCHEDULED",
    homeTeam: { id: "home", name: "Home", fifaCode: "HOM", flagPath: "/flags/hom.svg" },
    awayTeam: { id: "away", name: "Away", fifaCode: "AWY", flagPath: "/flags/awy.svg" },
    homePlaceholder: null,
    awayPlaceholder: null,
    homeScore: null,
    awayScore: null,
    homePenaltyScore: null,
    awayPenaltyScore: null,
    ...overrides,
  };
}

describe("toPredictionMatchView", () => {
  it("is editable with no prediction for a future group match", () => {
    const view = toPredictionMatchView(matchView(), null, "GROUP", NOW);

    expect(view.prediction).toBeNull();
    expect(view.canEdit).toBe(true);
    expect(view.lockReason).toBeNull();
    expect(view.showPenaltySelector).toBe(false);
    expect(view.points).toBeNull();
    expect(view.pointsStatus).toBe("NOT_SCORED");
    expect(view.phaseType).toBe("GROUP");
  });

  it("shows the penalty selector for an editable knockout match", () => {
    const view = toPredictionMatchView(matchView(), null, "KNOCKOUT", NOW);

    expect(view.showPenaltySelector).toBe(true);
  });

  it("locks a match whose kickoff has passed", () => {
    const view = toPredictionMatchView(
      matchView({ kickoffAt: "2026-06-10T16:00:00Z" }), // before NOW
      null,
      "GROUP",
      NOW,
    );

    expect(view.canEdit).toBe(false);
    expect(view.lockReason).toBe("KICKOFF_REACHED");
  });

  it("resolves points and breakdown from the persisted score", () => {
    const view = toPredictionMatchView(
      matchView({ status: "FINISHED" }),
      {
        id: "pred-1",
        matchId: "match-1",
        homeScore: 2,
        awayScore: 1,
        penaltyWinnerTeamId: null,
        lockedAt: new Date("2026-06-20T16:00:00Z"),
        lockReason: "KICKOFF_REACHED",
        score: {
          matchedCase: "EXACT",
          basePoints: 5,
          penaltyApplied: false,
          penaltyPoints: 0,
          totalPoints: 5,
        },
      },
      "GROUP",
      NOW,
    );

    expect(view.prediction).toMatchObject({ id: "pred-1", homeScore: 2, awayScore: 1 });
    expect(view.points).toBe(5);
    expect(view.pointsStatus).toBe("SCORED");
    expect(view.breakdown?.matchedCase).toBe("EXACT");
    // A locked prediction is never editable, regardless of eligibility.
    expect(view.canEdit).toBe(false);
    expect(view.lockReason).toBe("KICKOFF_REACHED");
  });
});
