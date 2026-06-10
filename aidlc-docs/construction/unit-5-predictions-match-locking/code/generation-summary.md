# Unit 5: Predictions and Match Locking — Code Generation Summary

## Date
2026-06-10

## Status
COMPLETE

## Verification
- **TypeScript**: `pnpm exec tsc --noEmit` — 0 errors
- **Tests**: `pnpm test` — 20 files, 88 tests passing
- **Biome**: `pnpm check` — clean (0 fixes needed)
- **Build**: `pnpm build` — passing

## What was built

### Data Model (Steps 1–2)
- Added `PredictionLockReason` enum (KICKOFF_REACHED, MATCH_STATUS_LOCKED, MATCH_NOT_EDITABLE, POSTPONED, CANCELLED)
- Added `Prediction` model with unique `(userId, matchId)`, score bounds 0–20, `penaltyWinnerTeamId`, `lockedAt`, `lockReason`
- Added relations on Profile, Match, and Team
- Supabase migration: score CHECK constraint, DB-level immutability trigger, RLS policies

### Feature Module (Steps 3–7)
- `src/features/predictions/types.ts` — PredictionEligibility, PredictionView, PredictionMatchView, PredictionPointsStatus
- `src/features/predictions/schemas.ts` — Zod schema with UUID validation
- `src/features/predictions/services/eligibility.ts` — BL-5.0 server-authoritative eligibility
- `src/features/predictions/services/validation.ts` — BL-5.2 score bounds and knockout penalty rules
- `src/features/predictions/services/lock.ts` — BL-5.3 lock existing predictions
- `src/features/predictions/queries.ts` — BL-5.4 fixture with prediction enrichment + toPredictionMatchView
- `src/features/predictions/actions/save-prediction.ts` — BL-5.1 upsert action with server re-check

### UI Components (Steps 8–10)
- `PredictionScoreControls` — 0–20 increment/decrement
- `PenaltyWinnerSelector` — home/away toggle for knockout draws
- `PredictionStatusSummary` — contextual status messages
- `PredictionVsResult` — prediction vs real result with points placeholder
- `PredictionForm` — integrates all controls, handles save, lock conflict, error states
- Updated `MatchCard` to render PredictionForm for prediction-augmented matches
- Updated `PhaseSection` to accept PredictionMatchView[]
- Updated `/matches/page.tsx` to use `getFixtureWithMyPredictions()` when authenticated

### Tests (Step 11)
- `eligibility.test.ts` — 12 tests: missing teams, missing kickoff, kickoff reached, SCHEDULED/LOCKED/LIVE/FINISHED/CANCELLED/POSTPONED, edge at-kickoff, edge second-before-kickoff
- `validation.test.ts` — 12 tests: valid groups, bounds, non-integer, group penalty forbiddance, knockout draw requirement, invalid winner, multiple errors
- `save-prediction.test.ts` — 8 tests: unauthenticated, create new, update existing, lock on late save, no implicit prediction, locked prediction reject, validation reject, knockout draw save

## Business Rules Covered

| BR | Status |
|----|--------|
| BR-5.1 (one per user+match) | Unique constraint + upsert |
| BR-5.2 (same for all pools) | Global per user (no pool scope) |
| BR-5.5–5.7 (server-time authoritative) | Server re-checks eligibility on every save |
| BR-5.8 (teams+kickoff required) | Eligibility blocks missing teams/kickoff |
| BR-5.9–5.10 (SCHEDULED only) | Only SCHEDULED before kickoff |
| BR-5.11–5.12 (lock immutability) | Server reject + DB trigger |
| BR-5.13–5.15 (no implicit prediction) | No 0-0 auto-creation |
| BR-5.16–5.18 (score bounds) | Zod + server validation |
| BR-5.19–5.24 (knockout penalty) | Validation service + UI |
| BR-5.25–5.27 (privacy before kickoff) | RLS + self-only queries |
| BR-5.28–5.31 (scoring handoff) | Data persisted, points deferred |
| BR-5.32–5.37 (security/auditability) | Auth + server validation + lock metadata |

## Deferred to Unit 6
- Points calculation (exact score, correct result, one-team score, knockout penalty bonus)
- Post-kickoff prediction visibility in pool/social contexts
- `pointsStatus` currently shows PENDING_SCORING or NOT_SCORED
