import { computeScore, type ScoringExample } from "@/features/scoring/compute-score";
import { es } from "@/i18n/dictionaries/es";
import { ScoreBreakdownExplainer } from "./score-breakdown-explainer";

interface DemoCase {
  label: string;
  example: ScoringExample;
}

const DEMOS: DemoCase[] = [
  {
    label: "2-1 / 2-1",
    example: {
      predictedHome: 2,
      predictedAway: 1,
      actualHome: 2,
      actualAway: 1,
      isKnockout: false,
    },
  },
  {
    label: "2-0 / 3-1",
    example: {
      predictedHome: 2,
      predictedAway: 0,
      actualHome: 3,
      actualAway: 1,
      isKnockout: false,
    },
  },
  {
    label: "1-1 / 1-1 (knockout)",
    example: {
      predictedHome: 1,
      predictedAway: 1,
      actualHome: 1,
      actualAway: 1,
      isKnockout: true,
      predictedPenaltyWinner: "home",
      actualPenaltyWinner: "home",
    },
  },
];

/**
 * Static worked examples for the Rules Center (BR-2.33). Computed at build with
 * the shared scoring module, so they always match the real engine.
 */
export function ScoreBreakdownDemo() {
  return (
    <div className="space-y-4" data-testid="score-breakdown-demo">
      <h3 className="text-sm font-semibold">{es.rules.demoTitle}</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        {DEMOS.map((demo) => (
          <div key={demo.label} className="rounded-md border p-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">{demo.label}</p>
            <ScoreBreakdownExplainer breakdown={computeScore(demo.example)} />
          </div>
        ))}
      </div>
    </div>
  );
}
