# Unit 4: Competition Data and API Sync — Deployment Architecture

## Topology

```text
                ┌─────────────────────────────┐
                │ Vercel Next.js App           │
                │ - /matches Server Components │
                │ - fixture freshness reads    │
                │ - protected admin/dev trigger│
                └──────────────┬──────────────┘
                               │ read via Prisma/Supabase
                               ▼
┌───────────────────────────────────────────────────────────────┐
│ Supabase Postgres                                              │
│ competitions · competition_phases · teams · matches            │
│ provider_sync_runs (lock + log)                                │
└───────────────────────▲───────────────────────────────────────┘
                        │ writes normalized data
                        │
          ┌─────────────┴─────────────┐
          │ Supabase Edge Function     │
          │ competition-sync           │
          │ - scheduled cron           │
          │ - manual protected trigger │
          │ - cleanup scope            │
          └─────────────┬─────────────┘
                        │ server-side only
                        ▼
                 football-data.org
```

---

## Environments

| Environment | Fixture Data | football-data.org Calls | Secrets |
|---|---|---|---|
| Local | `seed-competition` + optional mock fixtures | Optional, only with local key | `.env` / Supabase local secrets |
| Preview | Seed/mock by default | Only if key explicitly configured | Preview Supabase secret if needed |
| Production | Seed + scheduled API sync | Yes | Production Supabase secrets |

---

## Deployment / Migration Flow

1. Apply Supabase migrations for Unit 4 tables/RLS/indexes.
2. Deploy Supabase Edge Function `competition-sync`.
3. Configure `FOOTBALL_DATA_KEY` in Supabase secrets per environment where real sync is allowed.
4. Run `seed-competition` idempotently after migrations.
5. Copy/validate `public/flags/*.svg` before app deployment.
6. Deploy Next.js app to Vercel.

---

## Seed Flow

```text
seed-competition
  ├─ read committed World Cup 2026 seed data
  ├─ validate flags exist in public/flags
  ├─ upsert competition/phases/teams/matches
  └─ leave provider IDs nullable until sync reconciles them
```

Seed data must include known initial fixture/team data and UTC kickoff timestamps. The user-facing fixture renders times in the viewer's local timezone.

---

## Scheduled Sync Flow

```text
cron invokes competition-sync(scope, window)
  ├─ acquire provider_sync_runs lock
  ├─ fetch football-data.org with FOOTBALL_DATA_KEY
  ├─ normalize provider payload
  ├─ validate DTOs
  ├─ idempotent upsert into Postgres
  ├─ write provider_sync_runs status/counts/error metadata
  ├─ cleanup runs older than 90 days (daily scope)
  └─ allow Next cache TTL/revalidation strategy to refresh reads
```

Sync cadences:
- Daily fixture/team reconciliation outside match windows.
- Fast live/status/result sync every 1–5 minutes during match-day/live windows.

---

## Manual Sync Flow

```text
admin/dev trigger
  ├─ verify admin or system secret
  ├─ validate scope/window
  ├─ rate-limit by scope
  └─ invoke same sync orchestrator as cron
```

Production manual sync must never be public or protected only by obscure URLs.

---

## Read Flow for `/matches`

```text
browser -> Vercel /matches
  ├─ Server Component queries fixture data from Postgres
  ├─ FixtureFreshness reads latest provider_sync_runs SUCCESS/RATE_LIMITED/FAILED
  ├─ render grouped fixture with local-time formatting
  └─ show stale banner if isStale
```

Cache:
- Future scheduled data: short revalidate.
- Live/match-day data: no-store or 30–60s.
- Finished historical data: longer revalidate.

---

## RLS / Security Boundary

| Resource | Authenticated user | Admin/system |
|---|---|---|
| competitions/phases/teams/matches | read | write via server/service role |
| provider_sync_runs | no normal-user read in v1 | read/write |
| Edge Function sync | no access | cron secret/admin/system trigger |
| FOOTBALL_DATA_KEY | no access | Edge Function runtime only |

---

## Operational Notes

- Logs are queryable via `provider_sync_runs` and visible in platform logs as structured error entries.
- No external alerting service is introduced in Unit 4.
- Unit 7 will build admin dashboard and persistent-failure override workflows on top of these tables and fields.
