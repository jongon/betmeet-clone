# Unit 5: Predictions and Match Locking — Code Generation Plan

> Single source of truth para la generación de Unit 5. Code Generation Part 2 ejecuta estos pasos tras aprobación.

## Unit Context
- **Workspace root**: `/var/www/html` · **Code location**: `src/`, `prisma/`, `supabase/`.
- **Project type**: Greenfield feature slice in existing Next.js 16 monolith.
- **Novedad vs Unit 4**: crea feature `predictions`, tabla `predictions`, server action de guardado y extensión de `/matches` con controles editables.

## Stories
- **US-3.1** Predecir marcador.
- **US-3.2** Modificar predicción antes del kickoff.
- **US-3.3** Predicción de penales en knockout empatado.
- **US-3.4** Visualización de predicción vs resultado real; puntos diferidos a Unit 6.

## Decisions Carried Into Code
- v1: una predicción global por `userId + matchId`; no predicción por pool todavía.
- Upsert de último estado editable antes del kickoff; no historial completo en v1.
- Preparar auditabilidad con `lockedAt` y `lockReason`; no ledger/hash-chain.
- Goles válidos: enteros 0–20 por equipo.
- Elegibilidad: ambos equipos definidos, kickoff conocido/futuro y `MatchStatus.SCHEDULED`.
- Penales: `penaltyWinnerTeamId` obligatorio solo en fase knockout con predicción empatada; debe ser uno de los dos equipos.
- `/matches` es la superficie principal para predecir.
- Antes del kickoff el usuario solo ve sus propias predicciones; Unit 6 podrá exponerlas post-kickoff en contexto de pools.
- No hay predicción implícita: si el usuario no guarda antes del kickoff, no suma puntos; 0-0 solo cuenta si se guardó explícitamente.
- Unit 5 no calcula puntos; muestra estado pendiente hasta Unit 6.

---

## Generation Steps

### Step 1 — Data Model (Prisma)
- [ ] Add enum `PredictionLockReason` with values such as `KICKOFF_REACHED`, `MATCH_STATUS_LOCKED`, `MATCH_NOT_EDITABLE`.
- [ ] Add model `Prediction` mapped to `predictions`:
  - `id`, `userId`, `matchId`, `homeScore`, `awayScore`, `penaltyWinnerTeamId`, `lockedAt`, `lockReason`, `createdAt`, `updatedAt`.
  - unique `(userId, matchId)`.
  - indexes on `userId`, `matchId`, `lockedAt`.
  - relations to `Profile`, `Match`, and optional penalty winner `Team`.
- [ ] Add relation arrays to `Profile`, `Match`, and `Team` as needed.
- [ ] Run `pnpm prisma:generate`.

### Step 2 — Supabase Migration + RLS
- [ ] Add migration `supabase/migrations/20260610000007_create_predictions.sql`.
- [ ] Add constraints:
  - score bounds `0 <= home_score/away_score <= 20`.
  - unique `(user_id, match_id)`.
  - optional DB-level immutability trigger to prevent updates to locked predictions, if practical.
  - FK constraints to `profiles`, `matches`, and `teams`.
- [ ] Enable RLS on `predictions`.
- [ ] Policies:
  - authenticated users can select their own predictions.
  - authenticated users can insert/update only their own unlocked predictions; server action remains the primary guard.
  - no normal-user delete in v1.
- [ ] Document that post-kickoff pool visibility is deferred to Unit 6 RLS/queries.

### Step 3 — Feature Module Skeleton
- [ ] Add `src/features/predictions/` with:
  - `types.ts` for `PredictionView`, `PredictionEligibility`, `PredictionResultStatus`.
  - `schemas.ts` for submit input validation using Zod.
  - `services/eligibility.ts` for BL-5.0.
  - `services/validation.ts` for BL-5.2.
  - `services/lock.ts` for BL-5.3.
  - `queries.ts` for current-user predictions by fixture/match ids.
  - `actions/save-prediction.ts` for BL-5.1.

### Step 4 — Eligibility Service
- [ ] Implement `getPredictionEligibility(match, now)`.
- [ ] Block reasons: `TEAMS_NOT_DEFINED`, `KICKOFF_NOT_DEFINED`, `KICKOFF_REACHED`, `MATCH_NOT_EDITABLE`.
- [ ] Treat only `SCHEDULED` before kickoff as editable.
- [ ] Ensure server time is injected in tests but defaults to `new Date()` in runtime.

### Step 5 — Prediction Validation Service
- [ ] Validate score integers 0–20.
- [ ] Validate penalty winner rule using `CompetitionPhaseType.KNOCKOUT` and match team ids.
- [ ] Clear/forbid `penaltyWinnerTeamId` for group, league, or non-draw predictions.
- [ ] Return friendly Spanish field/domain errors for UI.

### Step 6 — Save Prediction Server Action
- [ ] `savePrediction(input)` with authenticated user lookup via existing server session helper.
- [ ] Load match with phase, teams, and existing current-user prediction.
- [ ] Re-run eligibility on the server inside the action.
- [ ] If locked/not editable:
  - lock existing prediction if present and unlocked.
  - return 403-style domain error; do not create implicit prediction.
- [ ] If editable:
  - validate input.
  - upsert by `(userId, matchId)`.
  - ensure locked prediction cannot be modified.
  - `revalidatePath("/matches")`.
- [ ] Return serializable action result; no thrown redirect required.

### Step 7 — Prediction Queries / Fixture Integration
- [ ] Add current-user prediction lookup for match ids.
- [ ] Extend or wrap `getFixture()` with `getFixtureWithMyPredictions(userId)`.
- [ ] Preserve existing fixture rendering for no-auth/null fixture cases.
- [ ] Attach per-match prediction view fields: prediction, canEdit, lockReason, points placeholder.

### Step 8 — UI Components
- [ ] Add components under `src/features/predictions/components/`:
  - `prediction-form.tsx` client component using server action.
  - `prediction-score-controls.tsx`.
  - `penalty-winner-selector.tsx`.
  - `prediction-status-summary.tsx`.
  - `prediction-vs-result.tsx`.
  - `lock-conflict-message.tsx` if not folded into summary.
- [ ] Keep `/matches` route as the main surface.
- [ ] Use stable `data-testid` values from the functional design.
- [ ] Default score controls visually to 0-0 but persist only on explicit submit.

### Step 9 — Update Competition Fixture Components
- [ ] Modify `MatchCard` to accept optional prediction state and render prediction UI.
- [ ] Modify `PhaseSection` to pass prediction-enhanced match objects.
- [ ] Modify `src/app/matches/page.tsx` to use current user id and prediction-aware fixture query.
- [ ] Keep `/matches` `force-dynamic`.

### Step 10 — Error and Empty States
- [ ] Locked with prediction: read-only saved prediction.
- [ ] Locked without prediction: explicit “sin predicción guardada; no suma puntos”.
- [ ] Placeholder teams: “Predicción disponible cuando se definan los equipos.”
- [ ] Missing kickoff: “Horario pendiente; aún no se puede predecir.”
- [ ] Postponed/cancelled: no save CTA.
- [ ] Lock conflict after submit: refresh state and show clear message.

### Step 11 — Tests
- [ ] Unit tests for eligibility service:
  - missing teams, missing kickoff, kickoff reached, non-scheduled status, editable scheduled future.
- [ ] Unit tests for validation service:
  - score bounds, group draw no penalty, knockout draw requires home/away penalty winner, knockout non-draw forbids penalty winner.
- [ ] Server action tests with Prisma/session mocks:
  - create new prediction.
  - update existing unlocked prediction.
  - reject after kickoff and do not create implicit prediction.
  - lock existing prediction on late save.
  - reject attempts to mutate locked prediction.
- [ ] Component-level tests only if existing setup supports them cheaply; otherwise cover behavior via service/action tests.

### Step 12 — Documentation
- [ ] Add `aidlc-docs/construction/unit-5-predictions-match-locking/code/generation-summary.md` after implementation.
- [ ] Update `aidlc-docs/aidlc-state.md` and `aidlc-docs/audit.md` after code generation.
- [ ] Document any deliberate deferment to Unit 6: points calculation and pool post-kickoff prediction visibility.

---

## Trazabilidad story → steps

| Story | Steps |
|---|---|
| US-3.1 Predecir marcador | 1,2,3,4,5,6,7,8,9,10,11 |
| US-3.2 Modificar predicción | 1,2,4,6,7,8,9,10,11 |
| US-3.3 Penales knockout | 1,2,5,6,8,10,11 |
| US-3.4 Visualizar predicciones | 7,8,9,10,12 |
| Unit 6 scoring handoff | 1,5,7,12 |

## Notes / Risks
- Unit 5 must not silently persist default 0-0 predictions; every prediction requires an explicit save.
- DB constraints cannot easily validate knockout penalty rules because they depend on match phase/team ids; enforce in server logic and tests.
- RLS guards ownership, but server actions remain the authoritative domain boundary for kickoff/status locking.
- If locked immutability trigger becomes too large for MVP, implement application-level guard plus DB `locked_at` policy and document the residual risk.
