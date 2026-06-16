# Unit 25 — Sync con football-data.org · Functional Design

> Refine post-construcción. Refina Unit 4 (Competition Data & API Sync): reemplaza el
> stub `ApiFootballProvider` por `FootballDataProvider` implementando el contrato
> `CompetitionProvider` existente. **No reinicia** Units aprobadas. Cubre FR-FD-25.1 y
> la Épica 24 (US-24.1). Sin schema, migraciones ni rutas. Español (AGENTS.md).

## 1. Alcance y trazabilidad

| Historia | FR | Resultado |
|----------|----|-----------|
| US-24.1 | FR-FD-25.1 | La sincronización admin trae fixtures y resultados reales desde football-data.org a través de un provider adapter, sin tocar el orquestador ni el schema. |

## 2. Estado del código existente

- El orquestador (`sync-orchestrator.ts`), el sweeper de scoring (`score-sweeper.ts`) y
  el trigger admin (`trigger-sync.ts`) **ya** estaban implementados y probados (Unit 4/6/7).
- El provider era un **stub** (`api-football.ts`) que devolvía `{ teams: [], matches: [] }`.
- Solo faltaba la **fuente de datos real**: este es el alcance de Unit 25.

## 3. Diseño

### 3.1 `FootballDataProvider` (`services/providers/football-data.ts`)
Implementa `CompetitionProvider`:
- `fetch(scope, window)` → `GET https://api.football-data.org/v4/competitions/WC/matches?season=2026`
  con header `X-Auth-Token: FOOTBALL_DATA_KEY`; tira `"FOOTBALL_DATA_KEY_MISSING"` si falta la env.
- Mapea cada `match` del API a `NormalizedMatch` y extrae `NormalizedTeam[]` de `homeTeam`/`awayTeam`.
- Marcadores con `score.fullTime.home ?? null` / `score.fullTime.away ?? null` (free tier deja `score` null en partidos no finalizados).
- Fase vía `stageToPhaseName`; `homeFifaCode`/`awayFifaCode` desde `homeTeam.tla`/`awayTeam.tla`.
- Retorna `NormalizedProviderPayload { teams, matches, providerRequestId }`.
- En 429 traduce a `RATE_LIMITED` (el orquestador ya detecta `"RATE_LIMIT"` en el mensaje).

### 3.2 Status mapping (`status-mapping.ts`)
`mapFootballDataStatus` (mapa separado del de API-Football, que se conserva):

| football-data.org | MatchStatus |
|---|---|
| `SCHEDULED`, `TIMED` | `SCHEDULED` |
| `IN_PLAY`, `PAUSED`, `LIVE` | `LIVE` |
| `FINISHED`, `AWARDED` | `FINISHED` |
| `POSTPONED`, `SUSPENDED` | `POSTPONED` |
| `CANCELLED` | `CANCELLED` |

### 3.3 Scope → query

| Scope | Query |
|-------|-------|
| `FIXTURES` | `?status=SCHEDULED` |
| `LIVE_STATUS` | `?status=LIVE` |
| `RESULTS` | `?status=FINISHED` |
| `FULL` | `?season=2026` |

### 3.4 Trigger admin
`trigger-sync.ts` instancia `FootballDataProvider`; el orquestador escribe
`provider="FOOTBALL_DATA"` en `ProviderSyncRun` (columna `VarChar(40)`, no enum).

## 4. Contratos y dependencias

- **Unit 4**: `CompetitionProvider`, `NormalizedTeam`, `NormalizedMatch`, `sync-orchestrator`, `upsert-competition-data`.
- **Unit 6**: `scoreMatch`, `scoreFinishedUnscoredMatches` (sweeper post-sync).
- **Unit 7**: `trigger-sync.ts`, `require-admin`.
- Env nueva: `FOOTBALL_DATA_KEY` en `.env.example`.

## 5. NFR / Infraestructura

- SKIP formal: sin nuevos NFR ni infra; reutiliza el orquestador y el rate-limit handling existentes.
- Seguridad: la API key vive en server env; nunca se expone al cliente.

## 6. Verificación esperada

- `tsc --noEmit` (0), `vitest --dir src`, `biome check src` (limpio salvo warning preexistente de `<img>`), `eslint src` (0).
- Tests: `providers/__tests__/football-data.test.ts` (fetch mockeado) + casos `mapFootballDataStatus` en `status-mapping.test.ts`.
- Cleanup: stub muerto `api-football.ts` eliminado (0 referencias) y `API_FOOTBALL_KEY` removido de `.env.example`.

## 7. Notas

- La sync sigue siendo manual (admin trigger); el cron job se evalúa a futuro.
- `football-data.org` usa UTC en `utcDate` → compatible con `z.string().datetime()` de Zod.
- Plan de ejecución: `construction/plans/unit-25-football-data-sync-code-generation-plan.md`.
