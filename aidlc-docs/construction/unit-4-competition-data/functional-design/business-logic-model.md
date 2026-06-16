# Unit 4: Competition Data and API Sync — Business Logic Model

## BL-4.0: Active Competition Resolution

```
function getActiveCompetition(): Competition | null:
    return Competition where isActive = true order by createdAt desc limit 1
```

Rules:
- v1 screens operate on one active competition: World Cup 2026.
- If no active competition exists, fixture screens show an empty/setup state, not a crash.

---

## BL-4.1: Seed Initial Fixture Data

Purpose: make the fixture usable before el proveedor externo (football-data.org) is fully stable.

```
seedCompetitionData(seed):
    upsert Competition by slug
    upsert Teams by fifaCode/providerTeamId if present
    upsert CompetitionPhase by competitionId + displayOrder/groupCode/name
    upsert Matches by providerMatchId if present, else competitionId + matchNumber
```

Properties:
- Idempotent: running the seed twice must not duplicate teams/phases/matches.
- Editable/reconcilable: provider sync can later attach external ids and update kickoff/status/results.
- Local flags: seed points each team to `/flags/{flagKey}.svg`.

---

## BL-4.2: Fixture Listing (US-2.1)

Input: `{ competitionSlug?, phaseType?, groupCode?, status?, from?, to? }`.

```
competition = getActiveCompetition() or by slug
phases = list phases for competition ordered by displayOrder
matches = list matches with teams for selected filters ordered by kickoffAt, matchNumber
return grouped fixture view:
    phase
    matches[] with localizable kickoffAt, teams/placeholders, score, status
```

UI converts `kickoffAt` to the user's local timezone. Server stores canonical UTC timestamps.

---

## BL-4.3: Match Status Mapping (US-2.2)

Provider statuses are mapped into the domain enum.

```
mapProviderStatus(rawStatus, kickoffAt, now):
    if rawStatus indicates finished -> FINISHED
    if rawStatus indicates live/in_play/halftime/extra/penalties -> LIVE
    if rawStatus indicates postponed -> POSTPONED
    if rawStatus indicates cancelled/abandoned -> CANCELLED
    if kickoffAt != null and now >= kickoffAt -> LOCKED
    return SCHEDULED
```

Notes:
- `rawStatus` is persisted for diagnostics/admin context.
- `LOCKED` allows predictions to fail closed even if provider is late marking match as live.

---

## BL-4.4: Knockout Slot Resolution (US-2.3)

Knockout matches may exist before teams are known.

```
isMatchPredictionEligible(match, now):
    if match.homeTeamId == null or match.awayTeamId == null: return false
    if match.kickoffAt == null: return false
    if match.status != SCHEDULED: return false
    return now < match.kickoffAt
```

Provider sync updates `homeTeamId` / `awayTeamId` once teams are official. Until then, UI shows placeholders like “1st Group A”.

---

## BL-4.5: First Kickoff Lookup (Unit 3 Dependency)

```
function getCompetitionLockTime(): Date | null:
    competition = getActiveCompetition()
    if competition?.startsAt exists: return competition.startsAt
    firstMatch = earliest Match for active competition where kickoffAt != null
    if firstMatch exists: return firstMatch.kickoffAt
    if WORLD_CUP_KICKOFF env exists: return parsed env date
    return null
```

This replaces Unit 3's temporary env-only implementation during Unit 4 code generation while keeping env fallback.

---

## BL-4.6: Provider Sync Orchestration (US-6.1 foundation)

```
syncProvider(scope, window):
    log = ProviderSyncLog(status=STARTED, scope, startedAt=now)
    try:
        payload = adapter.fetch(scope, window)
        normalized = adapter.normalize(payload)
        result = upsertNormalizedData(normalized)
        log.status = SUCCESS or PARTIAL_SUCCESS
        log.itemsFetched = payload.count
        log.itemsUpdated = result.updated
    catch rateLimit:
        log.status = RATE_LIMITED
        log.errorMessage = sanitized message
    catch error:
        log.status = FAILED
        log.errorMessage = sanitized message
    finally:
        log.finishedAt = now
```

Scopes:
- `TEAMS`: provider team ids and team metadata.
- `FIXTURES`: phases, matches, kickoff updates, placeholders/team assignment.
- `LIVE_STATUS`: live statuses/scores for current day.
- `RESULTS`: final scores/winners.
- `FULL`: bootstrap/reconciliation.

---

## BL-4.7: Idempotent Upsert and Conflict Policy

```
upsertNormalizedData(data):
    teams: upsert by providerTeamId if present, else fifaCode
    phases: upsert by competitionId + providerPhaseId or competitionId + name/groupCode
    matches: upsert by providerMatchId if present, else competitionId + matchNumber
    do not overwrite manualOverride matches unless Unit 7 explicitly allows it
```

Conflict priorities:
1. Manual override fields win over provider data.
2. Provider ids win over seed-only records for reconciliation.
3. Seed data remains if provider omits optional display metadata.

---

## BL-4.8: Sync Cadence Functional Policy

Two cadences are required:

- Slow fixture sync: daily, for future fixtures/teams/phase updates.
- Fast match-day/live sync: every 1–5 minutes during active match windows.

The implementation must be rate-limit aware and idempotent. Exact cron infrastructure is decided in NFR/Infrastructure Design.

---

## BL-4.9: Manual Override Boundary

Unit 4 prepares fields for manual overrides but does not expose admin override UI/actions.

```
if match.manualOverride == true:
    provider sync does not mutate result/status fields
    Unit 7 override flow owns reason, actor, audit, and scoring recalculation trigger
```

---

## Data Flows Summary

| Flow | Input | Logic | Output |
|---|---|---|---|
| Seed fixture | Seed JSON/TS data | BL-4.1 | Competition, teams, phases, matches |
| Fixture page | User filters | BL-4.2 | Grouped fixture view |
| Provider sync | football-data.org payload | BL-4.3, BL-4.6, BL-4.7 | Updated fixtures/results/logs |
| Knockout unlock | Provider team assignment | BL-4.4 | Match becomes prediction-eligible |
| Pool freeze | Active competition/matches | BL-4.5 | First kickoff lock time |
