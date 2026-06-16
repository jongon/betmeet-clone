# Unit 4: Competition Data and API Sync — Business Rules

## Competition and Fixture

| ID | Rule |
|---|---|
| BR-4.1 | v1 must operate on one active competition: World Cup 2026. |
| BR-4.2 | The schema must support future competitions and phase types beyond World Cup 2026. |
| BR-4.3 | A competition must have a stable unique `slug`. |
| BR-4.4 | Fixture data must be available from seed data before provider sync succeeds. |
| BR-4.5 | Seed and sync operations must be idempotent. |
| BR-4.6 | Fixture UI must group/order matches by phase and kickoff/match number. |
| BR-4.7 | Server timestamps are stored in UTC; UI displays local time for the user. |

## Teams and Flags

| ID | Rule |
|---|---|
| BR-4.8 | Teams display a 3-character FIFA football code, not ISO alpha-3. |
| BR-4.9 | Team flags must be served from local assets under `public/flags/`; runtime hotlinking to GitHub/CDN is not allowed. |
| BR-4.10 | Team records must store a flag key/path separately from the display FIFA code. |
| BR-4.11 | The flag key must support ISO alpha-2 and subdivision keys such as `gb-eng`. |
| BR-4.12 | Missing flag assets must degrade to a text/code fallback, not break fixture rendering. |

## Match Status and Prediction Eligibility

| ID | Rule |
|---|---|
| BR-4.13 | Domain match status is limited to `SCHEDULED`, `LOCKED`, `LIVE`, `FINISHED`, `POSTPONED`, `CANCELLED`. |
| BR-4.14 | Raw provider status must be retained separately for diagnostics. |
| BR-4.15 | A match with kickoff in the past must not remain prediction-editable even if the provider has not marked it live. |
| BR-4.16 | Knockout matches may exist with unresolved teams using placeholders. |
| BR-4.17 | A match is not prediction-eligible until both teams and kickoff are known. |
| BR-4.18 | Finished matches must store final score and winner when available. |
| BR-4.19 | Penalty shootout scores are stored separately from regular/official match goals. |
| BR-4.20 | Postponed/cancelled matches must fail closed for predictions until a later unit defines rescheduling behavior. |

## Pool Freeze Integration

| ID | Rule |
|---|---|
| BR-4.21 | Unit 4 must provide the competition lock time used by Unit 3 membership freeze. |
| BR-4.22 | The competition lock time is `Competition.startsAt` when present, otherwise earliest active competition match kickoff. |
| BR-4.23 | `WORLD_CUP_KICKOFF` remains a fallback only if DB fixture data is unavailable. |

## Provider Sync

| ID | Rule |
|---|---|
| BR-4.24 | La integración del proveedor (football-data.org desde Unit 25; antes API-Football) debe implementarse detrás de la interfaz adapter `CompetitionProvider`. La regla del adapter sigue vigente; solo cambió la implementación concreta. |
| BR-4.25 | Provider API keys must never be stored in source code or client-exposed variables. |
| BR-4.26 | Sync attempts must write `ProviderSyncLog` records with sanitized errors. |
| BR-4.27 | Sync must support at least fixtures, results, live status, and teams scopes. |
| BR-4.28 | Provider sync must be idempotent and reconcile seeded rows with provider identifiers. |
| BR-4.29 | Provider sync must be rate-limit aware and safe to retry. |
| BR-4.30 | The functional cadence requires slow daily future-fixture sync and fast 1–5 minute match-day/live sync. |
| BR-4.31 | Provider payloads must not be logged wholesale if they can contain excessive data or sensitive headers. |

## Manual Override Boundary

| ID | Rule |
|---|---|
| BR-4.32 | Unit 4 prepares manual override fields but does not expose admin override UI/actions. |
| BR-4.33 | Provider sync must not overwrite manually overridden result/status fields. |
| BR-4.34 | Unit 7 owns manual override authorization, audit reason, and scoring recalculation trigger. |

## Security and Authorization

| ID | Rule |
|---|---|
| BR-4.35 | Public/user fixture reads may be broadly available to authenticated users, but writes are server-side only. |
| BR-4.36 | Sync operations require server-side admin/system authorization. |
| BR-4.37 | RLS must deny direct client writes to competition, team, match, and sync log tables. |
| BR-4.38 | Errors shown to users must not expose provider internals or API secrets. |

## Future Unit 10 Notification Events

| ID | Rule |
|---|---|
| BR-4.39 | Match sync/status updates may emit deduplicated Unit 10 events for `MATCH_STARTED`, `MATCH_FINISHED`, and `GOAL_SCORED` after the core match update succeeds. |
| BR-4.40 | Notification event production must be best-effort and must not block provider sync, fixture reads, or match result persistence. |
