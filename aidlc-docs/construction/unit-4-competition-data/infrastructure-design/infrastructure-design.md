# Unit 4: Competition Data and API Sync — Infrastructure Design

> Mapeo de componentes lógicos a infraestructura real. Respuestas: Q1=A Supabase Edge Function scheduled; Q2=A trigger manual/dev protegido; Q3=A secrets en Supabase por entorno; Q4=A `provider_sync_runs` unificada; Q5=A RLS lectura autenticada/writes bloqueados; Q6=A flags SVG locales; Q7=A seed idempotente con datos iniciales reales; Q8=A cleanup en sync diario/script; Q9=A logs estructurados + tabla queryable; Q10=A previews con seed/mock por defecto.

---

## Component Mapping

| Logical Component | Infrastructure | Notes |
|---|---|---|
| Sync Trigger Guard | Supabase Edge Function auth + optional admin/server trigger | Cron/system secret or admin verification; no public trigger |
| Sync Orchestrator | Supabase Edge Function | Runs API-Football sync scopes and cleanup |
| Sync Lock Store | Supabase Postgres table `provider_sync_runs` | Unified lock + log with unique scope/window |
| API-Football Provider Adapter | Supabase Edge Function runtime | Uses `API_FOOTBALL_KEY` from Supabase secrets |
| Provider DTO Validator | Edge Function / shared TS module | Validates normalized DTOs before DB writes |
| Competition Upsert Service | Server/Edge code writing Postgres | Idempotent seed/sync upserts |
| Sync Logger | `provider_sync_runs` + structured logs | 90-day retention; sanitized messages |
| Fixture Query Service | Next.js Server Components / server queries | Reads Postgres; authenticated fixture access |
| Fixture Freshness Service | Next.js server query over `provider_sync_runs` | Computes `isStale`, `lastSyncedAt`, `reason` |
| Cache/Revalidation Adapter | Next.js cache/revalidate + TTL fallback | Future fixture cached; live short/no-store |
| Flag Asset Registry | `public/flags/*.svg` + validation script | Local assets committed to repo |
| Provider Test Fixtures | Repo test fixtures | Mock provider responses; previews use seed/mock unless key configured |

---

## Compute

### Supabase Edge Function Sync (Q1=A)

- Scheduled sync runs in Supabase Edge Functions.
- Next.js app reads normalized fixture data from Postgres and does not call API-Football for user requests.
- Edge Function scopes:
  - `TEAMS`
  - `FIXTURES`
  - `LIVE_STATUS`
  - `RESULTS`
  - `FULL`
  - `CLEANUP`

### Manual/Dev Trigger (Q2=A)

- Provide a protected manual trigger for bootstrap/debugging.
- Local/preview can run a script or protected trigger.
- Production trigger requires admin/system authorization and rate limiting by scope.

---

## Storage

### New Postgres Tables

| Table | Purpose |
|---|---|
| `competitions` | Active competition metadata (`world-cup-2026`) |
| `competition_phases` | Group/knockout/league phases |
| `teams` | Teams, FIFA code, flag key/path, provider IDs |
| `matches` | Fixture, team slots/placeholders, status, scores, override fields |
| `provider_sync_runs` | Unified sync lock/log/audit table |

### `provider_sync_runs` as Lock + Log (Q4=A)

- One table stores sync start/end/status and acts as lock.
- Unique key by `provider + scope + windowKey` for active/non-expired runs.
- Records statuses: `STARTED`, `SUCCESS`, `PARTIAL_SUCCESS`, `FAILED`, `RATE_LIMITED`, `SKIPPED_LOCKED`.
- Retained for 90 days; cleanup runs daily or via admin/script task.

---

## RLS / Access Control

### Fixture Reads (Q5=A)

- Authenticated users can read competitions, phases, teams, and matches.
- Direct client writes are denied by RLS.
- Server/Edge writes use privileged server context/service role.

### Sync Runs

- `provider_sync_runs` is not generally readable by normal users.
- Admin visibility is deferred to Unit 7.
- Writes only from server/system sync runtime.

---

## Secrets and Environment

### Supabase Secrets (Q3=A)

| Secret | Location | Purpose |
|---|---|---|
| `API_FOOTBALL_KEY` | Supabase Edge Function secret per environment | Provider API access |
| `SYNC_TRIGGER_SECRET` or equivalent | Supabase/Vercel server env if needed | Protected manual/system trigger |

Local development documents `.env` setup. Preview environments use seed/mock by default and only call API-Football if `API_FOOTBALL_KEY` is explicitly configured.

---

## Assets: Flags

### Local SVGs (Q6=A)

- Flags are copied into `public/flags/` by the reproducible `pnpm sync:flags` script.
- Required SVGs are committed to the repo.
- `teams.flagKey` maps to `public/flags/{flagKey}.svg`.
- UI falls back to FIFA code if an asset is missing, but validation should catch missing assets before deploy.
- Operational refine 2026-06-11: `lipis/flag-icons` selected as source, 48/48 seeded team flags downloaded and validated with `pnpm check:flags`.

---

## Seed Strategy

### Competition Seed (Q7=A)

- Add an idempotent `seed-competition` script.
- It must load initial World Cup 2026 data: competition, phases, teams, flags, and known fixture data.
- Initial data should be obtained during code generation from reliable public/provider sources and committed as seed data.
- The script runs after migrations in local/preview/prod; it must not run automatically on every build.
- Stored kickoff timestamps are UTC; UI converts to the user's local time.

---

## Cleanup and Retention

### 90-Day Cleanup (Q8=A)

- A cleanup scope/job deletes or archives `provider_sync_runs` older than 90 days.
- MVP implementation can run cleanup as part of daily sync or via admin/script task.
- Cleanup must not remove records needed for current stale calculation windows.

---

## Monitoring / Observability

### MVP Observability (Q9=A)

- `provider_sync_runs` is the queryable operational record.
- Critical failures also emit structured logs to Supabase/Vercel logs.
- No external alerting service in Unit 4.
- Unit 7 consumes `provider_sync_runs` for dashboard/alert surfaces.

---

## Preview / Quota Policy

### Preview Behavior (Q10=A)

- Preview deployments use seed/mock data by default.
- Preview calls API-Football only if an environment-specific `API_FOOTBALL_KEY` is explicitly configured.
- This protects provider quota and avoids noisy sync from every branch.

---

## Shared Infrastructure Changes

- Add `API_FOOTBALL_KEY` as a server/Edge-only secret.
- Add optional `SYNC_TRIGGER_SECRET` or equivalent if a protected system trigger is implemented.
- Add `scripts/seed-competition.ts` and flag asset validation/copy scripts to seed workflow.
- Add Supabase Edge Function + scheduled sync to shared operational notes.
