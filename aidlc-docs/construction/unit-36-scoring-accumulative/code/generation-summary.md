# Unit 36: Scoring acumulativo — Generation Summary

## Scope

Implemented the approved scoring-rule change: non-exact predictions now earn additive base points from result correctness (2), home goals matched (1), and away goals matched (1), instead of exclusive case logic. Exact score (5) and penalty bonus (+1) remain unchanged.

## Application Code

- Updated `src/features/scoring/scoring-rules.ts` comments to describe additive semantics.
- Extended `ScoreBreakdown` in `src/features/scoring/compute-score.ts` with optional `components` field `{ resultPoints, homeGoalPoints, awayGoalPoints }`.
- Updated `computeScore()` algorithm: non-exact predictions compute three independent component points and sum them; exact score returns 5 with no components.
- Updated `matchedCase` classification: `RESULT` when result points are positive, `PARTIAL` when only goal components contribute, `MISS` when nothing matches.
- Updated `src/features/scoring-rankings/services/resolve-points.ts` with `deriveComponents()` that reconstructs best-effort component info from persisted `matchedCase` and `basePoints`.
- Updated `src/features/education/components/score-breakdown-explainer.tsx` to render component rows when present.
- Updated `src/i18n/dictionaries/es.ts` and `src/i18n/dictionaries/en.ts` breakdown copy to additive language plus new i18n keys: `resultPoints`, `homeGoalPoints`, `awayGoalPoints`.

## Tests

- Updated `src/features/scoring/__tests__/compute-score.test.ts` for additive cases: exact 5, result-only 2, result+goal 3, partial 1, miss 0, penalty additive.
- Updated `src/features/scoring-rankings/services/__tests__/resolve-points.test.ts` with 8 new `toBreakdown` component derivation tests.
- Existing `score-adapter.test.ts`, `score-match.test.ts`, and `scoring-calculator.test.tsx` continue passing unchanged.

## Verification

- `pnpm exec vitest run src/features/scoring/ src/features/scoring-rankings/ src/features/education/` — 49/49 passing.
- `pnpm exec tsc --noEmit` — OK.
- `pnpm exec biome check ...` on 8 touched `src` files — OK.
- `pnpm exec eslint ...` on 8 touched `src` files — OK.

## No-Schema Decision

No database migration required. Persisted `PredictionScore` rows keep `matchedCase`, `basePoints`, `penaltyApplied`, `penaltyPoints`, `totalPoints`. Old scores retain old totals until a recalculation path (force/sync/recalc) re-scores the match, at which point the new additive totals and matchedCase apply.

## Non-Exact Scoring Reference

| Scenario | resultPoints | homeGoalPoints | awayGoalPoints | basePoints | matchedCase |
|---|---|---|---|---|---|
| Winner correct, no goals matched | 2 | 0 | 0 | 2 | RESULT |
| Winner correct, one goal matched | 2 | 1 or 0 | 0 or 1 | 3 | RESULT |
| Winner wrong, one goal matched | 0 | 1 or 0 | 0 or 1 | 1 | PARTIAL |
| Nothing correct | 0 | 0 | 0 | 0 | MISS |
