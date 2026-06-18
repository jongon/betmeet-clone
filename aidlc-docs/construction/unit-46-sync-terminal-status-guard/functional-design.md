# Unit 46 Functional Design — Guard de no-regresión de status y freeze de override manual en el sync

**Stage**: Functional Design (light) — refine post-construcción
**Scope**: Bug fix de persistencia del sync (lógica de UPDATE)
**Affected artifact/code**: `runCompetitionSync` / `syncMatchesToDB` (`src/features/competition/services/sync-orchestrator.ts`)
**Refine sobre**: Unit 28 (sync match persistence), Unit 25 (football-data provider), Unit 36 (override manual / force-result)
**No reinicia**: Units 1–45

---

## 1. Trazabilidad

| Requisito | Historia | Descripción |
|-----------|----------|-------------|
| FR-REFINE-46.1 | US-46.1 | Un partido en estado terminal (`FINISHED`/`CANCELLED`) no debe regresar a `SCHEDULED`/`LOCKED`/`LIVE` por efecto del sync |
| FR-REFINE-46.2 | US-46.1 | El sync nunca debe sobrescribir status/scores de un partido con `manualOverride = true` |

---

## 2. Problema

En `/admin`, tras sincronizar, `/matches` mostraba un partido ya finalizado (Ghana 1-0 Panamá) como **"En juego"** y el scoring no se ejecutaba.

**Causa raíz** (confirmada con consultas directas a football-data.org): el proveedor (plan gratuito) devuelve datos **inconsistentes entre sus nodos de caché** ("flapping"). La misma consulta `?status=FINISHED` a veces incluye el partido y a veces no; el feed sin filtro y `?status=LIVE` alternan `IN_PLAY` / `FINISHED` para el mismo partido. Endpoints `/teams/{id}/matches` y `/matches?date` sí son consistentes (FINISHED).

Consecuencias en `syncMatchesToDB` (BR-28.3, que actualizaba TODOS los campos sin condición):

1. **Regresión terminal**: un sync `FULL`/`LIVE_STATUS` posterior revertía `FINISHED → LIVE` cuando el feed devolvía `IN_PLAY` stale → badge "En juego" + scoring sin ejecutar.
2. **Sobreescritura de override manual**: un partido corregido por el admin (`force-result`, `manualOverride = true`) podía ser pisado por el marcador del proveedor en un sync `RESULTS` (incluso `FINISHED → FINISHED` con otro score).

---

## 3. Diseño

### 3.1 Guard de no-regresión (BR-28.12)

Estados terminales: `FINISHED`, `CANCELLED`. Estados de regresión: `SCHEDULED`, `LOCKED`, `LIVE`.

`isStatusRegression(current, incoming)` = `current` es terminal **y** `incoming` es de regresión. Cuando aplica, se preservan `status`, `homeScore` y `awayScore` de la BD.

### 3.2 Freeze de override manual (BR-28.13)

Si `existing.manualOverride === true`, el sync no toca `status`/`homeScore`/`awayScore`, sin importar lo que reporte el proveedor (incluido `FINISHED → FINISHED` con otro marcador). El admin tiene la última palabra.

### 3.3 Implementación

En la rama UPDATE de `syncMatchesToDB`:

```ts
const frozen = existing.manualOverride || isStatusRegression(existing.status, match.status);
const nextStatus    = frozen ? existing.status    : match.status;
const nextHomeScore = frozen ? existing.homeScore : (match.homeScore ?? null);
const nextAwayScore = frozen ? existing.awayScore : (match.awayScore ?? null);
```

El resto de campos (kickoff, teams, placeholders) se actualizan normalmente en ambos casos. `forceMatchResult` (Unit 36) escribe directo con `prisma.match.update` y **no** pasa por `runCompetitionSync`, por lo que el override en sí no está sujeto a estos guards — solo los syncs posteriores los respetan.

### 3.4 Comportamiento preservado

- `providerMatchId` sigue siendo la llave del lookup (BR-28.1).
- Regla de creación por status (BR-28.2) sin cambios.
- `emitMatchNotificationEvents` y conteo `itemsUpdated` sin cambios.
- Para corregir un resultado mal cargado se usa el override manual del admin (exento del guard).

---

## 4. NFR / Security Baseline

- NFR Requirements/Design: SKIP formal. No introduce carga, datos ni infraestructura nuevos.
- Security Baseline: intacto. No cambia autorización, server actions, inputs persistidos ni superficies de ataque. El guard es defensivo (reduce escrituras inválidas desde un proveedor externo).

---

## 5. Verificación

### 5.1 Automática

```bash
pnpm exec vitest run src/features/competition/services/__tests__/sync-orchestrator.test.ts  # 10/10
pnpm exec tsc --noEmit
pnpm exec eslint src/features/competition/services/sync-orchestrator.ts
```

Tests añadidos: "does not regress a FINISHED match back to LIVE on stale provider data" y "does not overwrite a manually-overridden match with provider data".

### 5.2 En vivo

1. Dato corregido: partido Ghana-Panamá marcado `FINISHED` 1-0 por el path real (update → `emitMatchNotificationEvents` → `scoreFinishedUnscoredMatches` → 1 partido puntuado → `dispatchPendingNotifications`).
2. Sync `FULL` real ejecutado post-fix: el partido **permanece `FINISHED`** pese a que el feed devolvía `IN_PLAY`.
