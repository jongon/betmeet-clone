# Unit 4: Competition Data and API Sync — Logical Components

> Componentes lógicos que materializan los patrones NFR de Unit 4. Los componentes UI están en `functional-design/frontend-components.md`.

---

## Component Map

```text
Provider Sync Runtime
├── Sync Trigger Guard                  ← Pattern 9
├── Sync Orchestrator                   ← Patterns 3/4/5/6/7
│   ├── Sync Lock Store                 ← Pattern 3
│   ├── football-data.org Provider Adapter   ← Patterns 5/10
│   ├── Provider DTO Validator          ← Pattern 5
│   ├── Competition Upsert Service      ← Pattern 5
│   └── Sync Logger                     ← Pattern 6
│
Fixture Read Runtime
├── Fixture Query Service               ← Pattern 1
├── Fixture Freshness Service           ← Pattern 2
├── Fixture Cache/Revalidation Adapter  ← Patterns 1/7
└── Flag Asset Registry                 ← Pattern 8

Testing
└── Provider Test Fixtures              ← Pattern 10
```

---

## Component 1: Sync Trigger Guard
- **Responsibility**: authorize manual/system sync triggers.
- **Inputs**: authenticated admin user or system cron secret.
- **Outputs**: allow/deny decision.
- **Rules**: no public trigger; rate-limit by scope; never expose API key.

## Component 2: Sync Orchestrator
- **Responsibility**: run one sync scope/window end-to-end.
- **Inputs**: `provider`, `scope`, `window`.
- **Flow**: acquire lock → fetch → normalize → validate → upsert → log → revalidate/TTL fallback.
- **Failure behavior**: sanitized log, bounded retry/backoff, release/expire lock.

## Component 3: Sync Lock Store
- **Responsibility**: prevent concurrent runs for same provider/scope/window.
- **Storage**: DB-backed run/lock table or fields in sync log with uniqueness.
- **Contract**: `acquire(scope, windowKey)`, `release(runId)`, `expireStaleLocks()`.

## Component 4: football-data.org Provider Adapter
- **Responsibility**: provider-specific HTTP fetch and raw-to-normalized mapping.
- **Inputs**: API key, scope, window.
- **Outputs**: provider-neutral DTOs for teams/fixtures/results/status.
- **Constraint**: no direct Prisma writes.

## Component 5: Provider DTO Validator
- **Responsibility**: validate normalized DTOs before persistence.
- **Inputs**: normalized provider DTOs.
- **Outputs**: valid DTOs or structured validation errors.
- **Examples**: required provider match id when present, valid status mapping, non-negative scores.

## Component 6: Competition Upsert Service
- **Responsibility**: idempotently persist competitions, teams, phases, matches, and results.
- **Rules**: provider IDs reconcile seed rows; manual override fields are preserved.
- **Consumers**: sync orchestrator, seed scripts, tests.

## Component 7: Sync Logger
- **Responsibility**: write `ProviderSyncLog` and structured critical app logs.
- **Fields**: provider, scope, status, counts, started/finished timestamps, sanitized error, safe metadata.
- **Retention**: 90 days.

## Component 8: Fixture Query Service
- **Responsibility**: serve grouped fixture data for `/matches`.
- **Inputs**: competition slug, filters, status/window.
- **Outputs**: phase-grouped match view model.
- **Performance**: mostly Server Component friendly; indexed queries.

## Component 9: Fixture Freshness Service
- **Responsibility**: compute stale/last sync state.
- **Inputs**: competition, current time, relevant `ProviderSyncLog` rows.
- **Outputs**: `FixtureFreshness { isStale, lastSyncedAt, reason }`.
- **Consumers**: fixture UI, future Unit 7 admin dashboard.

## Component 10: Fixture Cache/Revalidation Adapter
- **Responsibility**: encapsulate cache TTL and optional Next revalidation.
- **Behavior**: future fixture cache 5–15 min; live no-store/30–60s; final longer TTL.
- **Post-sync**: use `revalidateTag`/`revalidatePath` when available; TTL fallback otherwise.

## Component 11: Flag Asset Registry
- **Responsibility**: map `flagKey` to local `flagPath` and validate asset presence.
- **Inputs**: team seed data, `public/flags` directory.
- **Outputs**: valid flag paths or fallback metadata.
- **Build/dev check**: fail or warn on missing assets depending code-generation decision.

## Component 12: Provider Test Fixtures
- **Responsibility**: deterministic provider payload examples for tests.
- **Contents**: scheduled match, live match, finished match, postponed/cancelled status, knockout placeholder resolution, rate-limit/error sample.
- **Use**: adapter normalization and sync orchestration tests without real API calls.

---

## Component → Pattern → NFR Map

| Component | Patterns | NFR |
|---|---|---|
| Sync Trigger Guard | 9 | Security |
| Sync Orchestrator | 3,4,5,6,7 | Reliability, freshness, observability |
| Sync Lock Store | 3 | Concurrency |
| football-data.org Provider Adapter | 5,10 | Maintainability, testability |
| Provider DTO Validator | 5 | Data integrity |
| Competition Upsert Service | 5 | Idempotency, consistency |
| Sync Logger | 6 | Observability, retention |
| Fixture Query Service | 1 | Performance |
| Fixture Freshness Service | 2 | UX/reliability |
| Cache/Revalidation Adapter | 1,7 | Performance/freshness |
| Flag Asset Registry | 8 | Build safety |
| Provider Test Fixtures | 10 | Testability |
