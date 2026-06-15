# Unit 25: Sync con football-data.org — Plan de Ejecución

> Refine post-construcción, no reinicia Units 1–24. Reemplaza el stub `ApiFootballProvider` por `FootballDataProvider` implementando el contrato `CompetitionProvider` existente. Sin schema, migraciones ni rutas nuevas.

## Contexto

Actualmente el provider es un stub:

```ts
// src/features/competition/services/providers/api-football.ts
export class ApiFootballProvider implements CompetitionProvider {
  async fetch(_scope, _window) {
    const apiKey = process.env.API_FOOTBALL_KEY;
    if (!apiKey) throw new Error("API_FOOTBALL_KEY_MISSING");
    return { teams: [], matches: [] }; // ← stub
  }
}
```

El orquestador (`sync-orchestrator.ts`), el sweeper de scoring (`score-sweeper.ts`) y el trigger admin (`trigger-sync.ts`) ya están implementados y probados. Solo falta la fuente de datos real.

## API football-data.org

| Dato | Campo en API | Campo en NormalizedMatch/Team |
|------|-------------|------------------------------|
| ID del partido | `id` (int) | `providerMatchId` |
| Fecha kickoff | `utcDate` (ISO 8601) | `kickoffAt` |
| Status | `status` (string enum) | `status` (via status-mapping) |
| Marcador local | `score.fullTime.home` | `homeScore` |
| Marcador visitante | `score.fullTime.away` | `awayScore` |
| Equipo local TLA | `homeTeam.tla` | `homeFifaCode` |
| Equipo visitante TLA | `awayTeam.tla` | `awayFifaCode` |
| Número de jornada | `matchday` (int) | `matchNumber` |
| Fase | `stage` (string) | `phaseName` |
| Grupo | `group` (string o null) | (mapeado a phaseName) |

**Endpoint principal:** `GET /v4/competitions/WC/matches?season=2026`

**Rate limit free tier:** 10 req/min. El orquestador ya maneja `RATE_LIMITED` al detectar "RATE_LIMIT" en el mensaje de error.

## Steps

- [ ] **Step 1** — Crear `src/features/competition/services/providers/football-data.ts`: clase `FootballDataProvider` implementando `CompetitionProvider`.
  - `fetch(scope, window)` → llama a `https://api.football-data.org/v4/competitions/WC/matches?season=2026` (según scope: agrega filtros `status`, `dateFrom`, `dateTo`).
  - Lee `FOOTBALL_DATA_KEY` de `process.env`; tira `"FOOTBALL_DATA_KEY_MISSING"` si falta.
  - Mapea cada `match` de la API a `NormalizedMatch` y extrae `NormalizedTeam[]` de `homeTeam`/`awayTeam`.
  - Retorna `NormalizedProviderPayload { teams, matches, providerRequestId }`.

- [ ] **Step 2** — Extender `src/features/competition/services/status-mapping.ts`: agregar mapping de football-data.org status codes (`SCHEDULED`, `TIMED`, `IN_PLAY`, `PAUSED`, `LIVE`, `FINISHED`, `AWARDED`, `POSTPONED`, `SUSPENDED`, `CANCELLED`) a `MatchStatus`. El mapping existente de API-Football se conserva; el nuevo es un mapa separado.

- [ ] **Step 3** — Actualizar `src/features/admin/actions/trigger-sync.ts`:
  - Reemplazar `import { ApiFootballProvider }` → `import { FootballDataProvider }`
  - Reemplazar `new ApiFootballProvider()` → `new FootballDataProvider()`
  - Actualizar la constante de provider string en el orchestrator de `"API_FOOTBALL"` a `"FOOTBALL_DATA"` (campo `provider` en `ProviderSyncRun`).

- [ ] **Step 4** — Agregar `FOOTBALL_DATA_KEY="your-football-data-api-key"` en `.env.example`.

- [ ] **Step 5** — Tests:
  - `src/features/competition/services/__tests__/status-mapping.test.ts`: agregar casos para football-data.org status codes.
  - `src/features/competition/services/providers/__tests__/football-data.test.ts` (nuevo): test unitario del provider con fetch mockeado.

- [ ] **Step 6** — Verificación: `tsc --noEmit`, `vitest`, `biome check`, `eslint`, `next build`.

## Scope

| Scope | Mapping |
|-------|---------|
| `FIXTURES` | `GET …/matches?status=SCHEDULED` — trae fixtures futuros |
| `LIVE_STATUS` | `GET …/matches?status=LIVE` — actualiza partidos en vivo |
| `RESULTS` | `GET …/matches?status=FINISHED` — trae resultados |
| `FULL` | `GET …/matches?season=2026` — todos los partidos |

## Status Mapping (football-data.org → MatchStatus)

| football-data.org | MatchStatus |
|---|---|
| `SCHEDULED`, `TIMED` | `SCHEDULED` |
| `IN_PLAY`, `PAUSED`, `LIVE` | `LIVE` |
| `FINISHED`, `AWARDED` | `FINISHED` |
| `POSTPONED`, `SUSPENDED` | `POSTPONED` |
| `CANCELLED` | `CANCELLED` |

## Dependencias

- **Unit 4** (Competition Data & API Sync): `CompetitionProvider`, `NormalizedTeam`, `NormalizedMatch`, `sync-orchestrator`, `upsert-competition-data`.
- **Unit 6** (Scoring): `scoreMatch`, `scoreFinishedUnscoredMatches` (ya usados en el sweeper post-sync).
- **Unit 7** (Admin): `trigger-sync.ts`, `require-admin`.

## Notas

- Sin cambios en schema Prisma: el provider string en `ProviderSyncRun` cambia de `"API_FOOTBALL"` a `"FOOTBALL_DATA"` solo en el orquestador; la columna es `VarChar(40)`, no un enum.
- La sync sigue siendo manual (admin trigger). El cron job se evalúa a futuro.
- El provider viejo `api-football.ts` se conserva en el repo (puede eliminarse en un cleanup posterior si se confirma que no se usará más).
- `football-data.org` usa UTC en `utcDate` → compatible con `z.string().datetime()` de Zod.
- En el free tier, el campo `score` puede ser `null` para partidos sin finalizar. El adapter debe manejar `score.fullTime.home ?? null`.
