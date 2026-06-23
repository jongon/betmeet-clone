// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MatchView, PoolMemberSummary } from "../../types";

vi.mock("@/features/competition/hooks/use-live-results", () => ({
  useLiveResults: vi.fn(),
}));

vi.mock("@/i18n/dictionary-provider", () => ({
  useDictionary: () => ({
    pools: {
      ranking: "Ranking",
      members: "Miembros",
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

const pushMock = vi.fn();
const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/features/predictions/actions/save-prediction", () => ({
  savePrediction: vi.fn(),
}));
vi.mock("@/features/predictions/actions/reset-prediction-override", () => ({
  resetPredictionOverride: vi.fn(),
}));

import { useLiveResults } from "@/features/competition/hooks/use-live-results";
import { PoolDetailTabs } from "../pool-detail-tabs";

const members: PoolMemberSummary[] = [
  {
    userId: "user-1",
    nickname: "Alice#1234",
    avatarUrl: "",
    isOwner: true,
    joinedAt: "2026-06-01T00:00:00Z",
  },
];

const liveMatch: MatchView = {
  matchId: "m-live",
  matchNumber: 10,
  kickoffAt: "2026-06-23T18:00:00Z",
  matchStatus: "LIVE",
  homeTeam: {
    id: "t-bra",
    name: "Brazil",
    fifaCode: "BRA",
    flagPath: "/flags/br.svg",
  },
  awayTeam: {
    id: "t-arg",
    name: "Argentina",
    fifaCode: "ARG",
    flagPath: "/flags/ar.svg",
  },
  homePlaceholder: null,
  awayPlaceholder: null,
  homeScore: 1,
  awayScore: 0,
  phaseName: "Grupo A",
  phaseType: "GROUP",
};

describe("PoolDetailTabs (Unit 61)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => cleanup());

  it("mounts useLiveResults once (single Realtime subscription for all tabs)", () => {
    render(
      <PoolDetailTabs
        liveMatches={[]}
        predictions={[]}
        matches={[]}
        members={members}
        initialTab={undefined}
        rankingContent={<div>ranking</div>}
        predictionsContent={<div>predictions</div>}
        membersContent={<div>members</div>}
        aside={<div>sidebar</div>}
      />,
    );
    expect(useLiveResults).toHaveBeenCalledTimes(1);
  });

  it("defaults to the 'ranking' tab when no ?tab and no initialTab", () => {
    render(
      <PoolDetailTabs
        liveMatches={[]}
        predictions={[]}
        matches={[]}
        members={members}
        initialTab={undefined}
        rankingContent={<div>ranking-content</div>}
        predictionsContent={<div>predictions-content</div>}
        membersContent={<div>members-content</div>}
        aside={<div>sidebar</div>}
      />,
    );
    expect(screen.getByText("ranking-content")).toBeDefined();
  });

  it("shows the live banner when there are LIVE matches", () => {
    render(
      <PoolDetailTabs
        liveMatches={[liveMatch]}
        predictions={[]}
        matches={[liveMatch]}
        members={members}
        initialTab="ranking"
        rankingContent={<div>ranking</div>}
        predictionsContent={<div>predictions</div>}
        membersContent={<div>members</div>}
        aside={<div>sidebar</div>}
      />,
    );
    expect(screen.queryByTestId("pool-live-now-banner")).not.toBeNull();
  });

  it("does not show the banner when there are no LIVE matches", () => {
    render(
      <PoolDetailTabs
        liveMatches={[]}
        predictions={[]}
        matches={[]}
        members={members}
        initialTab="ranking"
        rankingContent={<div>ranking</div>}
        predictionsContent={<div>predictions</div>}
        membersContent={<div>members</div>}
        aside={<div>sidebar</div>}
      />,
    );
    expect(screen.queryByTestId("pool-live-now-banner")).toBeNull();
  });
});
