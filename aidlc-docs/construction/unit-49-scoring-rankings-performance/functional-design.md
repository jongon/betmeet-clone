# Functional Design (Light) — Unit 49: Performance hardening de scoring-rankings

## Stage

Construction · Functional Design (Light, refine delta) · post-construction
brownfield. Refine sobre Unit 6 (Scoring and Pool Rankings), Unit 37
(Performance Fase 3 — caché de leaderboard) y Unit 48 (override por pool).

## Context

El cálculo de puntos del proyecto es **unificado**: una sola función pura
(`computeScore`), un solo campo (`PredictionScore.totalPoints`) y un solo motor
de escritura (`scoreMatch`). "Pool" y "global" son dos **vistas** de las mismas
`PredictionScore`, diferenciadas por `Prediction.poolId` en las queries de
ranking (Unit 48). Ese diseño es correcto y se conserva.

Al revisar la escalabilidad del ranking con muchos usuarios se detectaron tres
ineficiencias en **cómo se agregan/escriben** los datos (no en el diseño):

1. **`getGlobalRankingRows`** (`queries.ts`) cargaba **todas** las filas
   `PredictionScore` globales (`usuarios × partidos`) al proceso y las sumaba en
   JS con un `Map`. O(n) pero con alto volumen de transferencia y memoria.
2. **`getPoolLeaderboardRows`** (`queries.ts`) resolvía override-vs-global con un
   `scoreRows.some(...)` **dentro** del bucle sobre `scoreRows` → **O(n²)**.
3. **`scoreMatch`** (`services/score-match.ts`) escribía **un upsert por
   predicción** dentro de un único `prisma.$transaction([...])` → con muchos
   usuarios, una transacción larga con N statements y N round-trips.

Esta unidad aplica tres arreglos quirúrgicos, **sin cambiar el modelo de
datos, el comportamiento observable, el schema, las migraciones, las rutas ni
i18n**.

## Business Logic Model

### BL-49.1 — Agregación del ranking global en la base de datos (modificado desde Unit 6)

`getGlobalRankingRows` usa `prisma.predictionScore.groupBy({ by: ["userId"],
where: { prediction: { poolId: null } }, _sum: { totalPoints: true } })`. La
base de datos devuelve **una fila por usuario** (`SUM ... GROUP BY user_id`) en
lugar de una por `(usuario, partido)`. El resto del flujo (perfiles verificados,
orden desc + desempate por nickname, `assignDensePositions`) es idéntico.
Resultado funcional **idéntico** al previo.

### BL-49.2 — Resolución override-vs-global en O(n) (modificado desde Unit 48)

`getPoolLeaderboardRows` precomputa en **una sola pasada** un
`Set<"userId:matchId">` con los pares que tienen override de pool
(`prediction.poolId === poolId`). El bucle de totales consulta ese `Set` en O(1)
en vez del `.some()` cuadrático. Misma regla: el override (si existe) suma sus
puntos; la fila global se cuenta **solo** si no hay override para ese
`(usuario, partido)`. Resultado funcional **idéntico** al previo.

### BL-49.3 — Bulk upsert atómico del scoring (modificado desde Unit 6)

`scoreMatch` reemplaza los N upserts en transacción por **un único**
`INSERT INTO prediction_scores (...) VALUES (...), (...) ON CONFLICT
(prediction_id) DO UPDATE SET ...` vía `prisma.$executeRaw` con
`Prisma.sql`/`Prisma.join`. Un solo statement = atomicidad todo-o-nada (coherente
con la decisión de Unit 48 sobre escrituras atómicas) y un solo round-trip.
Sigue siendo **idempotente** (re-ejecutar sobrescribe cada fila — seguro tras un
override de admin, BR-6.6). El `id` de filas nuevas se genera con
`randomUUID()`; en conflicto se preserva el `id` existente. La rama no-scoreable
(`deleteMany`, BR-6.7) y la emisión de eventos de mejora de rango
(`emitGlobalRankImprovedEvents`) no cambian. Guard nuevo: si el partido no tiene
predicciones, se omite el `INSERT` (antes `$transaction([])` era no-op).

## Business Rules

- **BR-49.1**: El ranking global se agrega en SQL (`groupBy` + `_sum`); el cliente
  recibe una fila por usuario, no una por score. (Refina BR-6 / Unit 6.)
- **BR-49.2**: La resolución override-vs-global del leaderboard de pool es O(n)
  vía índice `Set` de overrides; produce los mismos totales que la versión O(n²).
  (Refina la lógica de Unit 48.)
- **BR-49.3**: El scoring de un partido se persiste en un único `INSERT ... ON
  CONFLICT` atómico e idempotente; partidos sin predicciones no ejecutan escritura.
- **BR-49.4**: Sin cambios de comportamiento observable, schema, migraciones,
  rutas, claves i18n ni reglas de scoring (`ScoringRuleSet` intacto).

## Frontend Components

Ninguno. Cambios exclusivamente en la capa de queries/servicios.

## Backend / Files

### Archivos modificados

- `src/features/scoring-rankings/queries.ts` — `getGlobalRankingRows` (groupBy),
  `getPoolLeaderboardRows` (Set O(n)).
- `src/features/scoring-rankings/services/score-match.ts` — bulk upsert atómico
  (`$executeRaw` + `Prisma.sql`/`Prisma.join`, `randomUUID`); se elimina el
  import de `ScoreMatchedCase` (el enum se castea en SQL como `"ScoreMatchedCase"`).

### Tests modificados / añadidos

- `src/features/scoring-rankings/__tests__/global-ranking.test.ts` — mock de
  `groupBy` (forma `{ userId, _sum: { totalPoints } }`).
- `src/features/scoring-rankings/services/__tests__/score-match.test.ts` — mock de
  `$executeRaw`; verifica una sola escritura atómica para el partido finalizado.
- `src/features/scoring-rankings/__tests__/pool-leaderboard.test.ts` — **nuevo**;
  fija la resolución override-vs-global (override gana, fallback global, ranking
  + viewer, no-miembro → null).

## i18n

Sin cambios.

## Out of Scope

- Materializar un total por usuario (columna/tabla `userTotalPoints` o vista
  materializada) — solución de fondo para escala muy grande; queda como mejora
  futura separada.
- Batching de scoring en transacciones independientes (descartado por romper la
  atomicidad establecida en Unit 48).
- Cualquier cambio en `computeScore`, `ScoringRuleSet`, sync u override de admin.

## Security Baseline Compliance

- **RULE-SEC-01 (input validation)**: N/A — no añade entradas de usuario.
- **RULE-SEC-02 (authz)**: sin cambios; `getPoolLeaderboard` conserva la
  validación de membresía del viewer.
- **RULE-SEC-04 (SQL injection)**: COMPLIANT — el `INSERT` usa
  `Prisma.sql`/`Prisma.join` parametrizado; no hay interpolación de strings
  crudos. Mismo patrón ya usado con `$queryRaw` en el repo.
- **RLS**: COMPLIANT — `$executeRaw` usa la misma conexión/rol que el upsert
  previo; las políticas de `prediction_scores` aplican igual.
- Resto de reglas: N/A (sin superficie nueva).

## Verification Plan

### Estándar (ejecutado)

- `tsc --noEmit`: 0 errores.
- Biome: clean (5 archivos). ESLint: 0.
- Vitest: **355/355** (67 archivos; +4 tests nuevos de pool-leaderboard).
- `pnpm build`: OK (25 rutas).

### Específica

- `global-ranking.test.ts`: empty, perfiles verificados, orden desc + viewer,
  desempate denso con `groupBy` — verde.
- `score-match.test.ts`: finished → una escritura `$executeRaw` atómica;
  no-scoreable → `deleteMany` y sin escritura; match inexistente → `scored 0`.
- `pool-leaderboard.test.ts`: override gana sobre global del mismo partido;
  fallback a global sin override; ranking por puntos resueltos + viewer;
  no-miembro → null.

## Artifact Changes After Functional Design Approval

- Código ya implementado (refine delta autónomo solicitado por el usuario:
  "Haz esos arreglos quirúrgicos").
- `aidlc-state.md` y `audit.md` actualizados; `unit-of-work.md` con Unit 49 y
  secuencia #34.

## Approval Gate

Refine delta light sobre stages ya aprobados (Units 1–48 intactas). No reinicia
etapas aprobadas.
