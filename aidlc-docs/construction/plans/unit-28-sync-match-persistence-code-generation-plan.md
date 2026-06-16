# Code Generation Plan — Unit 28
## Persistencia de matches en sync-orchestrator

**Unit**: Unit 28 — Sync Match Persistence
**Story**: FR-SYNC-28.1 … 28.10, NFR-SYNC-28.1 … 28.3
**Created**: 2026-06-16

---

## Unit Context

- **Workspace Root**: `/var/www/html/sync-now`
- **Project Type**: Brownfield — Next.js 16 / TypeScript / Prisma
- **Dependencies**: Unit 25 (FootballDataProvider, sync-orchestrator base)
- **Affected files**: 4 modificar, 1 nuevo

---

## Steps

### Step 1 — Fix FootballDataProvider: null/empty TLA
- [x] Modificar `src/features/competition/services/providers/football-data.ts`
- [x] Cambiar el mapeo de `homeFifaCode`/`awayFifaCode`:
  ```ts
  homeFifaCode: match.homeTeam.tla?.length === 3 ? match.homeTeam.tla : null,
  awayFifaCode: match.awayTeam.tla?.length === 3 ? match.awayTeam.tla : null,
  ```
- [x] Esto evita que los partidos de knockout con `tla: ""` fallen la validación Zod

### Step 2 — Extraer `seedCompetitionStructure()` en upsert-competition-data.ts
- [x] Modificar `src/features/competition/services/upsert-competition-data.ts`
- [x] Extraer la lógica de upsert de competition, phases y teams en función separada:
  ```ts
  export async function seedCompetitionStructure(): Promise<{
    competition: { id: string };
    phaseByName: Map<string, { id: string }>;
  }>
  ```
- [x] `seedWorldCup2026()` pasa a llamar `seedCompetitionStructure()` + el loop de matches
  (backward compatible — todos los tests existentes que usen `seedWorldCup2026()` siguen funcionando)

### Step 3 — Actualizar scripts/seed-competition.ts
- [x] Modificar `scripts/seed-competition.ts`
- [x] Importar y llamar `seedCompetitionStructure()` en lugar de `seedWorldCup2026()`
- [x] Para BD fresca (prod): competition + phases + teams; los matches vienen del sync

### Step 4 — Agregar match sync a sync-orchestrator.ts
- [x] Modificar `src/features/competition/services/sync-orchestrator.ts`
- [x] Agregar función `findActiveCompetition()`
- [x] Agregar función `buildPhaseMap(competitionId: string)`
- [x] Agregar función `syncMatchesToDB(matches, competitionId, phaseMap)`:
  - Lookup por `providerMatchId`
  - UPDATE si existe (status, scores, kickoffAt, teamIds, placeholders) + emitNotifications
  - CREATE si no existe Y status es SCHEDULED o LIVE
  - Skip silencioso para otros casos
  - Retornar count de matches procesados
- [x] En `runCompetitionSync()`, después del loop de teams: llamar `syncMatchesToDB`
- [x] Actualizar `ProviderSyncRun.itemsUpdated = updatedCount` (matches, no teams)

### Step 5 — Tests para sync-orchestrator.ts
- [x] Actualizar `src/features/competition/services/__tests__/sync-orchestrator.test.ts`
- [x] Test 1: match SCHEDULED no existe → se CREA
- [x] Test 2: match existe por providerMatchId → se ACTUALIZA (status + scores)
- [x] Test 3: match FINISHED no existe → se SALTA (no se crea)
- [x] Test 4: phase no encontrada → warn + continúa (otros matches se procesan)
- [x] Test 5: competition no encontrada → itemsUpdated = 0, sin error
- [x] Test 6: emitMatchNotificationEvents best-effort (no bloquea si falla)

### Step 6 — Verificación ✅ COMPLETE
- [x] `pnpm exec tsc --noEmit` → 0 errores (sólo pre-existentes en content-collections)
- [x] `pnpm exec biome check src scripts` → limpio
- [x] `pnpm exec vitest run` → 213 tests pasan (48 test files)
- [x] `cleanupOldSyncRuns` y `seedWorldCup2026` siguen exportadas (backward compat)

---

## Story Traceability

| Requirement | Step |
|---|---|
| FR-SYNC-28.1 Persistir matches | Step 4 |
| FR-SYNC-28.2 seedCompetitionStructure | Step 2 + Step 3 |
| FR-SYNC-28.3 Identificación por providerMatchId | Step 4 |
| FR-SYNC-28.4 Regla creación por status | Step 4 |
| FR-SYNC-28.5 Actualizar todos los campos | Step 4 |
| FR-SYNC-28.6 Resolución de phase | Step 4 |
| FR-SYNC-28.7 Matches no vinculables | Step 4 |
| FR-SYNC-28.8 Notificaciones best-effort | Step 4 |
| FR-SYNC-28.9 itemsUpdated = matches | Step 4 |
| FR-SYNC-28.10 Sweeper suficiente | sin cambio (ya existe) |
| Fix TLA null/vacío | Step 1 |
| NFR-SYNC-28.1 Idempotencia | Step 4 + Step 5 |
| NFR-SYNC-28.2 Seguridad | sin cambio (Zod + admin gate) |
| NFR-SYNC-28.3 Graceful degradation | Step 4 |
