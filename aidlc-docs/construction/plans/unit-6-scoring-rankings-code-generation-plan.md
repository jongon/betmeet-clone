# Unit 6: Scoring and Pool Rankings — Code Generation Plan

> Single source of truth para la generación de Unit 6. Tras aprobación se ejecuta la Parte 2.

## Unit Context
- **Workspace root**: `/var/www/html` · **Code location**: `src/` (monolito feature-first).
- **Módulo nuevo**: `src/features/scoring-rankings` (no colisiona con `src/features/scoring`, el motor compartido de Unit 2, que **no** se toca).
- **Tabla nueva**: `PredictionScore` (1:1 con `Prediction`).

## Stories
- **US-5.1** Cálculo de Puntos · **US-5.2** Ranking por Pool.

## Dependencias / integraciones
- **Unit 2**: reutiliza `computeScore`/`ScoringRuleSet` y `ScoreBreakdownExplainer`.
- **Unit 4**: dispara `scoreMatch` al `FINISHED` (vía sync) — punto de integración (ver decisión).
- **Unit 5**: **modifica** `predictions/types.ts` + `predictions/queries.ts` (quita el stub de puntos).
- **Unit 3**: leaderboard por pool (membresías + autorización); sección en `/pools/[id]`.
- **Unit 7** (futuro): el override re-dispara `scoreMatch`.

---

## Generation Steps

### Step 1 — Modelo de datos
- [x] `prisma/schema.prisma`: `model PredictionScore` (+ enum `ScoreMatchedCase { EXACT RESULT PARTIAL MISS }`), relaciones 1:1 con `Prediction`, FKs a `Match`/`Profile`, índices (`unique(predictionId)`, `index(matchId)`, `index(userId)`). `pnpm prisma:generate`.
- [x] `supabase/migrations/20260610000010_create_prediction_scores.sql`: RLS — lectura para miembros del mismo pool del autor (o lectura propia); escrituras solo server-side (Prisma).

### Step 2 — Servicios del motor de scoring
- [x] `src/features/scoring-rankings/services/score-adapter.ts` — `teamToSide`, `toScoringExample` (BL-1).
- [x] `src/features/scoring-rankings/services/score-match.ts` — `scoreMatch(matchId)` idempotente con upsert + limpieza si no puntuable (BL-2, BR-6.5/6.6/6.7), reutilizando `computeScore`.
- [x] `src/features/scoring-rankings/services/score-sweeper.ts` — `scoreFinishedUnscoredMatches()` (BL-3).

### Step 3 — Ranking + queries
- [x] `src/features/scoring-rankings/services/ranking.ts` — `assignDensePositions` (BL-6, dense "1,1,2").
- [x] `src/features/scoring-rankings/queries.ts` — `userTotals`, `getPoolLeaderboard(poolId, viewerId)` (BL-4/5), autorización por miembro (BR-6.16).
- [x] `src/features/scoring-rankings/types.ts` — `LeaderboardRow`.

### Step 4 — Disparo del cálculo (integración Unit 4) — **DECISIÓN: Sweeper post-sync**
- [x] Invocar `scoreFinishedUnscoredMatches()` al final del flujo de `competition-sync` (edge function / orchestrator entrypoint), tras aplicar resultados. Mínima modificación a Unit 4; el barredor cubre todo lo finalizado sin puntuar.

### Step 5 — Integración con el read model de Unit 5 (modifica Unit 5)
- [x] `src/features/scoring-rankings/services/resolve-points.ts` — `resolvePoints` (BL-7) + `toBreakdown(score)`.
- [x] **Modificar** `src/features/predictions/types.ts` — `PredictionMatchView` += `breakdown?: ScoreBreakdown`.
- [x] **Modificar** `src/features/predictions/queries.ts` — sustituir el stub (`points:null`) por `resolvePoints` leyendo `PredictionScore` (incluir el include de scores).

### Step 6 — UI del leaderboard
- [x] `src/features/scoring-rankings/components/pool-leaderboard.tsx` (+ `leaderboard-row`), `data-testid` estables.
- [x] `src/app/pools/[id]/leaderboard/page.tsx` — vista completa (autoriza miembro).
- [x] **Modificar** detalle de pool de Unit 3 (`/pools/[id]`) — sección/pestaña "Tabla de posiciones" (vista compacta).

### Step 7 — Desglose en la vista de predicciones (modifica Unit 5)
- [x] Integrar `ScoreBreakdownExplainer` (Unit 2) en `PredictionVsResult` cuando `pointsStatus === SCORED`, usando `breakdown`.

### Step 8 — Tests
- [x] `score-match` (casos exacto/resultado/parcial/miss/penales vía adaptador; idempotencia; limpieza en cancelado), `ranking` (dense "1,1,2"), `getPoolLeaderboard` (orden + 0 puntos), `resolvePoints` (SCORED/PENDING/NOT_SCORED). Prisma mockeado.

### Step 9 — Documentación
- [x] `aidlc-docs/construction/unit-6-scoring-rankings/code/generation-summary.md`.

---

## Trazabilidad story → pasos
| Story | Pasos |
|---|---|
| US-5.1 Cálculo de Puntos | 1, 2, 4, 5, 8 |
| US-5.2 Ranking por Pool | 1, 3, 6, 8 |
| Integración predicciones (desglose) | 5, 7 |

## Notas
- Reutilizar `computeScore` (Unit 2) — **no** redefinir reglas (BR-6.1).
- Modificar **en sitio** los archivos de Units 4/5/3; nunca duplicar.
- Validación final: `tsc --noEmit`, `vitest run`, `biome check`, `pnpm build`.
- Total: **9 pasos**. 1 tabla nueva + módulo `scoring-rankings` + 3 integraciones (Units 4/5/3).
