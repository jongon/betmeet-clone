# Execution Plan — Unit 28
## Persistencia de matches en sync-orchestrator

**Created**: 2026-06-16
**Scope**: Brownfield refine post-construcción (Unit 25 gap fix)

---

## Detailed Analysis Summary

### Transformation Scope
- **Transformation Type**: Single component fix + seed refactor
- **Primary Changes**: `sync-orchestrator.ts` itera sobre matches pero no los persiste; corrección + refactor seed.
- **Related Components**: `upsert-competition-data.ts`, `scripts/seed-competition.ts`, tests del orquestador

### Change Impact Assessment
- **User-facing changes**: Indirecto — después de la fix, sincronizar desde el admin panel SÍ actualizará resultados y desencadenará recálculo de puntuaciones.
- **Structural changes**: No — sin cambios de arquitectura.
- **Data model changes**: No — sin nuevas migraciones de schema.
- **API changes**: No — sin cambios en endpoints.
- **NFR impact**: Idempotencia (ya cubierta por diseño de Zod/upsert); Security Baseline existente cubre el resto.

### Component Relationships
- **Primary**: `sync-orchestrator.ts` (modificar)
- **Dependent (modificar)**: `upsert-competition-data.ts` (extraer `seedCompetitionStructure()`)
- **Dependent (modificar)**: `scripts/seed-competition.ts` (usar `seedCompetitionStructure()`)
- **Nuevo**: `sync-orchestrator.test.ts` (tests para match sync)
- **Sin cambios**: `football-data.ts`, `trigger-sync.ts`, `score-sweeper.ts`, UI

### Risk Assessment
- **Risk Level**: Medio
- **Rollback Complexity**: Fácil (revertir sync-orchestrator; la app sigue funcionando sin persistir matches)
- **Testing Complexity**: Moderada (necesita mock de Prisma para lookup + create/update de matches)

---

## Workflow Visualization

```
INCEPTION PHASE
+ Workspace Detection    [COMPLETED]
+ RE Artifacts           [COMPLETED - skipped, current]
+ Requirements Analysis  [COMPLETED]
+ User Stories           [SKIP - fix de servicio interno, sin nuevas historias de usuario]
+ Workflow Planning      [IN PROGRESS]
+ Application Design     [SKIP - sin componentes nuevos]
+ Units Generation       [SKIP - unidad unica Unit 28]

CONSTRUCTION PHASE (Unit 28)
+ Functional Design      [EXECUTE - definir algoritmo syncMatch]
+ NFR Requirements       [SKIP - Security Baseline existente, idempotencia es comportamental]
+ NFR Design             [SKIP]
+ Infrastructure Design  [SKIP - sin nuevas infras]
+ Code Generation        [EXECUTE - implementar]
+ Build and Test         [EXECUTE - verificar]

OPERATIONS PHASE
+ Operations             [PLACEHOLDER]
```

---

## Phases to Execute

### INCEPTION PHASE
- [x] Workspace Detection — COMPLETED
- [x] Reverse Engineering — COMPLETED (artefactos existentes y actuales)
- [x] Requirements Analysis — COMPLETED (FR-SYNC-28.1 … 28.10 + NFR)
- [ ] User Stories — **SKIP** (fix de capa de servicio; sin nuevas personas o flujos de usuario)
- [x] Workflow Planning — IN PROGRESS (este documento)
- [ ] Application Design — **SKIP** (sin componentes nuevos; modificar funciones existentes)
- [ ] Units Generation — **SKIP** (unidad única: Unit 28)

### CONSTRUCTION PHASE — Unit 28
- [ ] Functional Design — **EXECUTE**
  - Rationale: Necesita definir el algoritmo de sync de matches: lookup por providerMatchId, regla de creación por status, resolución de phase, emisión de notificaciones, actualización de itemsUpdated.
- [ ] NFR Requirements — **SKIP** (Security Baseline = enabled; idempotencia es de diseño, no nuevo NFR)
- [ ] NFR Design — **SKIP**
- [ ] Infrastructure Design — **SKIP** (sin cambios de infra)
- [ ] Code Generation — **EXECUTE** (siempre)
- [ ] Build and Test — **EXECUTE** (siempre)

### OPERATIONS PHASE
- [ ] Operations — PLACEHOLDER

---

## Code Generation Plan (Preview)

Archivos a modificar/crear:

1. **`src/features/competition/services/upsert-competition-data.ts`**
   - Extraer `seedCompetitionStructure()` que crea Competition + Phases + Teams (sin matches)
   - `seedWorldCup2026()` llama a `seedCompetitionStructure()` + crea matches (backward compat)

2. **`scripts/seed-competition.ts`**
   - Cambiar a usar `seedCompetitionStructure()` para BD fresca sin matches

3. **`src/features/competition/services/sync-orchestrator.ts`**
   - Agregar función `syncMatchesToDB(matches, competitionId, phaseMap)`
   - En `runCompetitionSync()`: cargar competición + phases, llamar `syncMatchesToDB()`
   - Actualizar `itemsUpdated` con count de matches procesados
   - Manejo graceful si competición no existe

4. **`src/features/competition/services/__tests__/sync-orchestrator.test.ts`** (nuevo)
   - Test: matches se crean cuando son SCHEDULED y no existen
   - Test: matches se actualizan cuando ya existen (por providerMatchId)
   - Test: matches FINISHED no se crean si no existen
   - Test: phase no encontrada → warn + continuar
   - Test: competición no encontrada → no falla

---

## Success Criteria

- **Primary Goal**: Trigger sync en admin panel → matches se crean/actualizan en BD → sweeper calcula puntuaciones.
- **Key Deliverables**: `sync-orchestrator.ts` persistiendo matches; `seedCompetitionStructure()` exportada; tests verdes.
- **Quality Gates**: tsc 0, Biome clean, ESLint 0, todos los tests (207+) pasan, FOOTBALL_DATA_KEY en .env funciona.
