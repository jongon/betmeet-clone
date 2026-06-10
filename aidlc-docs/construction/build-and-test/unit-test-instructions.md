# Unit Test Execution

## Run Unit Tests
```bash
pnpm exec vitest run        # toda la suite
pnpm exec vitest            # modo watch
```
> Nota: el script `pnpm test` usa `tsx --test`; la suite está escrita en **vitest** — usar `pnpm exec vitest run`. El alias `@/` se resuelve vía `vitest.config.ts`.

## Resultados esperados
- **111 tests / 26 archivos — 0 fallos.**
- Cobertura por unidad (tests generados durante Code Generation):

| Área | Tests destacados |
|---|---|
| Unit 1 Foundation | nickname, avatar, sign-in/up/reset, delete-account |
| Unit 2 UX | `compute-score` (tabla de casos, invariante BR-2.7), `cue-store` (fail-open) |
| Unit 3 Pools | invite-token, competition-lock, capacidad/autorización, account-deletion transfer |
| Unit 4 Competition | sync-orchestrator, fixture-freshness, status-mapping, seed |
| Unit 5 Predictions | eligibility, validation, lock |
| Unit 6 Scoring | score-adapter (+ engine), ranking (dense "1,1,2"), resolve-points, score-match |
| Unit 7 Admin | resolve-winner, require-admin |

## Calidad estática (gates del proyecto)
```bash
pnpm exec tsc --noEmit      # 0 errores
pnpm exec biome check src   # 0 fixes / limpio
pnpm lint                   # ESLint — 0 problemas
```

## Si fallan tests
1. Revisar la salida de vitest (archivo + caso).
2. Corregir el código.
3. Re-ejecutar hasta verde.
