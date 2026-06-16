# Unit 4: Competition Data and API Sync — Domain Entities

## Scope

Unit 4 owns the tournament data needed by predictions and scoring: competitions, phases, teams, matches, match status/results, local flag assets, provider identifiers, and sync logs.

The v1 product UI targets **FIFA World Cup 2026 only**, but the data model is intentionally extensible to future competitions with different structures.

---

## Competition

Represents a tournament edition.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `slug` | string | Stable unique slug, e.g. `world-cup-2026` |
| `name` | string | Display name |
| `season` | string | e.g. `2026` |
| `startsAt` | datetime nullable | First official kickoff if known; may be derived from earliest match |
| `endsAt` | datetime nullable | End date for the tournament |
| `timezone` | string | Canonical tournament timezone for imported fixtures |
| `provider` | enum/string | e.g. `FOOTBALL_DATA` (sync); nullable for seeded/manual data |
| `providerCompetitionId` | string nullable | External provider competition/league id |
| `isActive` | boolean | Active competition used by v1 screens and Unit 3 freeze lookup |
| `createdAt` / `updatedAt` | datetime | Audit timestamps |

### Relationships
- Has many `CompetitionPhase`.
- Has many `Match` through phases.

### Notes
- Only one competition should be active for v1 user flows.
- Future competitions can reuse phases and matches without changing predictions/scoring domain concepts.

---

## CompetitionPhase

Represents a stage/phase within a competition.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `competitionId` | UUID | FK to `Competition` |
| `name` | string | e.g. `Group Stage`, `Round of 16`, `Quarter-finals` |
| `type` | enum | `GROUP`, `KNOCKOUT`, `LEAGUE` |
| `groupCode` | string nullable | e.g. `A`, `B`; only for group sub-phases |
| `displayOrder` | int | Stable ordering in fixture UI |
| `startsAt` / `endsAt` | datetime nullable | Optional phase window |
| `providerPhaseId` | string nullable | Provider stage/round identifier when available |

### Notes
- World Cup 2026 group phase can be modeled as multiple `GROUP` phases, one per group, or as one group-stage parent plus group code on matches. For code-generation simplicity, v1 should store `groupCode` on phase or match consistently.
- Knockout phases support matches with unresolved participant slots.

---

## Team

Represents a national team or future club/team participant.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | string | Display name, e.g. `Argentina` |
| `fifaCode` | string | 3-char football display code, e.g. `ARG`, `GER`, `NED` |
| `isoAlpha2` | string nullable | Flag key for countries, e.g. `ar`, `de`; nullable for non-country teams |
| `flagKey` | string | Local asset key, supports subdivisions like `gb-eng` |
| `flagPath` | string | Local public path, e.g. `/flags/ar.svg` |
| `providerTeamId` | string nullable | External provider id |
| `createdAt` / `updatedAt` | datetime | Audit timestamps |

### Notes
- v1 displays `fifaCode`, not ISO alpha-3.
- Flag SVGs are copied locally to `public/flags/`; runtime must not hotlink GitHub/CDN assets.
- England/Scotland/Wales style cases use subdivision flag keys (`gb-eng`, etc.) rather than ISO alpha-2 countries.

---

## Match

Represents a scheduled or completed fixture.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `competitionId` | UUID | FK to `Competition` |
| `phaseId` | UUID | FK to `CompetitionPhase` |
| `providerMatchId` | string nullable | External fixture id; unique per provider when present |
| `matchNumber` | int nullable | Tournament fixture number if available |
| `kickoffAt` | datetime nullable | Server-authoritative kickoff used by Unit 5 locks |
| `status` | enum | `SCHEDULED`, `LOCKED`, `LIVE`, `FINISHED`, `POSTPONED`, `CANCELLED` |
| `rawStatus` | string nullable | Raw provider status for diagnostics |
| `homeTeamId` | UUID nullable | Null while knockout slot unresolved |
| `awayTeamId` | UUID nullable | Null while knockout slot unresolved |
| `homePlaceholder` | string nullable | e.g. `1st Group A` |
| `awayPlaceholder` | string nullable | e.g. `2nd Group B` |
| `homeScore` | int nullable | Current/final regular score as provider reports it |
| `awayScore` | int nullable | Current/final regular score as provider reports it |
| `homePenaltyScore` | int nullable | Penalty shootout score, if applicable |
| `awayPenaltyScore` | int nullable | Penalty shootout score, if applicable |
| `winnerTeamId` | UUID nullable | Winner after regular/extra/penalties when known |
| `manualOverride` | boolean | True if result/status has been manually corrected by admin (Unit 7) |
| `manualOverrideReason` | string nullable | Required when Unit 7 performs override |
| `overriddenByUserId` | UUID nullable | Admin profile/user id (Unit 7) |
| `overriddenAt` | datetime nullable | Override timestamp |
| `createdAt` / `updatedAt` | datetime | Audit timestamps |

### Notes
- `LOCKED` is a derived/persistable state for “kickoff passed, not yet live/finished”. Unit 5 treats `LOCKED`, `LIVE`, `FINISHED`, `POSTPONED`, and `CANCELLED` as not predictably editable unless explicitly allowed by later rules.
- A match is prediction-eligible only when `homeTeamId`, `awayTeamId`, and `kickoffAt` are all present and status is `SCHEDULED` before kickoff.

---

## ProviderSyncLog

Records sync attempts with football-data.org (desde Unit 25; antes API-Football) or future providers.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `provider` | enum/string | e.g. `FOOTBALL_DATA` |
| `scope` | enum/string | `FIXTURES`, `RESULTS`, `LIVE_STATUS`, `TEAMS`, `FULL` |
| `status` | enum | `STARTED`, `SUCCESS`, `PARTIAL_SUCCESS`, `FAILED`, `RATE_LIMITED` |
| `startedAt` | datetime | Attempt start |
| `finishedAt` | datetime nullable | Attempt end |
| `itemsFetched` | int | Count from provider |
| `itemsUpdated` | int | Count persisted/upserted |
| `errorMessage` | string nullable | Sanitized message, no secrets |
| `providerRequestId` | string nullable | If provider exposes one |
| `metadata` | JSON nullable | Safe diagnostics: date windows, competition slug, etc. |

### Notes
- Admin dashboard consumes this in Unit 7.
- Logs must avoid API keys, raw auth headers, and excessive provider payloads.

---

## Flag Assets

Flag assets are not a separate business entity in v1 unless code generation benefits from one. Required fields live on `Team`:

- `flagKey`: stable key (`ar`, `br`, `gb-eng`).
- `flagPath`: local path under `public/flags/`.
- `fifaCode`: 3-letter display code.

The seed/build process copies only required SVGs into the repo. No runtime hotlinking.

---

## Cross-Unit Dependencies

| Unit | Dependency |
|---|---|
| Unit 3 | Replace/fill `getCompetitionLockTime()` using active competition first kickoff, with env fallback. |
| Unit 5 | Reads `Match.kickoffAt`, `status`, participant resolution to allow/deny predictions. |
| Unit 6 | Reads final scores, penalty scores, winner, and phase type for scoring. |
| Unit 7 | Reads `ProviderSyncLog`; implements manual result override using prepared override fields. |
