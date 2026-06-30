// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MatchView, PoolMemberPrediction, PoolMemberSummary } from "../../types";

vi.mock("@/i18n/dictionary-provider", () => ({
  useDictionary: () => ({
    pools: {
      predictions: {
        tab: "Predicciones",
        memberHeader: "Miembro",
        noPrediction: "—",
        pendingScore: "—",
        emptyTitle: "Aún no hay predicciones disponibles",
        emptyDescription: "Las predicciones serán visibles cuando comiencen los partidos.",
        overrideBadge: "Ajustada",
        useGlobalPrediction: "Usar predicción global",
        usingGlobalToast: "Usando tu predicción global",
        saveForThisPool: "Guardar para esta liga",
        overrideSaved: "Predicción guardada para esta liga",
        pageIndicator: "Página {current} de {total}",
        hiddenUntilKickoff: "Oculta hasta el inicio",
        notInPoolYet: "Aún no estaba en la liga",
        kickoffReachedModal: "El partido ya comenzó.",
      },
      liveNow: {
        title: "En vivo ahora",
        viewInPredictions: "Ver en Predicciones",
      },
    },
    competition: {
      scheduled: "Programado",
      locked: "Bloqueado",
      live: "En vivo",
      finished: "Finalizado",
      postponed: "Pospuesto",
      cancelled: "Cancelado",
    },
  }),
  useLocale: () => "es",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock("@/features/predictions/actions/save-prediction", () => ({
  savePrediction: vi.fn(),
}));
vi.mock("@/features/predictions/actions/reset-prediction-override", () => ({
  resetPredictionOverride: vi.fn(),
}));

import { PoolLiveNowBanner } from "../pool-live-now-banner";

const teamView = (fifaCode: string) =>
  ({
    id: `t-${fifaCode}`,
    name: `Team ${fifaCode}`,
    fifaCode,
    flagPath: `/flags/${fifaCode.toLowerCase()}.svg`,
  }) as NonNullable<PoolMemberPrediction["homeTeam"]>;

const members: PoolMemberSummary[] = [
  {
    userId: "user-1",
    nickname: "Alice#1234",
    avatarUrl: "",
    isOwner: true,
    joinedAt: "2026-06-01T00:00:00Z",
  },
  {
    userId: "user-2",
    nickname: "Bob#5678",
    avatarUrl: null,
    isOwner: false,
    joinedAt: "2026-06-01T00:00:00Z",
  },
];

const liveMatch: MatchView = {
  matchId: "m-live",
  matchNumber: 10,
  kickoffAt: "2026-06-23T18:00:00Z",
  matchStatus: "LIVE",
  homeTeam: teamView("BRA"),
  awayTeam: teamView("ARG"),
  homePlaceholder: null,
  awayPlaceholder: null,
  homeScore: 1,
  awayScore: 0,
  homePenaltyScore: null,
  awayPenaltyScore: null,
  phaseName: "Grupo A",
  phaseType: "GROUP",
};

const finishedMatch: MatchView = {
  ...liveMatch,
  matchId: "m-finished",
  matchStatus: "FINISHED",
};

const makePrediction = (overrides: Partial<PoolMemberPrediction> = {}): PoolMemberPrediction =>
  ({
    matchId: "m-live",
    matchNumber: 10,
    kickoffAt: "2026-06-23T18:00:00Z",
    matchStatus: "LIVE",
    homeTeam: teamView("BRA"),
    awayTeam: teamView("ARG"),
    homePlaceholder: null,
    awayPlaceholder: null,
    homeScore: 1,
    awayScore: 0,
    phaseName: "Grupo A",
    phaseType: "GROUP",
    userId: "user-1",
    nickname: "Alice#1234",
    avatarUrl: null,
    predictedHome: 2,
    predictedAway: 1,
    totalPoints: null,
    matchedCase: null,
    isOverride: false,
    hasGlobal: false,
    hidden: false,
    ...overrides,
  }) as PoolMemberPrediction;

describe("PoolLiveNowBanner (Unit 61)", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("renders nothing when there are no LIVE matches", () => {
    const { container } = render(
      <PoolLiveNowBanner
        liveMatches={[]}
        predictions={[]}
        matches={[finishedMatch]}
        members={members}
      />,
    );
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId("pool-live-now-banner")).toBeNull();
  });

  it("renders the banner with title, live score and LIVE badge when a match is LIVE", () => {
    const pred = makePrediction({ userId: "user-1" });
    render(
      <PoolLiveNowBanner
        liveMatches={[liveMatch]}
        predictions={[pred]}
        matches={[liveMatch]}
        members={members}
      />,
    );
    expect(screen.queryByTestId("pool-live-now-banner")).not.toBeNull();
    expect(screen.getByText("En vivo ahora")).toBeDefined();
    expect(screen.getByText("1 - 0")).toBeDefined();
  });

  it("shows each member's prediction (override ?? global) with points pending while LIVE", () => {
    const pred1 = makePrediction({ userId: "user-1", predictedHome: 2, predictedAway: 1 });
    const pred2 = makePrediction({
      userId: "user-2",
      predictedHome: 3,
      predictedAway: 3,
      isOverride: true,
    });
    render(
      <PoolLiveNowBanner
        liveMatches={[liveMatch]}
        predictions={[pred1, pred2]}
        matches={[liveMatch]}
        members={members}
      />,
    );
    // Alice predicted 2-1, Bob predicted 3-3 (override)
    expect(screen.getByText("2 - 1")).toBeDefined();
    expect(screen.getByText("3 - 3")).toBeDefined();
    // Points pending while LIVE → "—" (pendingScore)
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("shows the pre-join state for a member who joined after the match kicked off", () => {
    const lateMember: PoolMemberSummary = {
      userId: "user-late",
      nickname: "Late#9999",
      avatarUrl: null,
      isOwner: false,
      joinedAt: "2026-06-24T00:00:00Z", // after kickoff 2026-06-23T18:00
    };
    const pred = makePrediction({ userId: "user-1" });
    render(
      <PoolLiveNowBanner
        liveMatches={[liveMatch]}
        predictions={[pred]}
        matches={[liveMatch]}
        members={[members[0], lateMember]}
      />,
    );
    expect(screen.getByText("Aún no estaba en la liga")).toBeDefined();
  });

  it("renders a CTA 'Ver en Predicciones' for each live match", () => {
    const pred = makePrediction({ userId: "user-1" });
    render(
      <PoolLiveNowBanner
        liveMatches={[liveMatch]}
        predictions={[pred]}
        matches={[liveMatch]}
        members={members}
      />,
    );
    expect(screen.queryByTestId("pool-live-now-cta-m-live")).not.toBeNull();
    expect(screen.getByText("Ver en Predicciones")).toBeDefined();
  });
});
