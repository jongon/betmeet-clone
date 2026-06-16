# Unit 29: Seed de partidos desde football-data.org con snapshot

> Refine post-construcción vía `/aidlc:start` (2026-06-16); aditivo, no reinicia Units 1–28.
> Construye sobre Unit 25 (`FootballDataProvider`) y Unit 28 (`syncMatchesToDB`, `seedCompetitionStructure`).
> Sin schema, migraciones ni rutas nuevas.

## Intent

> "Quiero que el seed de prisma de la competición de la world cup 2026 se haga desde football-data.org,
> que solo registre los partidos que faltan por ocurrir y que sea idempotente."

## Contexto y problema

- Tras Unit 28, `pnpm prisma:seed:competition` (`scripts/seed-competition.ts`) sembraba **solo estructura**
  (`seedCompetitionStructure()`: competición, equipos, fases) y los partidos entraban únicamente por el sync admin
  en runtime.
- Existía además un seed estático de 104 partidos (`WORLD_CUP_2026_MATCHES` / `seedWorldCup2026()` / `upsertMatch`)
  **no conectado a ningún comando** y con **datos no correctos** (kickoffs/equipos aproximados).
- Objetivo: que el propio seed obtenga los partidos de football-data.org, registre solo los que faltan por ocurrir,
  sea idempotente, no llame a la API en cada corrida innecesariamente, y respete el límite de 10 req/min.

## Decisiones (acordadas con el usuario)

| # | Decisión |
|---|----------|
| FR-SEED-29.1 | "Faltan por ocurrir" = **por estado**: se reutiliza la lógica `create-only SCHEDULED/LIVE` de `syncMatchesToDB`, que omite `FINISHED`/`POSTPONED`/`CANCELLED`. |
| FR-SEED-29.2 | **1 sola llamada** por corrida (el endpoint devuelve toda la competición). Sin llamadas por partido → el límite de 10 req/min nunca es un problema. |
| FR-SEED-29.3 | **Scope `FULL`** (no `FIXTURES`): evita el filtro `status=SCHEDULED` en la query, que descartaría los partidos `TIMED` (football-data marca los próximos como `TIMED`). El filtrado por estado lo hace el persist. |
| FR-SEED-29.4 | **API por defecto + snapshot de respaldo**: cada corrida hace la llamada y **reescribe** el snapshot commiteado. Si la API falla (key ausente, rate-limit, red) y existe snapshot → sembrar desde el snapshot con warning. **Sin API ni snapshot → el seed falla.** |
| FR-SEED-29.5 | **Idempotente**: persistencia keyed por `providerMatchId` (UPDATE si existe, CREATE solo de pendientes). Correr N veces converge al mismo estado. |
| FR-SEED-29.6 | Se **elimina** el seed estático incorrecto (`WORLD_CUP_2026_MATCHES`, `seedWorldCup2026()`, `upsertMatch`); el snapshot lo reemplaza como respaldo offline. |
| FR-SEED-29.7 | **Knockouts con equipos TBD**: en fase de grupos los partidos de eliminatorias vienen sin equipos resueltos; se registran igual (estado pendiente) con `homeTeamId`/`awayTeamId` = `null`. Futuros syncs los completan. |

## Diseño

Nuevo servicio `src/features/competition/services/seed-matches.ts` → `seedMatchesFromFootballData()`:

1. **Resolver payload** (1 llamada):
   - `try` → `new FootballDataProvider().fetch("FULL", { windowKey: "seed-full" })`; en éxito, **escribir snapshot**
     JSON (`{ teams, matches, providerRequestId, fetchedAt }`).
   - `catch` → leer snapshot; si existe → usarlo + `console.warn`; si no existe → **lanzar** (falla el seed).
2. **Persistir** alimentando el payload ya resuelto a `runCompetitionSync(provider, "FULL", { windowKey: "seed-full" })`
   mediante un *provider en memoria* trivial `{ fetch: async () => payload }`. Esto reutiliza, sin duplicar lógica:
   validación Zod, `upsertTeam`, `syncMatchesToDB` (idempotente por `providerMatchId`, create-only `SCHEDULED`/`LIVE`)
   y el registro `ProviderSyncRun` (windowKey estable `seed-full`).

`scripts/seed-competition.ts` llama `seedCompetitionStructure()` y luego `seedMatchesFromFootballData()`.

**Snapshot:** `src/features/competition/seed/snapshots/world-cup-2026-fixtures.json` (commiteado, reescrito en cada
corrida exitosa). Se genera en la primera corrida con `FOOTBALL_DATA_KEY` válido; no se fabrica con datos sintéticos.

### Trazabilidad código

| Requisito | Implementación |
|-----------|----------------|
| FR-SEED-29.1/29.3/29.5 | reúso de `syncMatchesToDB` vía `runCompetitionSync` (`sync-orchestrator.ts`), scope `FULL`. |
| FR-SEED-29.2/29.4 | `seed-matches.ts` (fetch único, write/read snapshot, fallback, fail). |
| FR-SEED-29.6 | eliminación en `upsert-competition-data.ts` y `seed/world-cup-2026.ts`. |
| FR-SEED-29.7 | comportamiento existente de `syncMatchesToDB` (teams `null` si `tla` no resuelve). |

## Fuera de alcance

- Alinear `fifaCode` sembrado ↔ `tla` de football-data (equipos cuyo `tla` difiera quedan con team `null`).
- Capturar placeholders de knockout ("Winner Group A") desde football-data (hoy `null`).
- Cron/automatización del refresco del snapshot (sigue siendo manual al correr el seed).

## Verificación

1. **Con API** (`FOOTBALL_DATA_KEY` válido): `pnpm prisma:seed:competition` → snapshot escrito; BD con partidos
   pendientes, 0 finalizados creados; knockouts con equipos `null`.
2. **Idempotencia**: correr 2 veces → conteo/campos estables (sin duplicados; `providerMatchId` único).
3. **Fallback**: sin key (o 429) **con** snapshot → siembra desde snapshot + warning, no falla.
4. **Fallo duro**: sin key/API **y** sin snapshot → exit ≠ 0.
5. Tests `__tests__/seed-matches.test.ts` (API-ok, fallback, fallo) + suite completa; tsc 0; Biome limpio.
