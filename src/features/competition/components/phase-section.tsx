import type { PredictionMatchView } from "@/features/predictions/types";
import type { PhaseView } from "../types";
import { MatchCard } from "./match-card";

export function PhaseSection({
  phase,
}: {
  phase:
    | PhaseView
    | {
        id: string;
        name: string;
        type: string;
        groupCode: string | null;
        matches: PredictionMatchView[];
      };
}) {
  if (phase.matches.length === 0) return null;

  return (
    <section className="space-y-3" data-testid={`phase-section-${phase.id}`}>
      <h2 className="text-xl font-semibold">{phase.name}</h2>
      <div className="space-y-3">
        {phase.matches.map((match) => (
          <MatchCard key={match.id} match={match as unknown as PredictionMatchView} />
        ))}
      </div>
    </section>
  );
}
