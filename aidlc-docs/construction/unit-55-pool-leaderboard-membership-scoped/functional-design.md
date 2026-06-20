# Functional Design — Unit 55: Leaderboard del pool acotado a la membresía

> Refine post-construcción (2026-06-20) vía `/aidlc:refine`. Cambio de **regla de
> negocio** sobre el cálculo del leaderboard del pool. **Plan presentado y aprobado
> antes de ejecutar.** **No reinicia** etapas aprobadas (Units 1–54). Deriva de
> Unit 6 (Scoring y Rankings) y Unit 48 (override por pool), y hace efectiva la
> "consecuencia natural" prometida por Unit 23 (membresía sin congelamiento).

## Traceability

| ID | Source | Description |
|----|--------|-------------|
| FR-REFINE-55.1 | requirements | El leaderboard del pool muestra solo el puntaje acumulado dentro de ese pool |
| US-55.1 | stories | Ver el ranking de mi liga con los puntos que se acumularon en la liga |
| DD-48.3 | workflow | Leaderboard transparente (sin cambios de DTO) — se conserva |

## 1. Intención del usuario

> *"El ranking dentro de los pools está mostrando el puntaje global y tiene que
> mostrar el puntaje de ese pool solamente."*

Aclaración del usuario: existen **dos leaderboards independientes**:

- **Global** (menú principal, `/rankings`): la sumatoria de las **predicciones globales**
  del usuario (`poolId IS NULL`). **No cambia.**
- **Pool/liga** (`/pools/[id]`): el puntaje que el miembro **acumuló únicamente dentro de
  ese pool**, contando tanto las predicciones **heredadas del global** (cuando no hay
  override) como los **overrides** del pool, **pero solo de los partidos jugados después de
  que ese miembro ingresó al pool**.

## 2. Causa y diagnóstico

`getPoolLeaderboardRows(poolId)` (`src/features/scoring-rankings/queries.ts`) ya resolvía
la preferencia override-sobre-global por (miembro, partido) introducida en Unit 48
(BR-48.9 / BL-48.3), **pero sumaba todos los scores del miembro sin filtrar por
`PoolMembership.joinedAt`**. Para quien venía prediciendo en global desde antes de unirse a
la liga, el total del pool terminaba igual a su total global → el síntoma reportado ("el
pool muestra el puntaje global").

Además, **Unit 23** (membresía sin congelamiento) prometía explícitamente que *"quien se
une tarde simplemente no puntúa los partidos ya cerrados"*; esa garantía nunca llegó a
aplicarse en el cálculo del leaderboard. Unit 55 la hace efectiva.

## 3. Business Rules

| ID | Regla | Trazabilidad |
|---|---|---|
| **BR-55.1** | El leaderboard del pool suma, por miembro, los puntos de los partidos cuyo `kickoffAt ≥ membership.joinedAt` (partidos jugados **después** de que el miembro ingresó al pool). Los partidos con `kickoffAt` anterior al ingreso, o sin `kickoffAt`, no cuentan. | FR-REFINE-55.1, US-55.1 |
| **BR-55.2** | Para los partidos que sí califican (BR-55.1), se conserva la resolución de Unit 48: por (miembro, partido) se usa el **override** del pool si existe; si no, la **predicción global** heredada. Sin doble conteo. | BR-48.9, FR-REFINE-55.1 |
| **BR-55.3** | Un miembro recién ingresado, sin partidos jugados tras su ingreso, aparece con **0 puntos** en el leaderboard del pool (no hereda el histórico previo a su ingreso). | FR-REFINE-55.1 |
| **BR-55.4** | El **ranking global** (`getGlobalRankingRows`, `/rankings`) **no cambia**: sigue sumando solo predicciones con `poolId IS NULL`, sin acotar por membresía de ningún pool. | BR-48.10 |
| **BR-55.5** | El filtro por `joinedAt` es consistente con la deduplicación override-vs-global: el `kickoffAt` es idéntico para la global y el override de un mismo partido, así que ambos se incluyen o excluyen juntos. | BR-48.19 |
| **BR-55.6** | El DTO `LeaderboardRow` no cambia (DD-48.3, leaderboard transparente). El empate y la asignación de posiciones (`assignDensePositions`) se conservan. | DD-48.3 |

## 4. Business Logic Model

### BL-55.1: `getPoolLeaderboardRows` acotado por `joinedAt`

> Extiende BL-48.3. El único delta es el filtro por fecha de ingreso.

```
function getPoolLeaderboardRows(poolId):
    members = PoolMembership.findMany(poolId) join Profile   // + joinedAt
    joinedAt = Map(userId -> joinedAt)
    memberIds = members.userId

    scoreRows = PredictionScore.findMany where
        prediction.userId IN memberIds AND
        (prediction.poolId = poolId OR prediction.poolId IS NULL)
        select { userId, totalPoints, prediction.{poolId, matchId, match.kickoffAt} }

    overrideKeys = { (userId, matchId) : prediction.poolId == poolId }

    totals = {}
    for row in scoreRows:
        joined = joinedAt[row.userId]
        kickoff = row.prediction.match.kickoffAt
        if joined is null OR kickoff is null OR kickoff < joined: continue   // BR-55.1

        if row.prediction.poolId == poolId:                 // override → cuenta
            totals[userId] += row.totalPoints
        else if (userId, matchId) not in overrideKeys:      // global sin override → cuenta
            totals[userId] += row.totalPoints

    rows = members.map(m -> { ..., totalPoints: totals[m.userId] ?? 0 })   // BR-55.3
    sort rows by totalPoints DESC
    return assignDensePositions(rows)                       // BR-55.6
```

`getPoolLeaderboard(poolId, viewerId)` (wrapper de membresía/viewer) y
`getGlobalRanking*` no cambian.

## 5. Contratos / cambios de código

| Archivo | Cambio |
|---|---|
| `src/features/scoring-rankings/queries.ts` | `getPoolLeaderboardRows`: `select` de membership añade `joinedAt`; `select` de `predictionScore` añade `prediction.match.kickoffAt`; bucle de sumatoria descarta filas con `kickoff < joinedAt` (BR-55.1) antes de la resolución override/global existente. |
| `src/features/scoring-rankings/__tests__/pool-leaderboard.test.ts` | Helpers `member`/`score` con `joinedAt` y `match.kickoffAt`; +3 casos (pre-ingreso excluido; override pre-ingreso excluido; ranking de dos miembros con distinta `joinedAt`). |

### Sin cambios
- `getGlobalRankingRows` / `getGlobalRanking` (BR-55.4).
- `getPoolLeaderboard` wrapper (gate de membresía + marca de viewer).
- Caché: clave por `poolId`, tags `POOL_LEADERBOARD_TAG_PREFIX` + `RANKINGS_TAG`. Las
  mutaciones de membresía ya invalidan `RANKINGS_TAG` (Unit 52), así que un nuevo ingreso
  recalcula el leaderboard.
- Motor de scoring (`score-match.ts`), `assignDensePositions`, esquema, migraciones, rutas,
  i18n y el componente `PoolLeaderboard` (el DTO no cambia).

### Fuera de alcance
- La pestaña "Predicciones" del pool y sus celdas de puntos por partido (la solicitud es
  sobre el **ranking/leaderboard**, no la grilla).
- El leaderboard/ranking global.
- Distinguir el caso "se unió y luego salió/reingresó" más allá del `joinedAt` vigente de la
  fila de membresía actual.

## 6. Security Baseline Compliance

| Regla | Estado | Razón |
|---|---|---|
| SECURITY-08 | **COMPLIANT** | Se conserva el gate de membresía de `getPoolLeaderboard` (viewer debe ser miembro). |
| SECURITY-12 | **COMPLIANT** | Sin cambios en sesión/autenticación. |
| Resto | N/A | Cambio read-only; sin nueva superficie de input, schema, migraciones ni rutas. |

## 7. Verificación

- `pnpm exec tsc --noEmit` → 0 errores.
- Biome / ESLint limpios en los archivos tocados.
- `pnpm exec vitest run src/features/scoring-rankings/__tests__/pool-leaderboard.test.ts`
  → verde (incluye los nuevos casos de `joinedAt`).
- `pnpm exec vitest run` → suite completa verde.
- `pnpm build` → OK.
- Manual: pool creado/unido a mitad de torneo → el total de un miembro recién unido refleja
  solo partidos posteriores a su ingreso; quien creó el pool al inicio no cambia; `/rankings`
  (global) sin cambios.
