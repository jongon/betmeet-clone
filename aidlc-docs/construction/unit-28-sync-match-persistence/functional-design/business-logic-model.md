# Business Logic Model — Unit 28
## Persistencia de matches en sync-orchestrator

---

## Algoritmo principal: `syncMatchesToDB()`

Esta función se ejecuta dentro de `runCompetitionSync()` tras la llamada al provider,
después del loop de teams existente.

### Flujo de alto nivel

```
syncMatchesToDB(matches: NormalizedMatch[], competitionId: string, phaseMap: Map<string, string>)
│
├─ Para cada match en matches:
│   │
│   ├─ 1. Lookup por providerMatchId
│   │       prisma.match.findFirst({ where: { providerMatchId: match.providerMatchId } })
│   │
│   ├─ 2. ¿Existe?
│   │   ├─ SÍ → UPDATE (todos los campos: FR-SYNC-28.5)
│   │   │         emitMatchNotificationEvents(previous, saved)  [best-effort]
│   │   │         updatedCount++
│   │   │
│   │   └─ NO → ¿status SCHEDULED o LIVE? (FR-SYNC-28.4)
│   │           ├─ SÍ → Resolver phase: phaseMap.get(match.phaseName)
│   │           │         ├─ Phase encontrada → CREATE match (providerMatchId set, matchNumber null)
│   │           │         │   updatedCount++
│   │           │         └─ Phase NO encontrada → console.warn + skip (FR-SYNC-28.7)
│   │           └─ NO (FINISHED/POSTPONED/CANCELLED) → skip silencioso (FR-SYNC-28.4)
│
└─ return updatedCount
```

### Integración en `runCompetitionSync()`

```
runCompetitionSync(provider, scope, window):
  1. Upsert ProviderSyncRun → status STARTED
  2. payload = provider.fetch(scope, window)
  3. Parse teams + matches (Zod schemas)
  4. for team in teams → upsertTeam(team)            [existente]
  5. competition = findActiveCompetition()             [NUEVO]
  6. if competition exists:
       phaseMap = buildPhaseMap(competition.id)        [NUEVO]
       updatedCount = syncMatchesToDB(matches, competition.id, phaseMap)  [NUEVO]
     else:
       updatedCount = 0
       console.warn("Competition not found — skipping match sync")
  7. Update ProviderSyncRun → status SUCCESS
       itemsFetched = teams.length + matches.length
       itemsUpdated = updatedCount                     [CAMBIA: antes = teams.length]
```

---

## Función: `findActiveCompetition()`

```
findActiveCompetition() → Competition | null
  prisma.competition.findFirst({
    where: { slug: "world-cup-2026" },
    select: { id: true }
  })
```

Nota: Si la competition no existe, el sync continúa sin persistir matches
(sin lanzar excepción no capturada). El `ProviderSyncRun` se marca SUCCESS.

---

## Función: `buildPhaseMap(competitionId)`

```
buildPhaseMap(competitionId: string) → Map<string, string>
  phases = prisma.competitionPhase.findMany({
    where: { competitionId },
    select: { id: true, name: true }
  })
  return new Map(phases.map(p => [p.name, p.id]))
```

Mapea: `"Group A"` → `"<phaseId>"`, `"Round of 16"` → `"<phaseId>"`, etc.

---

## Función: `buildMatchUpdateData(match, phaseId?, competition, teams)`

Para UPDATE (phaseId ya resuelto del registro existente):
```typescript
{
  status:           match.status,
  homeScore:        match.homeScore ?? null,
  awayScore:        match.awayScore ?? null,
  kickoffAt:        match.kickoffAt ? new Date(match.kickoffAt) : undefined,
  homeTeamId:       homeTeam?.id ?? null,
  awayTeamId:       awayTeam?.id ?? null,
  homePlaceholder:  match.homePlaceholder ?? null,
  awayPlaceholder:  match.awayPlaceholder ?? null,
}
```

Para CREATE (phaseId desde phaseMap):
```typescript
{
  competitionId,
  phaseId,
  providerMatchId:  match.providerMatchId,
  matchNumber:      null,       // no usamos matchday como matchNumber global
  status:           match.status,
  kickoffAt:        match.kickoffAt ? new Date(match.kickoffAt) : null,
  homeTeamId:       homeTeam?.id ?? null,
  awayTeamId:       awayTeam?.id ?? null,
  homePlaceholder:  match.homePlaceholder ?? null,
  awayPlaceholder:  match.awayPlaceholder ?? null,
  homeScore:        match.homeScore ?? null,
  awayScore:        match.awayScore ?? null,
}
```

---

## Resolución de Team IDs

Para cada match (en UPDATE y CREATE):
```
homeTeam = match.homeFifaCode
  ? await prisma.team.findUnique({ where: { fifaCode: match.homeFifaCode } })
  : null

awayTeam = match.awayFifaCode
  ? await prisma.team.findUnique({ where: { fifaCode: match.awayFifaCode } })
  : null
```

Si `fifaCode` es null (knockout no resuelto) → `homeTeamId = null`. Safe.

---

## Fix del Provider: null/empty TLA

El football-data.org API puede retornar `tla: ""` (string vacío) para equipos
no resueltos en knockout. El `NormalizedMatchSchema` requiere `string().length(3)`
o `null` — un string vacío falla la validación.

**Fix en `FootballDataProvider`**:
```typescript
homeFifaCode: match.homeTeam.tla?.length === 3 ? match.homeTeam.tla : null,
awayFifaCode: match.awayTeam.tla?.length === 3 ? match.awayTeam.tla : null,
```

Esto convierte cualquier TLA que no tenga exactamente 3 caracteres en `null`,
evitando el error de validación de Zod.

---

## Extracción de `seedCompetitionStructure()`

`upsert-competition-data.ts` tendrá:

```typescript
// seedCompetitionStructure: Competition + Phases + Teams (sin matches)
export async function seedCompetitionStructure(): Promise<{
  competition: { id: string };
  phaseByName: Map<string, { id: string }>;
}> {
  const competition = await upsertCompetition();
  const phaseByName = await upsertPhases(competition.id);
  await upsertTeamsFromSeed();
  return { competition, phaseByName };
}

// seedWorldCup2026: llama a seedCompetitionStructure + crea matches (backward compat)
export async function seedWorldCup2026() {
  const { competition, phaseByName } = await seedCompetitionStructure();
  for (const match of WORLD_CUP_2026_MATCHES) {
    const phase = phaseByName.get(match.phaseName);
    if (!phase) continue;
    await upsertMatch(competition.id, phase.id, match);
  }
}
```

`scripts/seed-competition.ts` pasa a usar `seedCompetitionStructure()`.
