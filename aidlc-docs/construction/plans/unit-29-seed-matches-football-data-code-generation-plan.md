# Unit 29: Seed de partidos desde football-data.org con snapshot — Plan de Ejecución

> Refine post-construcción vía `/aidlc:start` (2026-06-16); no reinicia Units 1–28. Construye sobre Unit 25
> (`FootballDataProvider`) y Unit 28 (`syncMatchesToDB`, `seedCompetitionStructure`). Sin schema, migraciones ni rutas.

## Contexto

Tras Unit 28 el seed solo siembra estructura y los partidos entran por el sync admin en runtime. El seed estático de
104 partidos (`WORLD_CUP_2026_MATCHES`) no está conectado a ningún comando y tiene datos incorrectos. Se quiere que el
seed obtenga los partidos de football-data.org (1 llamada = toda la competición), registre solo los pendientes, sea
idempotente, y use un snapshot commiteado como respaldo offline.

## Steps

- [x] **Step 1** — Crear `src/features/competition/services/seed-matches.ts` con `seedMatchesFromFootballData()`:
  - 1 llamada `new FootballDataProvider().fetch("FULL", { windowKey: "seed-full" })`; en éxito escribe el snapshot.
  - Fallback: si la API falla y existe snapshot → usarlo + `console.warn`; si no existe → `throw`.
  - Persiste vía `runCompetitionSync(provider, "FULL", window)` con un provider en memoria `{ fetch: async () => payload }`
    (reúsa validación Zod + `syncMatchesToDB` idempotente create-only `SCHEDULED`/`LIVE`).

- [x] **Step 2** — Cablear `scripts/seed-competition.ts`: tras `seedCompetitionStructure()`, llamar
  `seedMatchesFromFootballData()`.

- [x] **Step 3** — Eliminar el seed estático incorrecto:
  - `src/features/competition/services/upsert-competition-data.ts`: borrar `seedWorldCup2026()` y `upsertMatch` +
    imports muertos (`Prisma`, `NormalizedMatch`, `emitMatchNotificationEvents`, `WORLD_CUP_2026_MATCHES`).
  - `src/features/competition/seed/world-cup-2026.ts`: borrar `WORLD_CUP_2026_MATCHES`, helpers `g`/`k`, tipo
    `SeedMatch` y el import `MatchStatus`. Conservar competición, equipos y fases.

- [x] **Step 4** — Tests `src/features/competition/services/__tests__/seed-matches.test.ts`: API-ok (escribe snapshot,
  persiste, scope `FULL`/window `seed-full`), fallback (API falla + snapshot), fallo duro (API falla sin snapshot).

- [x] **Step 5** — Docs: `AGENTS.md` (comando real `pnpm prisma:seed:competition` + descripción del seed desde
  football-data.org con snapshot; corrección de las menciones stale "API-Football").

- [x] **Step 6** — Verificación: `tsc --noEmit` (0), `vitest run` (**216/216**), `biome check` (limpio) en los archivos
  tocados.

## Notas

- **Scope `FULL`** (no `FIXTURES`): evita el filtro de query `status=SCHEDULED` que descartaría los partidos `TIMED`;
  el filtro "por estado" lo hace el persist (`syncMatchesToDB` crea solo `SCHEDULED`/`LIVE`).
- El snapshot se genera en la primera corrida con `FOOTBALL_DATA_KEY` válido (no se fabrica con datos sintéticos);
  hasta entonces, una corrida sin key falla por diseño (FR-SEED-29.4).
- `runCompetitionSync` registra un `ProviderSyncRun` con windowKey estable `seed-full` (idempotente, trazable).
- Sin cambios de schema Prisma: idempotencia por `providerMatchId @unique` (ya existente).
