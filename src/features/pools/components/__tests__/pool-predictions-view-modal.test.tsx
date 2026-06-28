// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MatchView, PoolMemberPrediction, PoolMemberSummary } from "../../types";

vi.mock("@/i18n/dictionary-provider", () => ({
  useDictionary: () => ({
    pools: {
      predictions: {
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
    },
    predictions: {
      decrementHome: "Quitar gol local",
      incrementHome: "Sumar gol local",
      decrementAway: "Quitar gol visitante",
      incrementAway: "Sumar gol visitante",
    },
  }),
  useLocale: () => "es",
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/pools/p-1",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/features/predictions/actions/save-prediction", () => ({
  savePrediction: vi.fn(),
}));
vi.mock("@/features/predictions/actions/reset-prediction-override", () => ({
  resetPredictionOverride: vi.fn(),
}));

import { PoolPredictionsView } from "../pool-predictions-view";

const members: PoolMemberSummary[] = [
  {
    userId: "user-1",
    nickname: "Alice#1234",
    avatarUrl: "",
    isOwner: true,
    joinedAt: "2026-06-01T00:00:00Z",
  },
];

const team = (id: string, code: string) => ({
  id,
  name: `Team ${code}`,
  fifaCode: code,
  flagPath: `/flags/${code.toLowerCase()}.svg`,
});

// Far-future kickoff so the match is unambiguously editable whenever the suite runs.
const FUTURE_KICKOFF = "2030-06-29T17:00:00Z";

const futureMatch: MatchView = {
  matchId: "m-future",
  matchNumber: 49,
  kickoffAt: FUTURE_KICKOFF,
  matchStatus: "SCHEDULED",
  homeTeam: team("t-bra", "BRA"),
  awayTeam: team("t-jpn", "JPN"),
  homePlaceholder: null,
  awayPlaceholder: null,
  homeScore: null,
  awayScore: null,
  phaseName: "Octavos",
  phaseType: "KNOCKOUT",
};

const viewerNoPrediction: PoolMemberPrediction = {
  ...futureMatch,
  userId: "user-1",
  nickname: "Alice#1234",
  avatarUrl: null,
  predictedHome: null,
  predictedAway: null,
  totalPoints: null,
  matchedCase: null,
  isOverride: false,
  hasGlobal: false,
  hidden: false,
};

describe("PoolPredictionsView — modal de predicción (regresión)", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("abre el modal de un partido futuro como editable, sin el mensaje 'ya comenzó'", () => {
    render(
      <PoolPredictionsView
        predictions={[viewerNoPrediction]}
        matches={[futureMatch]}
        members={members}
        poolId="p-1"
        viewerId="user-1"
        initialPage={0}
      />,
    );

    // The viewer's editable cell exposes the "save for this pool" badge.
    fireEvent.click(screen.getByText("Guardar para esta liga"));

    // Modal is open (score controls rendered)...
    expect(screen.getByTestId("prediction-score-controls")).toBeDefined();
    // ...and NOT locked: the synthetic { matchId } column used to drop kickoffAt,
    // making modalEditable always false for future matches (the reported bug).
    expect(screen.queryByText("El partido ya comenzó.")).toBeNull();
    expect(screen.getByLabelText("Sumar gol local")).not.toHaveProperty("disabled", true);
  });
});
