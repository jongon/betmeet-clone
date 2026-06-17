# Unit 36 Functional Design — Scoring acumulativo por ganador y goles acertados

## 1. Scope

Unit 36 implements the approved scoring-rule delta from FR-REFINE-36 over existing Unit 2 and Unit 6 boundaries.

The change is limited to scoring math, score explanation, educational copy, and tests. It does not add routes, database tables, auth behavior, prediction locks, admin override behavior, sync behavior, or infrastructure.

## 2. Current State

- `src/features/scoring/compute-score.ts` is the single scoring engine used by both the educational calculator and authoritative scoring.
- `ScoreBreakdown` currently stores a summary `matchedCase`, `basePoints`, `penaltyApplied`, `penaltyPoints`, `totalPoints`, and `explanationKey`.
- `scoreMatch()` persists summary score fields into `PredictionScore`; `toBreakdown()` reconstructs the same shape for `/matches` and ranking-adjacent views.
- `ScoreBreakdownExplainer` currently renders one case explanation, base points, optional penalty, and total.

## 3. Business Rules

| ID | Rule |
|---|---|
| BR-36.1 | Exact score remains a special case: if home and away scores both match, `basePoints = 5` and no additional result or goal points are added. |
| BR-36.2 | For non-exact predictions, `basePoints` is the sum of applicable components: correct result/draw = 2, matching home goals = 1, matching away goals = 1. |
| BR-36.3 | A non-exact prediction can score 0, 1, 2, 3, or 4 base points depending on combined components. |
| BR-36.4 | Canonical example: actual `BRA 2-1 ARG`, prediction `BRA 3-2 ARG` scores 3 points: 2 for winner + 1 for ARG goals. |
| BR-36.5 | Penalty bonus remains independent and additional: `totalPoints = basePoints + penaltyPoints`. |
| BR-36.6 | `matchedCase` remains a summary classification for persisted compatibility, not the sole source of visible explanation. |

## 4. Algorithm

Pseudo-code for `computeScore(example)`:

```text
if predictedHome == actualHome and predictedAway == actualAway:
  basePoints = EXACT_SCORE
  matchedCase = EXACT
else:
  resultPoints = predictedResult == actualResult ? CORRECT_RESULT : 0
  homeGoalPoints = predictedHome == actualHome ? PARTIAL_GOAL_COUNT : 0
  awayGoalPoints = predictedAway == actualAway ? PARTIAL_GOAL_COUNT : 0
  basePoints = resultPoints + homeGoalPoints + awayGoalPoints
  matchedCase = summary(basePoints, resultPoints, homeGoalPoints, awayGoalPoints)

penaltyPoints = eligiblePenaltyWinnerMatch ? PENALTY_BONUS : 0
totalPoints = basePoints + penaltyPoints
```

Summary classification:

- `EXACT`: exact score matched.
- `RESULT`: result points were earned on a non-exact prediction, whether or not goal points also contributed.
- `PARTIAL`: no result points, but at least one team goal matched.
- `MISS`: no result or goal points.

## 5. ScoreBreakdown Shape

The current persisted schema can represent the authoritative total through `basePoints`, `penaltyPoints`, and `totalPoints`; no migration is required for scoring correctness.

For visible explanation, Code Generation should extend the in-memory `ScoreBreakdown` type with optional component fields, for example:

```text
components?: {
  resultPoints: number
  homeGoalPoints: number
  awayGoalPoints: number
}
```

Persisted historical rows that are reconstructed by `toBreakdown()` can derive a minimal component explanation from `matchedCase` and `basePoints`, or continue to show the summary until a recalc rewrites them. New recalculated rows must persist the new `basePoints`.

## 6. UI and Copy

- `ScoreBreakdownExplainer` must show component-level labels when component data is present.
- The educational calculator automatically uses the new math because it calls `computeScore`.
- Spanish and English dictionaries must avoid exclusive-case copy for non-exact results; copy should explain additive components.
- Existing `data-testid="score-breakdown-total"` must remain stable.

## 7. Persistence and Recalculation

- `scoreMatch()` remains the only authoritative scoring writer and continues to delegate to `computeScore`.
- No schema migration is planned.
- Already persisted scores reflect their old totals until an admin force/sync/recalculation path scores the match again. This matches FR-REFINE-36's note that changed math applies from the next recalculation.

## 8. Stage Decisions

- **Functional Design**: EXECUTE light because business logic changes.
- **NFR Requirements / NFR Design**: SKIP formal. Existing determinism, cache invalidation, and testability requirements apply unchanged.
- **Infrastructure Design**: SKIP. No cloud resources, storage, deployment topology, environment variables, or migrations.

## 9. Verification Targets

Code Generation should include tests for:

- Exact score remains 5 and does not stack additional points.
- Correct winner plus one matched goal returns 3.
- Correct winner plus both matched goals on a non-exact draw or winner scenario returns 4 where possible.
- One matched goal with wrong result remains 1.
- Penalty bonus remains additional.
- `ScoreBreakdownExplainer` renders additive component copy and total.
