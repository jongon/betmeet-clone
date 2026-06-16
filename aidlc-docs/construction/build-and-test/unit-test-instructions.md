# Unit Test Execution

## Run Unit Tests
```bash
pnpm test                   # toda la suite (vitest run con DATABASE_URL de test)
pnpm exec vitest            # modo watch
```
> Nota: el script `pnpm test` corre `vitest run` con un `DATABASE_URL` de test inyectado. El alias `@/` se resuelve vía `vitest.config.ts`.

## Resultados esperados
- **213 tests / 48 archivos — 0 fallos.**
- Cobertura por unidad (tests generados durante Code Generation):

| Área | Tests destacados |
|---|---|
| Unit 1 Foundation | nickname, avatar, sign-in/up/reset, delete-account |
| Unit 2 UX | `compute-score` (tabla de casos, invariante BR-2.7), `cue-store` (fail-open) |
| Unit 3 Pools | invite-token, competition-lock, capacidad/autorización, account-deletion transfer |
| Unit 4 Competition | sync-orchestrator, fixture-freshness, status-mapping, seed |
| Unit 25 Sync football-data.org | `providers/football-data` (7 casos), `mapFootballDataStatus` |
| Unit 28 Match persistence | `sync-orchestrator` persistencia: CREATE/UPDATE/SKIP por status, phase no encontrada, competition ausente, notificaciones best-effort (6 casos) |
| Unit 5 Predictions | eligibility, validation, lock |
| Unit 6 Scoring | score-adapter (+ engine), ranking (dense "1,1,2"), resolve-points, score-match |
| Unit 7 Admin | resolve-winner, require-admin |

## Calidad estática (gates del proyecto)
```bash
pnpm exec tsc --noEmit         # 0 errores
pnpm exec biome check src scripts  # limpio (1 warning preexistente de <img>)
pnpm lint                      # ESLint — 0 problemas
```

## Si fallan tests
1. Revisar la salida de vitest (archivo + caso).
2. Corregir el código.
3. Re-ejecutar hasta verde.
