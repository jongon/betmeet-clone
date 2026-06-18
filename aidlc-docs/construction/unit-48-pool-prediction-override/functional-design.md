# Functional Design — Unit 48: Predicciones con override por pool

## Traceability

| ID | Source | Description |
|----|--------|-------------|
| FR-REFINE-48.1 | requirements | Override solo desde el pool |
| FR-REFINE-48.2 | requirements | Override standalone (no requiere global) |
| FR-REFINE-48.3 | requirements | Resolucion override-vs-global en vistas |
| FR-REFINE-48.4 | requirements | Boton "Usar prediccion global" |
| FR-REFINE-48.5 | requirements | Leaderboard override-aware |
| FR-REFINE-48.6 | requirements | Ranking global excluye overrides |
| FR-REFINE-48.7 | requirements | Schema `poolId` + partial unique indexes |
| FR-REFINE-48.8 | requirements | Independencia global vs override |
| US-48.1 | stories | Ajustar prediccion para una liga especifica |
| US-48.2 | stories | Ver predicciones + volver a global |
| DD-48.1 | workflow | Override solo desde pool context |
| DD-48.2 | workflow | Override standalone |
| DD-48.3 | workflow | Leaderboard transparente |
| DD-48.4 | workflow | Global y override independientes |
| DD-48.5 | workflow | Boton "Usar prediccion global" |

## 1. Domain Entities

### 1.1 Extended `Prediction` Model

> Modifica el modelo existente de Unit 5 (`prisma/schema.prisma`).

| Campo | Tipo | Notas |
|---|---|---|
| `poolId` | `String? @map("pool_id")` | **NUEVO**. FK → `Pool.id`. `NULL` = prediccion global. No-null = override para ese pool. |
| `pool` | `Pool? @relation(...)` | Relacion opcional a `Pool`. `onDelete: Cascade` (al eliminar pool, se eliminan sus overrides). |
| (resto) | sin cambios | `id`, `userId`, `matchId`, `homeScore`, `awayScore`, `penaltyWinnerTeamId`, `lockedAt`, `lockReason`, `createdAt`, `updatedAt` |

### 1.2 Partial Unique Indexes

> Reemplazan el `@@unique([userId, matchId])` actual.

| Indice | SQL | Proposito |
|---|---|---|
| `predictions_user_match_global_uk` | `CREATE UNIQUE INDEX ... ON predictions(user_id, match_id) WHERE pool_id IS NULL` | Una sola prediccion global por usuario y partido. |
| `predictions_user_match_pool_uk` | `CREATE UNIQUE INDEX ... ON predictions(user_id, match_id, pool_id) WHERE pool_id IS NOT NULL` | Un solo override por pool, usuario y partido. |

- En PostgreSQL, `NULL != NULL` en unique constraints. Las filas con `pool_id IS NULL` no violan el indice de overrides, y viceversa.
- Una misma (userId, matchId) puede tener 1 fila global + N overrides (uno por pool), donde N = numero de pools a los que pertenece el usuario.
- Prisma: estos indices se declaran en la migracion raw SQL (Prisma no soporta partial unique indexes nativamente). El `@@unique` actual se elimina del schema.prisma.

### 1.3 SavePredictionInput (extendido)

```ts
// src/features/predictions/schemas.ts
const SavePredictionSchema = z.object({
  matchId: z.string().uuid(),
  homeScore: z.number().int().min(0).max(20),
  awayScore: z.number().int().min(0).max(20),
  penaltyWinnerTeamId: z.string().uuid().nullable().optional(),
  poolId: z.string().uuid().optional(),  // NUEVO
});
```

### 1.4 PoolMemberPrediction (extendido)

> Modifica `src/features/pools/types.ts` (Unit 41).

```ts
interface PoolMemberPrediction {
  // ... campos existentes sin cambios
  isOverride: boolean;    // NUEVO: true si esta prediction row tiene poolId = pool actual
  hasGlobal: boolean;     // NUEVO: true si el miembro tiene una prediccion global para este match
}
```

### 1.5 LeaderboardRow (sin cambios visuales)

> DD-48.3: leaderboard transparente. El DTO no necesita nuevos campos. La resolucion override-vs-global es interna a `getPoolLeaderboard`.

## 2. Business Rules

| ID | Regla | Trazabilidad |
|---|---|---|
| **BR-48.1** | El `poolId` en `Prediction` es opcional. `NULL` = prediccion global. No-null = override para ese pool. | FR-REFINE-48.7 |
| **BR-48.2** | No se permite crear un override sin prediccion global previa. Si el usuario intenta guardar desde pool sin global, el server action crea ambas (global + override) cuando `alsoSaveAsGlobal: true`, o rechaza con error si no se paso ese flag. | FR-REFINE-48.2, DD-48.2-revised |
| **BR-48.2a** | Al crear override sin global previa via `alsoSaveAsGlobal`, la global y el override se crean con los mismos scores en secuencia (primero global, luego override). Ambas deben persistir exitosamente o ninguna (best-effort secuencial). | FR-REFINE-48.2 |
| **BR-48.3** | Solo puede existir un override por pool, usuario y partido (`UNIQUE WHERE pool_id IS NOT NULL`). | FR-REFINE-48.7 |
| **BR-48.4** | Para guardar una prediccion con `poolId`, el usuario debe ser miembro del pool. Validacion server-side en `savePrediction`. | FR-REFINE-48.1, SECURITY-08 |
| **BR-48.5** | Para guardar una prediccion sin `poolId` (global), no se requiere membresia de pool. Comportamiento actual sin cambios. | FR-REFINE-48.1 |
| **BR-48.6** | Las reglas de lock por `kickoffAt` (BL-5.0) y validacion de scores (BL-5.2) aplican identicamente a predicciones globales y overrides. | FR-REFINE-48.1 |
| **BR-48.7** | En la vista de predicciones de un pool, para cada (miembro, match): preferir override del pool si existe; si no, usar prediccion global; si no existe ninguna, mostrar "Sin prediccion". | FR-REFINE-48.3, US-48.2 |
| **BR-48.8** | El boton "Usar prediccion global" aparece solo si el miembro actual tiene override en ese match Y ademas tiene prediccion global para ese match. Al presionarlo, se elimina el override. | FR-REFINE-48.4, DD-48.5 |
| **BR-48.9** | El leaderboard del pool calcula el total de cada miembro: para cada match, sumar puntos del override si existe; si no, sumar puntos de la global. Sin doble conteo. | FR-REFINE-48.5 |
| **BR-48.10** | El ranking global solo considera predicciones con `poolId IS NULL`. Los overrides no contribuyen al ranking global. | FR-REFINE-48.6 |
| **BR-48.11** | Editar la prediccion global no afecta los overrides existentes. Editar un override no afecta la prediccion global. | FR-REFINE-48.8, DD-48.4 |
| **BR-48.12** | Si se elimina un pool, sus overrides se eliminan en cascada (`ON DELETE CASCADE`). Las predicciones globales no se ven afectadas. | FR-REFINE-48.7 |
| **BR-48.13** | `scoreMatch(matchId)` puntua todas las filas de `Prediction` del partido (globales y overrides). El motor es idempotente (BR-6.5/6.6) y no requiere cambios. | FR-REFINE-48.7 |

## 3. Business Logic Model

### BL-48.1: `savePrediction` con scope-aware upsert + dual-save

> Extiende BL-5.1 de Unit 5. **Revisado 2026-06-18**: `alsoSaveAsGlobal` para dual-save UX.

```
savePrediction(userId, input: { matchId, homeScore, awayScore, penaltyWinnerTeamId?, poolId?, alsoSaveAsGlobal? }):
    require authenticated verified user (getOnboardedUserId)
    match = load match with phase and teams
    eligibility = getPredictionEligibility(match, serverNow())
    if not eligibility.editable:
        lockExistingPredictionIfNeeded(userId, match, eligibility.reason)
        return forbidden(eligibility.reason)

    validated = validatePredictionInput(match, input)

    IF input.poolId is provided:
        membership = PoolMembership.findUnique(userId, poolId)
        if not membership: return forbidden("No eres miembro de esta liga")

        IF input.alsoSaveAsGlobal:
            // Crear/actualizar prediccion global primero
            globalExisting = findFirst Prediction where userId, matchId, poolId IS NULL
            if globalExisting:
                update globalExisting with validated scores
            else:
                create Prediction with poolId: null, validated scores
            // Luego crear/actualizar override
            overrideExisting = findFirst Prediction where userId, matchId, poolId
            if overrideExisting:
                update overrideExisting with validated scores
            else:
                create Prediction with poolId, validated scores
        ELSE:
            // Comportamiento normal: upsert override por (userId, matchId, poolId)
            existing = findFirst Prediction where userId, matchId, poolId
            if existing: update; else create

    ELSE:
        // Global sin poolId (comportamiento sin cambios)
        existing = findFirst Prediction where userId, matchId, poolId IS NULL
        if existing: update; else create

    return success(prediction)
```

### BL-48.2: Resolucion override-vs-global para vista de predicciones

> Nueva funcion pura en `src/features/predictions/queries.ts`.

```
function resolvePoolPredictions(
    allPredictions: Prediction[],   // globales + overrides del pool para todos los miembros
    members: string[],              // userIds de miembros del pool
    matchIds: string[],             // matches visibles (kickoff <= now)
    poolId: string
): ResolvedPrediction[] {

    result = []
    for userId in members:
        for matchId in matchIds:
            override = find p in allPredictions where p.userId == userId AND p.matchId == matchId AND p.poolId == poolId
            global = find p in allPredictions where p.userId == userId AND p.matchId == matchId AND p.poolId == null

            if override:
                result.push({ userId, matchId, prediction: override, isOverride: true, hasGlobal: global != null })
            else if global:
                result.push({ userId, matchId, prediction: global, isOverride: false, hasGlobal: false })
            else:
                result.push({ userId, matchId, prediction: null, isOverride: false, hasGlobal: false })

    return result
}
```

### BL-48.3: Leaderboard override-aware

> Modifica BL-5 de Unit 6.

```
function getPoolLeaderboard(poolId, viewerId):
    members = poolMemberships(poolId) join Profile
    matchIds = matches with scores available (via PredictionScore)

    // Cargar todos los scores relevantes: overrides del pool + globales
    poolScores = SELECT ps.* FROM PredictionScore ps
                 JOIN Prediction p ON ps.predictionId = p.id
                 WHERE p.userId IN (member userIds)
                   AND (p.poolId = <poolId>        -- overrides de este pool
                        OR (p.poolId IS NULL        -- globales sin override
                            AND NOT EXISTS (
                                SELECT 1 FROM Prediction override
                                WHERE override.userId = p.userId
                                  AND override.matchId = p.matchId
                                  AND override.poolId = <poolId>
                            )))

    // Agrupar por userId y sumar totalPoints
    totals = groupBy userId, SUM(totalPoints)
    
    // Miembros sin scores = 0 puntos
    rows = members.map(m => { ..., totalPoints: totals[m.userId] ?? 0 })
    sort rows by totalPoints DESC
    assignDensePositions(rows)  // BL-6, sin cambios
    return rows
```

### BL-48.4: Global ranking (sin cambios funcionales, filtro explicito)

```
function getGlobalRankingRows():
    SELECT userId, SUM(totalPoints) as points
    FROM PredictionScore ps
    JOIN Prediction p ON ps.predictionId = p.id
    WHERE p.poolId IS NULL          // solo predicciones globales
    GROUP BY userId
    ORDER BY points DESC
```

### BL-48.5: Reset override

```
function resetPredictionOverride(userId, matchId, poolId):
    require authenticated user
    membership = PoolMembership.findUnique(userId, poolId)
    if not membership: return forbidden

    deleted = DELETE Prediction WHERE userId = userId AND matchId = matchId AND poolId = poolId
    if deleted.count == 0: return notFound

    revalidatePath('/pools/' + poolId)
    revalidateTag('pool-leaderboard-' + poolId)
    return success
```

## 4. Components

### 4.1 `PoolPredictionsView` (modificado)

> `src/features/pools/components/pool-predictions-view.tsx` (Unit 41)

**Cambios**:
- Las celdas del usuario actual (viewer) son editables si el partido esta `SCHEDULED` antes de `kickoffAt` (BR-48.6).
- Al hacer click en una celda propia editable → se abre un modal/inline con `PredictionScoreControls` + `PenaltyWinnerSelector` (reutiliza componentes de Unit 5).
- Al guardar → invoca `savePrediction({ ..., poolId })`.
- Si la celda es un override (`isOverride: true`), se muestra un badge sutil "Ajustada" y, si ademas `hasGlobal: true`, el boton "Usar prediccion global".
- Si la celda usa la global (`isOverride: false`, `hasGlobal: false`), no se muestra badge ni boton de reset.
- Si la celda esta vacia (sin prediccion), se muestra "Sin prediccion". Al hacer click en "Guardar para esta liga" desde una celda sin global previa, se muestra un **dialogo de dual-save** (BR-48.2 / DD-48.2-revised):
  - "No tienes prediccion global para este partido. Guardar este resultado tambien como tu prediccion global?"
  - Boton "Guardar como global tambien" → `savePrediction({ ..., poolId, alsoSaveAsGlobal: true })`.
  - Boton "Solo para esta liga" → cierra dialogo, toast "Primero guarda tu prediccion global en /partidos".
- Si la celda ya tiene prediccion global, el editor inline normal aparece sin dialogo (comportamiento actual).

**Estados visuales por celda (viewer)**:

| Estado | UI |
|---|---|
| Sin prediccion, editable | Boton "Predecir" → abre modal con scores en 0-0 visual |
| Override guardado, editable | Scores + badge "Ajustada" + boton "Usar prediccion global" si `hasGlobal` |
| Global usada, editable | Scores sin badge + opcion de editar (se creara override al guardar) |
| Locked (partido inicio) | Scores read-only + badge de estado de partido (LIVE/FINISHED) |
| Sin prediccion, locked | "Sin prediccion — no suma puntos" |

**Estados para otros miembros** (solo lectura):

| Estado | UI |
|---|---|
| Override | Scores + badge sutil "Ajustada" |
| Global | Scores sin badge |
| Sin prediccion | Celda vacia |

### 4.2 `ResetOverrideButton` (nuevo, inline en PoolPredictionsView)

- Boton sutil "Usar prediccion global" con icono (lucide `Undo2`).
- Solo visible si `isOverride && hasGlobal`.
- `data-testid="reset-override-{matchId}"`.
- Al click: `startTransition` + server action `resetPredictionOverride(matchId, poolId)` → toast "Usando prediccion global" + `router.refresh()`.
- i18n: `pools.predictions.useGlobalPrediction`.

## 5. Schema Delta

### 5.1 Prisma Schema (`prisma/schema.prisma`)

```prisma
model Prediction {
  id                  String    @id @default(uuid()) @db.Uuid
  userId              String    @map("user_id") @db.Uuid
  matchId             String    @map("match_id") @db.Uuid
  poolId              String?   @map("pool_id") @db.Uuid   // NUEVO
  homeScore           Int       @map("home_score")
  awayScore           Int       @map("away_score")
  penaltyWinnerTeamId String?   @map("penalty_winner_team_id") @db.Uuid
  lockedAt            DateTime? @map("locked_at") @db.Timestamptz()
  lockReason          PredictionLockReason? @map("lock_reason")
  createdAt           DateTime  @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt           DateTime  @updatedAt @map("updated_at") @db.Timestamptz()

  user             Profile              @relation(fields: [userId], references: [id])
  match            Match                @relation(fields: [matchId], references: [id])
  pool             Pool?                @relation(fields: [poolId], references: [id], onDelete: Cascade)  // NUEVO
  penaltyWinner    Team?                @relation("PredictionPenaltyWinner", fields: [penaltyWinnerTeamId], references: [id])
  predictionScore  PredictionScore?

  // ELIMINAR: @@unique([userId, matchId])
  // Los partial unique indexes van en la migracion raw SQL
}
```

### 5.2 Migracion

```sql
-- Agregar columna
ALTER TABLE predictions ADD COLUMN pool_id UUID REFERENCES pools(id) ON DELETE CASCADE;

-- Reemplazar unique constraint global
ALTER TABLE predictions DROP CONSTRAINT IF EXISTS predictions_user_id_match_id_key;
CREATE UNIQUE INDEX predictions_user_match_global_uk 
  ON predictions(user_id, match_id) WHERE pool_id IS NULL;

-- Unique constraint para overrides
CREATE UNIQUE INDEX predictions_user_match_pool_uk 
  ON predictions(user_id, match_id, pool_id) WHERE pool_id IS NOT NULL;
```

## 6. i18n Keys

| Key | ES | EN |
|---|---|---|
| `pools.predictions.overrideBadge` | "Ajustada" | "Adjusted" |
| `pools.predictions.useGlobalPrediction` | "Usar prediccion global" | "Use global prediction" |
| `pools.predictions.usingGlobalToast` | "Usando tu prediccion global" | "Using your global prediction" |
| `pools.predictions.saveForThisPool` | "Guardar para esta liga" | "Save for this pool" |
| `pools.predictions.overrideSaved` | "Prediccion guardada para esta liga" | "Prediction saved for this pool" |

## 7. File Plan

### Nuevos archivos (Code Generation Part 2)

```
prisma/migrations/YYYYMMDDHHMMSS_unit48_prediction_pool_id/migration.sql
src/features/predictions/actions/reset-prediction-override.ts
src/features/predictions/actions/__tests__/reset-prediction-override.test.ts
```

### Archivos modificados

```
prisma/schema.prisma                              (Prediction model: poolId + pool relation; remove @@unique)
src/features/predictions/schemas.ts               (SavePredictionSchema + poolId)
src/features/predictions/types.ts                 (SavePredictionInput + poolId)
src/features/predictions/actions/save-prediction.ts (upsert por userId+matchId+poolId; validacion membresia)
src/features/predictions/actions/__tests__/save-prediction.test.ts (casos con poolId)
src/features/predictions/queries.ts               (resolvePoolPredictions)
src/features/pools/types.ts                       (PoolMemberPrediction + isOverride + hasGlobal)
src/features/pools/queries.ts                     (getPoolMemberPredictions ampliado)
src/features/pools/components/pool-predictions-view.tsx (editabilidad, badges, reset button)
src/features/pools/components/pool-predictions-view-helpers.ts (transform con isOverride/hasGlobal)
src/features/pools/components/__tests__/pool-predictions-view.test.tsx (nuevos casos)
src/features/scoring-rankings/queries.ts          (getPoolLeaderboard override-aware; getGlobalRankingRows filtro poolId IS NULL)
src/features/scoring-rankings/services/__tests__/queries.test.ts (leaderboard con overrides)
src/i18n/dictionaries/es.ts                       (+5 keys)
src/i18n/dictionaries/en.ts                       (+5 keys)
src/features/admin/services/revalidate-result-views.ts (extender tags pool-leaderboard-{poolId})
src/features/pools/__tests__/pool-predictions.test.ts (resolucion override-vs-global)
```

### Sin cambios

```
src/features/predictions/services/eligibility.ts    (BL-5.0 no distingue scope)
src/features/predictions/services/validation.ts     (BL-5.2 sin cambios)
src/features/predictions/services/lock.ts           (BL-5.3 sin cambios)
src/features/scoring-rankings/services/score-match.ts   (puntua todas las filas, sin cambios)
src/features/scoring-rankings/services/score-sweeper.ts (barredor sin cambios)
src/features/scoring-rankings/services/ranking.ts       (assignDensePositions sin cambios)
src/features/competition/services/sync-orchestrator.ts  (no toca predicciones)
src/app/(app)/matches/page.tsx                      (siempre global)
src/features/admin/                                 (sin cambios)
src/features/auth/                                  (sin cambios)
```

## 8. Security Baseline Compliance

| Regla | Estado | Razon |
|---|---|---|
| SECURITY-01 | N/A | Sin cambios en autenticacion |
| SECURITY-02 | N/A | Sin datos de pago ni crypto |
| SECURITY-03 | N/A | Sin secrets nuevos |
| SECURITY-04 | N/A | Sin cambios en CSP |
| SECURITY-05 | **COMPLIANT** | Zod en `savePrediction` (poolId opcional UUID); server action es fuente de verdad |
| SECURITY-06 | N/A | Sin operaciones criptograficas |
| SECURITY-07 | N/A | Sin rate limiting nuevo |
| SECURITY-08 | **COMPLIANT** | `savePrediction` valida membresia server-side cuando poolId presente (previene IDOR). `resetPredictionOverride` valida membresia. |
| SECURITY-09 | N/A | Sin cambios en logAuthEvent (se conserva el log existente de `savePrediction`) |
| SECURITY-10 | N/A | Sin dependencias npm nuevas |
| SECURITY-11 | N/A | Sin cambios en session management |
| SECURITY-12 | N/A | Payloads de push sin cambios |
| SECURITY-13 | N/A | Sin cambios en CSRF |
| SECURITY-14 | N/A | Sin data exports |
| SECURITY-15 | N/A | Sin cambios en backup |

## 9. Verification Plan

### Schema
- Migracion aplica sin errores en base existente.
- `pool_id` columna nullable con FK a `pools`.
- Partial unique indexes: insertar 2 globales mismo (userId, matchId) → error. Insertar global + override diferente pool → OK. Insertar 2 overrides mismo (poolId, userId, matchId) → error.

### savePrediction con poolId
- Miembro guarda override → upsert exitoso, `poolId` seteado.
- No-miembro guarda override → error "No eres miembro de esta liga".
- Guardar sin poolId → global (regresion).
- Guardar global + override mismo partido → ambas filas coexisten.
- Editar override existente → actualiza, no duplica.
- Guardar tras kickoff → 403 lock (regresion).

### resolvePoolPredictions
- Override existe → `isOverride: true`, prediction del override.
- Solo global existe → `isOverride: false`, prediction global.
- Ninguna → `prediction: null`.
- Override + global → `isOverride: true`, `hasGlobal: true`.

### getPoolLeaderboard con overrides
- Miembro con override en match M → suma puntos del override.
- Miembro sin override → suma puntos de global.
- Sin doble conteo (override + global para mismo match).
- Miembro sin predicciones → 0 puntos.
- Empates dense ranking intactos.
- Leaderboard sin cambios visuales (DD-48.3).

### getGlobalRankingRows
- Solo filtra `poolId IS NULL`.
- Miembro con 100 global + 50 en overrides → ranking muestra 100.

### resetPredictionOverride
- Override existe + global existe → override eliminado, vista recae en global.
- Override existe + global NO existe → boton no visible (no hay nada a que volver).
- No-miembro intenta → error.
- Match inexistente → error.

### PoolPredictionsView
- Celda propia editable si SCHEDULED antes de kickoff.
- Guardar desde pool → override creado, badge "Ajustada" visible.
- Boton "Usar prediccion global" visible solo si `isOverride && hasGlobal`.
- Reset → toast + router.refresh.
- Celda locked → read-only.
- Otros miembros: solo lectura, badge "Ajustada" si override.

### i18n
- 5 nuevas claves en ES y EN.
- Sin keys huerfanas.

### Regresion
- `savePrediction` sin poolId → mismo comportamiento que antes.
- `/matches` sin cambios.
- Tests existentes de Unit 5/6 intactos.

### Verificacion estandar
- `pnpm exec tsc --noEmit` → 0 errores.
- Biome/ESLint limpios en archivos tocados.
- Focused Vitest (save-prediction, reset-override, leaderboard, pool-predictions-view, resolve).
- Full Vitest suite verde.
- `pnpm build` OK.

## 10. Out of Scope

- Selector de pool en `/matches` (DD-48.1: override solo desde pool).
- Visualizacion de override-vs-global en leaderboard (DD-48.3: transparente).
- Invalidacion automatica de overrides al editar la global (DD-48.4: independientes).
- Eliminar override sin tener global (DD-48.5: boton solo visible si hay global).
- Predicciones pool-scoped en notificaciones push (las notificaciones existentes se disparan por sweeper, que puntua todas las predicciones; no se distinguen).
- Migracion de datos (no hay datos que migrar: todas las filas existentes tienen poolId=NULL por default y son predicciones globales).
