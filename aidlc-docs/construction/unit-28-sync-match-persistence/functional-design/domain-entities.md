# Domain Entities — Unit 28
## Persistencia de matches en sync-orchestrator

---

## Entidades involucradas

### NormalizedMatch (payload del provider)
```typescript
{
  providerMatchId: string | null
  matchNumber:     number | null   // matchday del API, no es globalmente único
  phaseName:       string          // "Group A", "Round of 16", etc.
  kickoffAt:       string | null   // ISO 8601 UTC
  status:          "SCHEDULED" | "LOCKED" | "LIVE" | "FINISHED" | "POSTPONED" | "CANCELLED"
  homeFifaCode:    string(3) | null  // null si equipo no resuelto (knockout)
  awayFifaCode:    string(3) | null
  homePlaceholder: string | null   // siempre null en FootballDataProvider
  awayPlaceholder: string | null
  homeScore:       number | null   // solo en FINISHED/LIVE
  awayScore:       number | null
}
```

### Match (entidad de BD)
```typescript
{
  id:              string (cuid)
  competitionId:   string → Competition
  phaseId:         string → CompetitionPhase
  providerMatchId: string? @unique   ← clave del sync
  matchNumber:     number? @unique(competitionId, matchNumber)  ← null para matches del sync
  kickoffAt:       DateTime?
  status:          MatchStatus
  homeTeamId:      string? → Team
  awayTeamId:      string? → Team
  homePlaceholder: string?
  awayPlaceholder: string?
  homeScore:       int?
  awayScore:       int?
}
```

### Competition (entidad de BD)
```typescript
{
  id:   string (cuid)
  slug: "world-cup-2026"   ← clave de lookup
  ...
}
```

### CompetitionPhase (entidad de BD)
```typescript
{
  id:            string (cuid)
  competitionId: string → Competition
  name:          string   ← clave de resolución: "Group A", "Round of 16", ...
  type:          "GROUP" | "KNOCKOUT"
  ...
}
```

### Team (entidad de BD)
```typescript
{
  id:      string (cuid)
  fifaCode: string(3) @unique   ← clave de lookup desde NormalizedMatch
  ...
}
```

### ProviderSyncRun (entidad de BD)
```typescript
{
  id:               string (cuid)
  provider:         "FOOTBALL_DATA"
  scope:            "FIXTURES" | "LIVE_STATUS" | "RESULTS" | "FULL"
  windowKey:        string
  status:           "STARTED" | "SUCCESS" | "FAILED" | "RATE_LIMITED"
  startedAt:        DateTime
  finishedAt:       DateTime?
  itemsFetched:     int?   // teams.length + matches.length
  itemsUpdated:     int?   // matches creados + actualizados (CAMBIA de "teams only")
  errorMessage:     string?
  providerRequestId: string?
}
```

---

## Mapa de dependencias del sync (Unit 28)

```
FootballDataProvider.fetch()
    │
    └─→ NormalizedMatch[]
            │
            ├─ phaseName ──────────────→ CompetitionPhase (lookup por name)
            │                                │
            │                                └─ phaseId
            │
            ├─ homeFifaCode ───────────→ Team (lookup por fifaCode)
            │                                │
            │                                └─ homeTeamId
            │
            ├─ awayFifaCode ───────────→ Team (lookup por fifaCode)
            │                                │
            │                                └─ awayTeamId
            │
            └─ providerMatchId ────────→ Match (lookup para UPDATE)
                                         │
                                    CREATE / UPDATE
                                         │
                                    ProviderSyncRun.itemsUpdated++
```

---

## Flujo de datos completo (desde Admin panel)

```
Admin UI → triggerSync("RESULTS")
  │
  ├─→ getAdminUserId() [auth gate]
  ├─→ FootballDataProvider.fetch("RESULTS", window)
  │     └─→ GET /v4/competitions/WC/matches?season=2026&status=FINISHED
  │           └─→ [{ id, homeTeam.tla, score.fullTime, status="FINISHED", ... }]
  │
  ├─→ runCompetitionSync(provider, "RESULTS", window)
  │     ├─→ upsertTeam (sin cambios)
  │     ├─→ findActiveCompetition() → competition
  │     ├─→ buildPhaseMap(competition.id) → phaseMap
  │     └─→ syncMatchesToDB(matches, competition.id, phaseMap)
  │           Para cada match FINISHED:
  │             findFirst(providerMatchId) → si existe → UPDATE(status, scores, ...)
  │             si no existe → skip (FINISHED sin registro previo)
  │
  ├─→ scoreFinishedUnscoredMatches()
  │     └─→ PredictionScore recalculadas para matches recién marcados FINISHED
  │
  └─→ revalidateTag + revalidatePath
```
