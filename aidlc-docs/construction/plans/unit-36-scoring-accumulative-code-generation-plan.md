# Unit 36 Code Generation Plan — Scoring acumulativo

## Status

- **Stage**: Code Generation Part 2 — COMPLETE
- **Created**: 2026-06-17T00:41:40Z
- **Completed**: 2026-06-17T00:48:45Z
- **Unit**: Unit 36 — Scoring acumulativo por ganador y goles acertados
- **Approval Gate**: Approved and executed by user continuation
- **Source of Truth**: This plan is the single source of truth for Unit 36 Code Generation.

## Plan Authoring Progress

- [x] Step 1 — Read Unit 36 requirements, unit map, Functional Design, and current AI-DLC state.
- [x] Step 2 — Inspect current scoring engine, scoring constants, persisted breakdown adapter, explainer UI, dictionaries, and tests.
- [x] Step 3 — Confirm NFR Requirements/Design and Infrastructure are skipped formally.
- [x] Step 4 — Define exact code paths and verification targets.
- [x] Step 5 — Update `aidlc-docs/aidlc-state.md` and `aidlc-docs/audit.md` in the same interaction.

## Unit Context

### Requirements Traceability

- **FR-REFINE-36.1**: Exact score remains 5 points and does not stack result/goal components.
- **FR-REFINE-36.2**: For non-exact predictions, correct result/draw adds 2 and each correctly predicted team goal count adds 1.
- **FR-REFINE-36.3**: Penalty winner bonus remains +1 additional when eligible.
- **FR-REFINE-36.4**: User-facing explanation must make additive scoring clear; canonical example `BRA 2-1 ARG` vs `BRA 3-2 ARG` = 3 points.

### Functional Design Decisions

- `computeScore()` remains the single scoring engine for education and authoritative scoring.
- `ScoreBreakdown` can be extended in memory without schema migration.
- Persisted `PredictionScore` rows continue storing summary fields: `matchedCase`, `basePoints`, `penaltyApplied`, `penaltyPoints`, `totalPoints`.
- `matchedCase` remains a summary classification: `EXACT`, `RESULT`, `PARTIAL`, or `MISS`.
- Existing persisted scores keep old totals until a recalculation path rewrites them.

## Part 2 Generation Steps

### Step 1: Scoring Constants and Types

- [x] Update `src/features/scoring/scoring-rules.ts` comments so `CORRECT_RESULT` and `PARTIAL_GOAL_COUNT` describe additive components instead of exclusive cases.
- [x] Extend `ScoreBreakdown` in `src/features/scoring/compute-score.ts` with optional `components?: { resultPoints: number; homeGoalPoints: number; awayGoalPoints: number }`.
- [x] Keep the persisted-compatible summary fields unchanged.

### Step 2: Scoring Algorithm

- [x] Update `computeScore()` so exact score returns `basePoints = 5` and zero component fields.
- [x] For non-exact predictions, compute result, home-goal, and away-goal component points, then set `basePoints` to their sum.
- [x] Set `matchedCase` as summary: `RESULT` if result points are positive, else `PARTIAL` if any goal component is positive, else `MISS`.
- [x] Keep penalty bonus behavior unchanged and additive to `basePoints`.

### Step 3: Persisted Breakdown Adapter

- [x] Update `src/features/scoring-rankings/services/resolve-points.ts` so `toBreakdown()` derives a minimal `components` object from persisted summary fields where possible.
- [x] Preserve correctness of `points`, `status`, `basePoints`, `penaltyPoints`, and `totalPoints`.
- [x] Avoid adding schema fields or migrations.

### Step 4: Explainer UI and Copy

- [x] Update `src/features/education/components/score-breakdown-explainer.tsx` to render component rows when `breakdown.components` is present.
- [x] Preserve `data-testid="score-breakdown-total"`.
- [x] Update `src/i18n/dictionaries/es.ts` and `src/i18n/dictionaries/en.ts` breakdown copy to explain additive components instead of exclusive cases.
- [x] Add labels for result points, home-goal points, and away-goal points if needed by the UI.

### Step 5: Unit Tests

- [x] Update `src/features/scoring/__tests__/compute-score.test.ts` for exact 5, result+goal 3, result-only 2, partial 1, miss 0, and penalty additive cases.
- [x] Update or add tests for `src/features/scoring-rankings/services/resolve-points.ts` if component derivation is changed.
- [x] Add or update education component tests so `ScoreBreakdownExplainer` renders additive component copy and total.
- [x] Update any existing scoring-adapter/ranking tests whose expected totals depend on old exclusive scoring.

### Step 6: Documentation Summary

- [x] Create `aidlc-docs/construction/unit-36-scoring-accumulative/code/generation-summary.md` after generation.
- [x] Summarize changed files, scoring semantics, no-schema decision, and verification commands.

### Step 7: Verification

- [x] Run focused scoring and education tests.
- [x] Run `pnpm exec tsc --noEmit`.
- [x] Run Biome on touched `src` files.
- [x] Run ESLint on touched `src` files.

### Step 8: Progress Tracking

- [x] Mark completed steps in this plan with `[x]` in the same interaction as generation.
- [x] Update `aidlc-docs/aidlc-state.md` after successful generation.
- [x] Append the Unit 36 Code Generation result to `aidlc-docs/audit.md` with exact files and verification results.

## Security Baseline Compliance

- **SECURITY-03/05/08/13**: N/A. No sensitive logs, input boundary, authorization, or audit event changes.
- Other enabled Security Baseline rules are N/A because this unit changes deterministic in-process scoring math and explanatory UI only.

## Approval Gate

Do not modify application code until this Code Generation plan is explicitly approved.
