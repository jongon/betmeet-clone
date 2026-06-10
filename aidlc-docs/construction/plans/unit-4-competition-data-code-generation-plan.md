# Unit 4: Competition Data and API Sync — Code Generation Plan

> Single source of truth para la generación de Unit 4. Code Generation Part 2 ejecuta estos pasos tras aprobación.

## Unit Context
- **Workspace root**: `/var/www/html` · **Code location**: `src/`, `prisma/`, `supabase/`, `scripts/`, `public/flags/`.
- **Project type**: Greenfield feature slice in existing Next.js 16 monolith.
- **Novedad vs Unit 3**: crea feature `competition`, tablas nuevas, seed real inicial, assets SVG locales y sync foundation.

## Stories
- **US-2.1** Visualización del Fixture.
- **US-2.2** Estado del Partido.
- **US-2.3** Desbloqueo de Llaves.
- **US-6.1** Sincronización API-Football (foundation; dashboard admin completo en Unit 7).

## Decisions Carried Into Code
- MVP pequeño: ~200 usuarios, ~2,000 vistas/día pico.
- Seed real/reconciliable + API-Football adapter.
- FIFA trigram visible; flags SVG locales en `public/flags/`.
- `Competition` extensible; UI v1 solo Mundial 2026.
- Estados: `SCHEDULED`, `LOCKED`, `LIVE`, `FINISHED`, `POSTPONED`, `CANCELLED`.
- Sync scheduled baseline: Supabase Edge Function + `provider_sync_runs` unificada.
- Preview usa seed/mock salvo `API_FOOTBALL_KEY` explícita.
- Horarios almacenados UTC; UI muestra hora local del usuario.

---

## Generation Steps

### Step 1 — Data Model (Prisma)
- [x] Add enums: `CompetitionPhaseType`, `MatchStatus`, `ProviderSyncStatus`, `ProviderSyncScope`.
- [x] Add models: `Competition`, `CompetitionPhase`, `Team`, `Match`, `ProviderSyncRun`.
- [x] Relations/indexes:
  - `Competition.slug` unique, `isActive` index.
  - `Team.fifaCode` unique, provider team id optional unique/index.
  - `Match.providerMatchId` optional unique/index, indexes on `competitionId`, `phaseId`, `status`, `kickoffAt`.
  - `ProviderSyncRun` indexes on provider/scope/status/startedAt; support unique active/window lock where possible in SQL migration.
- [x] `pnpm prisma:generate`.

### Step 2 — Supabase Migration + RLS
- [x] Add migration `supabase/migrations/20260610000006_create_competition_data.sql`.
- [x] Add constraints not expressible in Prisma:
  - non-negative scores/penalty scores.
  - unique provider IDs where not null if Prisma cannot express partial behavior cleanly.
  - sync lock uniqueness for `provider + scope + window_key` when active/non-expired if feasible; otherwise document application-level lock plus index.
- [x] RLS:
  - authenticated `SELECT` for competitions/phases/teams/matches.
  - no client writes.
  - `provider_sync_runs` read/write server/admin only; no normal-user read in v1.

### Step 3 — Types and Schemas
- [x] `src/features/competition/types.ts`: view models (`FixtureView`, `PhaseView`, `MatchView`, `TeamView`, `FixtureFreshness`).
- [x] `src/features/competition/schemas.ts`: sync scope/window validation, provider DTO validation helpers using Zod.
- [x] Keep route/user-facing types independent from Prisma internals.

### Step 4 — Seed Data and Scripts
- [x] Add `src/features/competition/seed/world-cup-2026.ts` or `data/world-cup-2026.ts` with initial World Cup 2026 competition/team/known fixture data.
- [x] Add `scripts/seed-competition.ts` idempotent upsert script.
- [x] Data source requirement: obtain best available initial World Cup 2026 data at generation time, store UTC kickoff timestamps when known; allow TBD/null fields where official fixture/team data is not finalized.
- [x] Ensure seed can run local/preview/prod after migrations; never auto-run during build.

### Step 5 — Flag Assets
- [x] Add `public/flags/` with required SVGs for seeded teams.
- [x] Add script/check (e.g. `scripts/check-flags.ts` or `scripts/sync-flags.ts`) validating every `flagKey` maps to `public/flags/{flagKey}.svg`.
- [x] UI fallback: FIFA code if flag asset missing.
- [x] No runtime hotlinking.

### Step 6 — Provider Interface + API-Football Adapter
- [x] `src/features/competition/services/providers/types.ts`: provider interface and normalized DTOs.
- [x] `src/features/competition/services/providers/api-football.ts`: fetch + normalize; no Prisma writes.
- [x] Server-only secret access: `API_FOOTBALL_KEY`; fail closed with sanitized error.
- [x] No raw payload persistence by default.

### Step 7 — Status Mapping and DTO Validation
- [x] `status-mapping.ts`: raw API-Football statuses → domain `MatchStatus` (`SCHEDULED`, `LOCKED`, `LIVE`, `FINISHED`, `POSTPONED`, `CANCELLED`).
- [x] Zod validation for normalized teams/fixtures/results/status DTOs.
- [x] Tests for representative scheduled/live/finished/postponed/cancelled/rate-limit cases.

### Step 8 — Sync Orchestrator + Lock/Log
- [x] `sync-orchestrator.ts`: acquire lock, bounded retry/backoff, fetch, normalize, validate, upsert, log counts/status/errors, cleanup old runs.
- [x] `provider-sync-runs` service: create/update runs, skip active lock, mark failed/expired.
- [x] Preserve manual override fields when syncing matches.
- [x] Implement cleanup of runs older than 90 days in daily scope or callable service.

### Step 9 — Competition Upsert Service
- [x] `upsert-competition-data.ts`: idempotent upserts for competition, phases, teams, matches.
- [x] Reconcile seeded rows with provider IDs.
- [x] Avoid duplicate teams/matches across repeated seed/sync.

### Step 10 — Fixture Queries + Freshness Service
- [x] `queries.ts`: active competition, grouped fixture, filters by phase/group/status/date.
- [x] `fixture-freshness.ts`: compute `isStale`, `lastSyncedAt`, `reason` from `ProviderSyncRun`.
- [x] Store UTC, render local time in UI.

### Step 11 — Replace Unit 3 Competition Lock Source
- [x] Modify `src/features/pools/services/competition-lock.ts` to read active competition first kickoff via Unit 4 service, with `WORLD_CUP_KICKOFF` fallback.
- [x] Preserve existing call-sites (`isFrozen`) as much as possible; adjust async boundary if required.
- [x] Update pool actions/tests if lock lookup becomes async.

### Step 12 — Supabase Edge Function / Sync Runtime Artifacts
- [x] Add `supabase/functions/competition-sync/` Edge Function scaffold or equivalent script entrypoint.
- [x] It invokes the same sync orchestration services or documents any runtime sharing limitation.
- [x] Add local/dev protected manual trigger path/script if feasible.
- [x] Document env/secrets: `API_FOOTBALL_KEY`, optional `SYNC_TRIGGER_SECRET`.

### Step 13 — Fixture UI Route and Components
- [x] Add route `/matches` (or `/fixture`; default recommended `/matches`).
- [x] Components under `src/features/competition/components/`: `fixture-filters`, `phase-section`, `match-card`, `team-badge`, `match-status-badge`, `fixture-stale-banner`, empty/error states.
- [x] Use Server Components by default; client JS only if necessary.
- [x] Data-testid stable for main states.

### Step 14 — Navigation / Integration
- [x] Add links/CTAs where appropriate from landing/onboarding/rules or pools to fixture if existing UX patterns support it.
- [x] Ensure `/matches` is gated consistently by `proxy.ts` (authenticated + completed profile unless explicitly public; current default already gates non-public routes).

### Step 15 — Tests
- [x] Unit tests:
  - status mapping.
  - fixture freshness stale/not stale.
  - seed/upsert idempotency with Prisma mocked.
  - sync lock skip/expire behavior.
  - manual override preservation policy.
  - flag asset validation script logic.
  - Unit 3 freeze integration (DB first kickoff + env fallback).
- [x] Keep `pnpm test`, `pnpm check`, `pnpm build` passing.

### Step 16 — Documentation
- [x] Add `aidlc-docs/construction/unit-4-competition-data/code/generation-summary.md`.
- [x] Update `shared-infrastructure.md` only if implementation differs from Infra Design.
- [x] Document how to run `seed-competition`, flag validation, and sync locally.

---

## Trazabilidad story → steps

| Story | Steps |
|---|---|
| US-2.1 Fixture | 1,2,3,4,5,10,13,14,15 |
| US-2.2 Match status | 1,2,6,7,8,10,13,15 |
| US-2.3 Knockout unlock | 1,2,4,7,9,10,13,15 |
| US-6.1 Sync foundation | 1,2,6,7,8,9,12,15,16 |
| Unit 3 freeze dependency | 10,11,15 |

## Notes / Risks
- FIFA World Cup 2026 fixture/team data may be incomplete depending on current official availability. Code generation should seed known real data and represent unknown teams/kickoffs with nullable fields/placeholders rather than inventing fake facts.
- If sharing Next/Prisma service code directly with Supabase Edge Functions is impractical, keep the orchestration core in portable modules and document runtime-specific wrappers.
- Any new external library must be checked with Context7 first. No new npm dependency is currently expected; use built-in `fetch`, Prisma, Zod, and existing tooling.
