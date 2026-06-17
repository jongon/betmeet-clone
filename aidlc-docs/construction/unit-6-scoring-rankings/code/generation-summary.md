# Unit 6: Scoring and Pool Rankings — Code Generation Summary

> Parte 2 completada. Disparo del scoring = **sweeper post-sync** (decisión por selección).

## Validación
- **Type check**: `tsc --noEmit` → **0 errores**.
- **Tests**: `vitest run` → **103/103** (24 archivos), incl. 11 nuevos de `scoring-rankings`.
- **Formato**: Biome limpio.
- **Build**: `pnpm build` → **passing** (ruta `/pools/[id]/leaderboard` generada).

## Decisiones aplicadas
- Persistencia: tabla **`PredictionScore`** 1:1 con `Prediction` (Q1=A).
- Disparo: `scoreMatch` idempotente + barredor (Q2=A); wiring del barredor documentado en el composition root (edge function `competition-sync`), sin acoplar el orchestrator puro.
- Empates: **dense ranking "1,1,2"** (Q4=B) — **desviación documentada** del ejemplo del AC (BR-6.13).
- Total **global** por usuario (Q8=A).

## Archivos creados
```
prisma/schema.prisma                         (+ enum ScoreMatchedCase, model PredictionScore, relaciones)
supabase/migrations/20260610000010_create_prediction_scores.sql  (RLS)
src/features/scoring-rankings/types.ts
src/features/scoring-rankings/queries.ts                          (userTotals, getPoolLeaderboard)
src/features/scoring-rankings/services/score-adapter.ts          (teamToSide, toScoringExample — BL-1)
src/features/scoring-rankings/services/score-match.ts            (scoreMatch idempotente — BL-2)
src/features/scoring-rankings/services/score-sweeper.ts          (scoreFinishedUnscoredMatches — BL-3)
src/features/scoring-rankings/services/ranking.ts                (assignDensePositions — BL-6)
src/features/scoring-rankings/services/resolve-points.ts         (resolvePoints, toBreakdown — BL-7)
src/features/scoring-rankings/components/pool-leaderboard.tsx
src/app/pools/[id]/leaderboard/page.tsx
src/features/scoring-rankings/services/__tests__/*               (score-adapter, ranking, resolve-points, score-match)
vitest.config.ts                                                 (alias @/ para tests — mejora transversal)
```

## Archivos modificados (integración)
```
src/features/predictions/types.ts          (+ breakdown en PredictionMatchView)
src/features/predictions/queries.ts         (resolvePoints + include score — quita el stub points:null)
src/features/predictions/components/prediction-vs-result.tsx  (ScoreBreakdownExplainer cuando SCORED)
src/app/pools/[id]/page.tsx                 (sección "Tabla de posiciones" en el detalle del pool)
supabase/functions/competition-sync/index.ts (nota de invocación del sweeper post-sync)
```

## Reutilización (invariante BR-2.7 / BR-6.1)
- El cálculo usa **`computeScore`/`ScoringRuleSet`** de Unit 2 vía adaptador `teamId → "home"/"away"`; **no** se redefinen reglas.
- El desglose usa **`ScoreBreakdownExplainer`** de Unit 2.
- Refine FR-REFINE-36 (2026-06-17): cuando se implemente la nueva regla acumulativa, Unit 6 debe seguir delegando en `computeScore`; `scoreMatch` solo persistirá el nuevo `basePoints`/`totalPoints` y el desglose deberá explicar componentes acumulados.

## Notas / pendientes de integración
- **Disparo real**: el barredor debe invocarse desde el entrypoint de sync de producción (hardening de la edge function de Unit 4) y desde el override de Unit 7.
- `vitest.config.ts` añadido para resolver el alias `@/` en tests (antes solo funcionaba con módulos mockeados); habilita tests de integración entre features.
