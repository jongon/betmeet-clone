# Unit 4: Competition Data and API Sync — NFR Requirements

## Scope

Unit 4 introduces dynamic fixture data, API-Football synchronization, match-day freshness, local flag assets, and provider sync logs. It inherits the global stack and security baseline: Next.js 16 App Router, Supabase/PostgreSQL, Prisma, Vercel, server-side validation, RLS, and no client-exposed secrets.

---

## Scale Baseline

**Decision: Q1 = B, MVP pequeño.**

| Parameter | Target |
|---|---|
| Registered users | ~200 initial MVP users |
| Fixture page peak | ~2,000 views/day during launch or match-day peaks |
| Active competition | 1 active competition: World Cup 2026 |
| Teams | Up to 48 teams for World Cup 2026 |
| Matches | World Cup 2026 fixture scale, plus future extensibility |
| Provider sync logs | Retained 90 days |

Implication: avoid heavy upfront architecture, but keep clean indexes, idempotent sync, and cache boundaries so the design can grow to a moderate MVP later without rewriting the domain.

---

## Freshness Requirements

**Decision: Q2 = A.**

| Surface | Freshness Target |
|---|---|
| Future fixture dates/teams | Daily sync is sufficient outside match-day windows |
| Live match status/scores | Target staleness: 1–5 minutes |
| Final results | Sync promptly after match completion; target visible within 5 minutes of provider update |
| Fixture read UI | Shows last known data and stale marker when provider sync is degraded |

The product is a quiniela MVP, not live betting. Sub-30-second updates are explicitly out of scope.

---

## Availability and Degradation

**Decision: Q3 = A + admin override expectation in Unit 7.**

- If API-Football is down, rate-limited, or returns errors, the app must continue serving the last known good fixture data.
- Fixture UI must indicate stale data using `lastSyncedAt` or equivalent copy/state.
- Sync failures must create sanitized `ProviderSyncLog` records.
- Persistent provider failure must be visible to admins in Unit 7 and resolvable through manual override flows built in Unit 7.
- Unit 4 prepares override fields and must not let provider sync overwrite future manual overrides.

---

## Provider Payload and Logging Requirements

**Decision: Q4 = A, Q8 = A.**

| Requirement | Target |
|---|---|
| Raw provider payloads | Not persisted by default |
| Persisted sync data | Normalized fields + sanitized metadata only |
| Error logging | Sanitized messages; no API keys, auth headers, or large raw payloads |
| Sync log retention | 90 days |
| Provider diagnostics | `providerRequestId`, scope, item counts, window metadata when safe |

Temporary local/debug payload capture can be used during development, but it must not become default production persistence.

---

## Secret Management Requirements

**Decision: Q5 = A.**

- API-Football key lives only in server-side env/secret manager as `API_FOOTBALL_KEY` or equivalent.
- It must never be prefixed with `NEXT_PUBLIC`.
- It must never be sent to client components, browser logs, sync logs, or error responses.
- Sync code must fail closed if the key is missing: record a sanitized sync failure and avoid partial unauthenticated provider calls.

---

## Caching Requirements

**Decision: Q6 = A.**

| Data Type | Cache Strategy |
|---|---|
| Future fixture / teams / phases | Server-side cache or short revalidate window |
| Match-day upcoming/live data | No-store or very short revalidate window |
| Finished historical matches | Longer revalidate acceptable after result finalized |
| Provider API responses | Do not use client-side provider fetch; sync persists normalized data in DB |

The database remains the source of truth for reads. Users do not call API-Football directly.

---

## Performance Requirements

**Decision: Q7 = A.**

| Metric | Target |
|---|---|
| `/matches` LCP on mobile 4G | < 2.5 s |
| `/matches` TTFB | < 800 ms for cached/simple fixture reads |
| Client JS per route | < 150 KB gzip |
| Fixture rendering | Mostly Server Components; client JS only for filters/interactions that need it |
| Flag assets | Local SVGs, optimized by small file size and browser caching |

For MVP pequeño, these targets are achievable without materialized read models. If scale grows, consider fixture summary tables or cache tags per competition/status.

---

## Observability and Alerting Requirements

**Decision: Q9 = A.**

Minimum useful alert conditions:

- 3 consecutive sync failures for the same provider/scope.
- Sustained rate-limit responses.
- No successful sync within the expected match-day/live window.
- Missing API key or provider auth failure.

MVP may surface these through logs and admin-visible status first; external alert routing can be refined in Infrastructure Design / Unit 7.

---

## Sync Execution Requirements

**Decision: Q10 = A.**

Baseline assumption for NFR: Supabase Edge Functions + scheduled/cron-style execution for provider sync, persisting normalized data and `ProviderSyncLog` records in Postgres.

Required qualities:
- Idempotent and safe to retry.
- Rate-limit aware.
- Scoped sync windows to avoid unnecessary provider calls.
- Logs start/end/status even on failure.
- No dependency on browser/client execution.

Exact cron mechanism is finalized in Infrastructure Design.

---

## Security Requirements

| Area | Requirement |
|---|---|
| Secrets | Server-side only; never client-exposed |
| Writes | Server-side only; RLS denies direct client writes to competition/match/sync tables |
| Reads | Authenticated users may read fixture data needed for gameplay |
| Logs | No secrets, raw headers, or large raw provider payloads |
| Errors | User-facing errors hide provider internals |
| Sync auth | Manual sync/admin triggers require admin/system authorization |

---

## Reliability Requirements

- Seed data must make fixture screens usable before first provider sync succeeds.
- Sync must reconcile seeded rows with provider IDs without duplication.
- Provider sync must not overwrite manually overridden match data once Unit 7 enables overrides.
- `LOCKED` status/derived lock must fail closed for predictions when kickoff has passed.
- Missing flag assets degrade to text/FIFA code fallback.

---

## Summary of Measurable Targets

| NFR | Target |
|---|---|
| Scale | ~200 users, ~2,000 fixture views/day peak |
| Live staleness | 1–5 minutes |
| Fixture LCP | < 2.5 s mobile 4G |
| TTFB | < 800 ms for cached/simple reads |
| Client JS | < 150 KB gzip per fixture route |
| Sync logs | 90 days retention |
| Provider degradation | Last known good data + stale marker |
| Alerts | 3 failures, sustained rate-limit, missed match-day sync window |
