# Functional Design — Unit 62: Proyección de leaderboard en vivo

> Refine post-construcción (2026-06-23). Refine sobre **Unit 6** (scoring/rankings), **Unit 55** (leaderboard del pool acotado a la membresía), **Unit 56** (`preJoin`) y **Unit 58** (`useLiveResults` + cron `LIVE_STATUS`). **No reinicia** etapas aprobadas (Units 1–61 intactas). **Unit 61 NO está implementada** en el repo; Unit 62 se construye sobre el estado actual del código y es **independiente** (coexistirá con Unit 61 cuando esta última se implemente — sin conflicto: Unit 61 superficia partidos LIVE en un banner cross-tab, Unit 62 proyecta el leaderboard; ambos consumen `useLiveResults`).

## Traceability

| ID | Source | Description |
|----|--------|-------------|
| FR-REFINE-62.1 | requirements | Proyección del puntaje con marcador en vivo (override ?? global + `preJoin`, `computeScore` sin persistir) |
| FR-REFINE-62.2 | requirements | Re-ordenación por proyectado + visualización (`pts actual → proy.`, cambio posición `▲▼=`) |
| FR-REFINE-62.3 | requirements | Refresco vía `useLiveResults()` en `/rankings`, `/pools/[id]`, `/pools/[id]/leaderboard` |
| FR-REFINE-62.4 | requirements | Alcance pool + global (mismas reglas de scope que el leaderboard confirmado) |

## 1. Contexto y causa raíz

**Brecha de feedback en vivo**: los leaderboards (`/rankings`, `/pools/[id]` tab Clasificación, `/pools/[id]/leaderboard`) muestran solo `totalPoints` confirmados (suma de `PredictionScore.totalPoints` de partidos FINISHED, cacheada via `unstable_cache` con tags `RANKINGS_TAG` / `POOL_LEADERBOARD_TAG_PREFIX`, `revalidate: 300`). Mientras hay `LIVE`, ese match **no tiene `PredictionScore`** (solo se persiste al `FINISHED`, ver `score-match.ts:24-25` schooling condition `status === "FINISHED" && scores !== null`), y por tanto aporta **0** al ranking. El marcador en vivo ya está disponible (`Match.homeScore/awayScore` escritos por el cron `LIVE_STATUS` cada ~2 min y refrescados en cliente por el broadcast `useLiveResults` de Unit 58), pero el usuario no ve cómo se reordenaría el ranking si el marcador actual se mantuviera al final.

Esta unit añade una **proyección en vivo pura por render**: sobre el `totalPoints` confirmado ya cacheado, suma `Σ computeScore(predicción override ?? global, marcador actual)` para cada partido LIVE del scope. **No se persiste nada**; no se invalida el caché confirmado; no aparece `PredictionScore` para LIVE.

## 2. Business Rules

### BR-62.1 — Proyección sólo cuando hay LIVE
Si `liveMatches.length === 0` (no hay ningún partido `LIVE` en la competición), la proyección **no se aplica**: el leaderboard se comporta **idéntico al actual** (sin columna proyectada, sin reordenado, sin badge). Es un cambio **condicional por estado de la competición**, no un modo siempre activo. La detección de `liveMatches` se hace **server-side** en cada route (`/rankings`, `/pools/[id]`, `/pools/[id]/leaderboard`) con una sola query ligera (`prisma.match.findMany({ where: { status: "LIVE" }, select: … })`).

### BR-62.2 — Puntaje proyectado (definición)
Por cada usuario en el scope, `projectedPoints = totalPointsConfirmado + livePoints`, donde:
- `totalPointsConfirmado` = el `totalPoints` del `LeaderboardRow` ya cacheado (FINISHED-only).
- `livePoints = Σ computeScore(toScoringExample(predicho, matchLIVE))` sobre los partidos `LIVE` del scope donde el usuario tenga predicción (override ?? global).
- La resolución **override ?? global** y el filtro **scope** son los **mismos** que el leaderboard confirmado (reusados textualmente de `getPoolLeaderboardRows` / `getGlobalRankingRows`):
  - **Pool**: por `(member, LIVE match)`, se usa el override del pool si existe, si no la global `poolId IS NULL`. **`preJoin` (Unit 55/56)**: si `match.kickoffAt < member.joinedAt`, la predicción de ese match **no se proyecta** (no puntúa en el pool, igual que los FINISHED).
  - **Global**: por `(user, LIVE match)`, se usa **solo** la predicción global (`poolId IS NULL`); las overrides de pool **se ignoran** (consistente con `getGlobalRankingRows:15`).
- `computeScore` se invoca **tal cual** (BR-2.7 — no redefinir reglas); se reusa `toScoringExample` (`score-adapter.ts:37`).

### BR-62.3 — Bonus de penales **no aplica durante LIVE**
Durante `LIVE`, `Match.winnerTeamId` es `null` (el ganador se decide al `FINISHED`/tras la tanda; el cron `LIVE_STATUS` escribe `homeScore/awayScore` pero **no** `winnerTeamId`). `computeScore` exige `actualPenaltyWinner != null && actualPenaltyWinner === predictedPenaltyWinner` (`compute-score.ts:88-96`), así que **el bonus de penales no se concede durante LIVE**, aunque la predicción defina `penaltyWinnerTeamId`. Es lo correcto: el resultado real de penales es **desconocido** durante LIVE, no podemos "premiar" una predicción sin confirmar. Si el partido es knockout y el marcador LIVE va empatado, la predicción puede acertar resultado/goles pero **no** el bonus. El bonus aparece automáticamente al `FINISHED` cuando `scoreMatch` persiste. Documentado para evitar confusión.

### BR-62.4 — MVP: usuarios "nuevos" viven en la proyección
Si un usuario tiene predicción en partido(s) LIVE pero **no está en los rows confirmados cacheados** (porque no tiene `PredictionScore` de ningún FINISHED — empezó tarde, predicciones sólo en SCHEDULED/LIVE), se **incluye** en la proyección con `totalPointsConfirmado = 0` y `previousPosition = null`. La fila se sintetiza con su nickname/avatar desde la query ligera de predicciones LIVE. Sin esto, un usuario novato con predicciones en su primer partido en vivo nunca aparecería proyectado. (MVP: implementable barato porque la query LIVE ya trae el `userId`/`nickname`/`avatarUrl`.)

### BR-62.5 — Re-ordenación por proyectado + visualización (mientras haya LIVE)
Cuando `liveMatches.length > 0`, el componente `PoolLeaderboard`:
- ** Ordena** los rows por `projectedPoints` desc, desempate por `nickname.localeCompare` (igual que el orden actual, `queries.ts:43/137`).
- **Asigna `projectedPosition`** con `assignDensePositions` (densa, igual que BR-6.13).
- **`previousPosition`**: el `position` del row confirmado original (antes de re-ordenar). Para rows sintetizados (BR-62.4) → `null`.
- **`delta` = `previousPosition - projectedPosition`**: `null` si `previousPosition === null`, `0` si igual, `>0` si subió (negativo-ish? usar signo claro: `▲` delta, `▼` -delta, `=` 0).
- Cada fila renderiza sus dos puntos: `<total> → <projected>`. Si `totalPointsConfirmado === projectedPoints` (LIVE no movió el total: el usuario no predijo el LIVE o tiene 0 proyectado en todos sus LIVE), se muestra solo `<projected>` con badge "proy." pero **con indicador `=`** de no-cambio (o se omite la flecha). El usuario siempre ve `pts actuales → proyectados` cuando ambos difieren.
- **Sin LIVE**: el componente usa el modo actual (sólo `<total>`, sin badge, sin reordenado).

### BR-62.6 — Refresco en vivo (reuso Unit 58)
`/rankings`, `/pools/[id]` (tab Clasificación) y `/pools/[id]/leaderboard` montan `useLiveResults()` (Unit 58). Al broadcast `results-updated` → `router.refresh()` con debounce 1s → re-render server → nueva query LIVE → nueva proyección. Degradación limpia si Realtime no está disponible (BR-58.6): la última proyección queda visible hasta el siguiente refresco manual/sync. **No se añade** nueva superficie de Realtime: se reusa el canal/hook preexistente.

> **Nota para `/pools/[id]`**: hoy `pool-predictions-view.tsx` ya monta `useLiveResults()` (Unit 58) en la tab Predicciones; pero como la proyección vive en la tab **Clasificación**, necesita su propia suscripción (es la misma hook — una `channel("live-results")` por mount, no hay problema con dos canales en una página; Supabase Realtime coalescea). **Alternativa considerada y descartada**: mover `useLiveResults` al wrapper del detail (similar a lo planeado en Unit 61 `PoolDetailTabs`). **Descartado** porque eso sería tocar Unit 61 (no implementada) — Unit 62 es independiente. Se mantiene `useLiveResults` en `pool-predictions-view.tsx` **sin cambios**, y se **añade** uno en la tab Clasificación (sección pequeña).

### BR-62.7 — No invalida el caché confirmado
La proyección **no** llama `revalidateTag(RANKINGS_TAG / POOL_LEADERBOARD_TAG_PREFIX)`. Los rows confirmados vienen del **caché vigente** (300s backstop). La proyección se calcula **al vuelo** por render sobre esos rows + una query LIVE fresca (`prisma.match.findMany` + `prisma.prediction.findMany` para los matches LIVE). El cache confirmado sigue invalidándose por los caminos existentes (`scoreMatch` vía cron `RESULTS`/admin, `kick-member`, `join-…`). **Mientras LIVE no se puntúa**, el cache confirmado no cambia durante el partido → no hay churn de invalidación. Coherente con BR-52 (`revalidateTag` desde mutaciones).

### BR-62.8 — Perfil-borrado / `UNVERIFIED` / no-considerado (pool)
Se mantienen los filtros del leaderboard confirmado: en global, `profiles.verificationStatus != UNVERIFIED && deletedAt == null` (`queries.ts:29`); en pool, sólo miembros (`PoolMembership`), y la proyección reusa el mismo set de miembros. Los usuarios blando-borrados o unverified con predicciones en LIVE **no aparecen** en la proyección global (sí en pool si son miembros — consistente con hoy: el pool leaderboard los cuenta).

## 3. Business Logic Model

### BL-62.1 — `project-leaderboard.ts` (NEW, puro)
`src/features/scoring-rankings/services/project-leaderboard.ts`. **Puro** (sin IO, sin Prisma, sin React cache) — testeable aislado.

```ts
import { computeScore } from "@/features/scoring/compute-score";
import { toScoringExample, type ScoreablePrediction, type ScoreableMatch } from "./score-adapter";
import { assignDensePositions } from "./ranking";
import type { LeaderboardRow } from "../types";

/** Un match LIVE con los datos para score (BR-62.2). */
export interface LiveMatchForProjection {
  matchId: string;
  kickoffAt: Date | null;
  match: ScoreableMatch;
}

/** Predicción de un usuario para un match LIVE en el scope (override ya resuelto). */
export interface LivePredictionForProjection {
  userId: string;
  matchId: string;
  /** Resolución ya hecha por el caller: override del pool si existe, si no global. */
  prediction: ScoreablePrediction;
  /** Nickname/avatar si el usuario no está en los rows confirmados (sintetizados, BR-62.4). */
  nickname?: string;
  avatarUrl?: string | null;
}

export interface ProjectedLeaderboardRow extends LeaderboardRow {
  /** Puntaje confirmado (FINISHED) — igual a `totalPoints`. */
  livePoints: number;
  /** Confirmado + proyección. */
  projectedPoints: number;
  /** Posición en el ranking confirmado (antes de proyectar); null si es row sintetizado. */
  previousPosition: number | null;
  /** Posición en el ranking proyectado. */
  projectedPosition: number;
  /** delta = previousPosition - projectedPosition (null si previousPosition null; positivo=subió). */
  positionDelta: number | null;
}

/**
 * Proyecta un leaderboard contra el marcador en vivo actual (BR-62.2). Pura.
 *
 * @param rows  rows confirmados (FINISHED-only) ya cacheados (con `position`).
 * @param liveMatches  partidos LIVE del scope con su score actual.
 * @param livePredictions  predicciones del scope para esos LIVE matches.
 * @param shouldSkipPred built-in filtrador de "no contará" (e.g. preJoin para pool).
 *
 * - Sobre c/u de los rows: suma `computeScore(prediction, match)` a `projectedPoints`.
 * - Sintetiza rows para usuarios con LIVE preds pero no en `rows` (BR-62.4).
 * - Reordena por `projectedPoints` desc, nickname asc; asigna `projectedPosition` densa.
 */
export function projectLeaderboard(params: {
  rows: LeaderboardRow[];
  liveMatches: LiveMatchForProjection[];
  livePredictions: LivePredictionForProjection[];
  shouldSkipPrediction?: (p: LivePredictionForProjection, m: LiveMatchForProjection) => boolean;
}): ProjectedLeaderboardRow[] {
  // (1) index de predicciones por (userId, matchId)
  // (2) index de matches LIVE por matchId
  // (3) copia de rows → livePoints = 0, projectedPoints = totalPoints
  // (4) por cada livePrediction no-skippeada: match = index.get(matchId); if !match continue;
  //     score = computeScore(toScoringExample(prediction, match.match));
  //     row = rows.find(r => r.userId === p.userId); if !row → crear sintetizado (BR-62.4)
  //     row.livePoints += score.totalPoints; row.projectedPoints += score.totalPoints;
  // (5) sort desc por projectedPoints, nickname asc
  // (6) assignDensePositions sobre projectedPoints → projectedPosition + isTied (overwrite de la confirmada)
  // (7) previousPosition = row.position original (preservado); positionDelta = prev != null ? prev - proj : null
  // return
}
```

Las notas `// (n)` son **pseudocódigo** — la implementación literal sigue en Code Generation. La firma y la semántica están tabuladas arriba (BR-62.2).

### BL-62.2 — `getLiveProjectionData` queries (NEW, no cached)
En `src/features/scoring-rankings/queries.ts`, **no** dentro del `unstable_cache`:
- `getGlobalRankingProjection(viewerId): Promise<{ rows: ProjectedLeaderboardRow[]; hasLive: boolean } | null>`
  1. `rows = await getGlobalRanking(viewerId)` (cache confirmado).
  2. `liveMatches = await prisma.match.findMany({ where: { status: "LIVE" }, select: { id, matchNumber, kickoffAt, homeScore, awayScore, homeTeamId, awayTeamId, winnerTeamId, phase: { select: { type: true } } } })` — query muy acotada (solo LIVE, normalmente 0-3 rows).
  3. Si `liveMatches.length === 0` → `{ rows: rows sin-projected (camp `projectedPoints=totalPoints`?), hasLive: false }`. **Nota de diseño**: el caller decide no renderizar modo proyección; el tipo sí uniforme para simplificar el componente. En lugar de false, retorna las rows "transformadas a projected" con `projectedPoints = totalPoints, livePoints=0, positionDelta=0`, pero el caller usa `hasLive=false` para render normal.
  4. `liveMatchIds = liveMatches.map(m => m.id)`.
  5. `livePreds = await prisma.prediction.findMany({ where: { matchId: { in: liveMatchIds }, poolId: null }, select: { userId, matchId, homeScore, awayScore, penaltyWinnerTeamId, user: { select: { nicknameBase, nicknameDiscriminator, avatarUrl } } }, include: { match: { select: { kickoffAt: true } } } })` — **global scope: `poolId: null`** (BR-62.2).
  6. Filtrar `UNVERIFIED`/`deletedAt!=null` via join `user: { … }` select + check: en pool es por membresía (siempre considerado si es miembro), en global se respeta el filtro de `getGlobalRankingRows` — el `findMany` de predicciones debe excluir usuarios con `profile.verificationStatus = UNVERIFIED || deletedAt != null` (añadir al where de `prediction`).
  7. Llamar `projectLeaderboard({ rows, liveMatches: mapToLiveMatchForProjection(liveMatches), livePredictions: mapToLivePrediction(livePreds), shouldSkipPrediction: undefined })`.
  8. Return `{ rows: projectedRows, hasLive: true }`.

- `getPoolLeaderboardProjection(poolId, viewerId): Promise<{ rows: ProjectedLeaderboardRow[]; hasLive: boolean } | null>`
  1. `rows = await getPoolLeaderboard(poolId, viewerId)` (cache confirmado); si null → null (no miembro).
  2. `liveMatches` igual.
  3. Si no hay LIVE → retornar rows proyectadas-identidad con `hasLive: false`.
  4. `members = await prisma.poolMembership.findMany({ where: { poolId }, select: { userId: true, joinedAt: true } })` → para `preJoin` (BR-62.2 pool).
  5. `livePreds` query: predicciones para los LIVE matches con `prediction.userId IN memberIds AND (poolId == poolId OR poolId IS NULL)`. **Resolve override ?? global**: group by `(userId, matchId)`; si hay fila con `poolId: poolId` usarla si predicción válida, si no usar la `poolId: null`. Esto replica la dedup de `getPoolLeaderboardRows:96-127`. Implementar con el mismo patrón `overrideKeys` Set + iteración.
  6. `shouldSkipPrediction = (p, m) => { joinedAt = memberJoinedAt.get(p.userId); if !joinedAt || !m.kickoffAt return false; return m.kickoffAt < joinedAt }` (**preJoin** — BR-62.2 pool).
  7. Llamar `projectLeaderboard(…)`.
  8. Return.

Estas funciones **no se cachean** (la proyección se recalcula por render usando el marcador fresco). El cache confirmado subyacente sigue intacto.

### BL-62.3 — `getPoolLiveMatches` ligero (NEW, no cached)
En `queries.ts`. Pequeño helper: `prisma.match.findMany({ where: { status: "LIVE" }, select: { id: true } }).then(ms => ms.length > 0)`.Usado por `/pools/[id]/page.tsx` para decidir si la tab Clasificación debe render en modo proyección sin re-query LIVE completo dos veces (pool detail ya carga `getPoolMemberPredictions` que trae los matches, así que poda el query duplicado: `page.tsx` puede reusar `predictionsData.matches.filter(m => m.matchStatus === "LIVE")`).

> **Optimización**: en `/pools/[id]`, `getPoolMemberPredictions` ya trae todos los matches con `matchStatus/homeScore/awayScore`; basta filtrar LIVE ahí y reusar los `predictions` para armar los `LivePredictionForProjection`, **evitando hit a la DB**. Esta route usa variante "projection-from-loaded-data": nueva query `projectPoolLeaderboardFromLoaded(loaderboardRows, matches, predictions, members)`. Otro helper puro. (Ver BL-62.4.)

### BL-62.4 — `projectPoolLeaderboardFromLoaded` (NEW, puro)
`project-leaderboard.ts`. Variante de `projectLeaderboard` que acepta `MatchView[]` + `PoolMemberPrediction[]` (los ya cargados por `getPoolMemberPredictions`) en lugar de las queries LIVE dedicadas. Útil para `/pools/[id]` donde los matches ya están en memoria. Convierte `MatchView → LiveMatchForProjection` y `PoolMemberPrediction → LivePredictionForProjection` (resolviendo override ?? global por `(userId, matchId)` de `isOverride`/`hidden`, y filtrando `hidden==true` — pero un partido LIVE nunca está `hidden`, confirmado Unit 53/BR-41.2 — y `preJoin` porjoinedAt/kickoffAt).

### BL-62.5 — `PoolLeaderboard` modo proyección
`src/features/scoring-rankings/components/pool-leaderboard.tsx`. Añade props opcionales:
- `projected?: ProjectedLeaderboardRow[]` — si existe y `hasLive`, renderiza modo proyección.
- `hasLive?: boolean` — flag para toggle.

Lógica en el componente:
- Si `projected == null || hasLive === false` → modo actual (sin cambios).
- Si `projected` presente AND `hasLive` → modo proyección: itera `projected` (ya re-ordenado por projectedPoints, con `projectedPosition`):
  - Muestra `<projectedPoints>` como principal; `<totalPoints>` debajo/discreto con `→` entre ellos.
  - Badge "proy." (i18n `rankings.liveProjection.badge`).
  - Indicador de cambio: `▲{delta}` si delta>0, `▼{-delta}` si delta<0, `=` si 0, `—` si null.
  - `position` mostrado = `projectedPosition` (densa), igual que BR-6.13.
- `isViewer` highlight conservado.
- `data-testid` nuevos: `pool-leaderboard-row-${userId}-projected`, `pool-leaderboard-row-${userId}-delta`.

### BL-62.6 — Routes (server-side fetching + client subscription)
- `/rankings/page.tsx`: reemplaza `rows = await getGlobalRanking(viewerId)` con `const { rows, hasLive } = await getGlobalRankingProjection(viewerId)` (note: rows is `ProjectedLeaderboardRow[]`). Pasa a `<PoolLeaderboard rows projected={rows} hasLive={hasLive} />`. Monta `useLiveResults()` en un wrapper client (pequeño `RankingsLiveRefresh` client wrapper) porque la page es server.
- `/pools/[id]/page.tsx`: tras `Promise.all([getPoolDetail, getPoolLeaderboard, getPoolMemberPredictions])`, calcula `liveMatches = predictionsData.matches.filter(m => m.matchStatus === "LIVE")`. Si `liveMatches.length > 0`: `projected = projectPoolLeaderboardFromLoaded({ rows: leaderboard ?? [], matches: predictionsData.matches, predictions: predictionsData.predictions, members: pool.members })` y `hasLive = true`. Sino `projected = null, hasLive = false`. La sección tab Clasificación reemplaza `PoolLeaderboard rows={leaderboard} limit={5}` con `projected={projected} hasLive={hasLive}`. La tab Clasificación necesita `useLiveResults()` porque el grid está en otra tab — se añade un client wrapper pequeño `PoolLeaderboardSection` (es el contenedor del `<section>` actual) que monta la hook.
- `/pools/[id]/leaderboard/page.tsx`: usa `getPoolLeaderboardProjection(id, userId)` y un client wrapper `LeaderboardPageLiveRefresh` similar.

> **Client wrappers**: dos componentes muy pequeños y testeables — `RankingsLiveRefresh`, `PoolLeaderboardLiveRefresh` y `LeaderboardPageLiveRefresh` — cada uno `<div className="block">{children}</div>` + `useLiveResults()`. **DRY**: se considera un `LeaderboardLiveRefreshProvider` único con `rate` configurable, pero por ahora separamos tres wrappers para explicitar el scope y evitar tocar units externas.

### BL-62.7 — i18n (NEW keys)
`src/i18n/dictionaries/{es,en}.ts`:
- `rankings.liveProjection.badge` = `"proy."` / `"proj."`
- `rankings.liveProjection.currentPts` = `"actual"` / `"current"`
- `rankings.liveProjection.projectedPts` = `"proy."` / `"proj."`
- `rankings.liveProjection.rise` = `"sube"` / `"up"`
- `rankings.liveProjection.fall` = `"baja"` / `"down"`
- `rankings.liveProjection.same` = `"igual"` / `"same"`
- `rankings.liveProjection.newEntry` = `"nuevo"` / `"new"` (para rows sintetizadas, delta null)
- `rankings.liveProjection Disclaimer` (tooltip/aria): `"Ranking proyectado si el marcador en vivo se mantiene al final"` / `"Projected ranking if the live score holds at full-time"`
- `pools.ranking.liveProjection.*` similares o reusar `rankings.*`.

## 4. Contratos / cambios de código

| Archivo | Cambio |
|---|---|
| `src/features/scoring-rankings/services/project-leaderboard.ts` | **NEW** — `projectLeaderboard` + `projectPoolLeaderboardFromLoaded` (puros), tipos `LiveMatchForProjection` / `LivePredictionForProjection` / `ProjectedLeaderboardRow`. |
| `src/features/scoring-rankings/types.ts` | `export interface ProjectedLeaderboardRow extends LeaderboardRow { livePoints: number; projectedPoints: number; previousPosition: number | null; projectedPosition: number; positionDelta: number | null; }` (puede vivir en `project-leaderboard.ts` en su lugar para cohesión — **decisión final**: en `project-leaderboard.ts` para cohesión, `types.ts` se mantiene solo con `LeaderboardRow`). |
| `src/features/scoring-rankings/queries.ts` | **NEW** `getGlobalRankingProjection(viewerId)` y `getPoolLeaderboardProjection(poolId, viewerId)` (no cached, sobre cache confirmado + query LIVE ligera). |
| `src/features/scoring-rankings/components/pool-leaderboard.tsx` | Añade props `projected?` / `hasLive?`; modo proyección (re-ordenar por proyectado, `pts actual → proy.` + `▲▼=` + badge). |
| `src/features/scoring-rankings/components/leaderboard-live-refresh.tsx` | **NEW** — wrapper client (monta `useLiveResults()` + render `children`). Reusado por las 3 routes. |
| `src/app/(app)/rankings/page.tsx` | Usa `getGlobalRankingProjection`; envuelve `<PoolLeaderboard>` en `<LeaderboardLiveRefresh>`. |
| `src/app/(app)/pools/[id]/page.tsx` | Calcula `liveMatches` de `predictionsData.matches`; usa `projectPoolLeaderboardFromLoaded`; tab Clasificación con wrapper `LeaderboardLiveRefresh`. **Sin tocar** tab Predicciones (`PoolPredictionsView` lleva su propio `useLiveResults`). |
| `src/app/(app)/pools/[id]/leaderboard/page.tsx` | Usa `getPoolLeaderboardProjection`; wrapper `LeaderboardLiveRefresh`. |
| `src/i18n/dictionaries/{es,en}.ts` | Keys `rankings.liveProjection.*` (badge/currentPts/projectedPts/rise/fall/same/newEntry/disclaimer). |
| `src/features/scoring-rankings/services/__tests__/project-leaderboard.test.ts` | **NEW** — proyección pura: sin LIVE (identidad), 1 LIVE no-predicho (igual), 1 LIVE predicho (livePoints + reorder), 2 LIVE, override ?? global, preJoin (skip), sintetiza row nueva, delta `▲▼=`, isKnockout bonus no aplicado, densa position. |
| `src/features/scoring-rankings/__tests__/pool-leaderboard.test.tsx` | **NEW/ajuste** — renderiza modo proyección (credenciales, posición proyectada, badge, sin modo proyección cuando `hasLive=false`). |

## 5. Security Baseline Compliance

| Regla | Estado | Razón |
|---|---|---|
| SECURITY-01 (input) | COMPLIANT | Sin nueva superficie de input; la proyección solo consume datos del server (queries existentes + query LIVE filtrada por miembros/`verificationStatus`/`deletedAt`). |
| SECURITY-08 (autorización) | COMPLIANT | Reusa el gate de membresía de `getPoolLeaderboard` (`poolId_userId`, `queries.ts:149-152`) y el gate global de `getCurrentUserId`. Sin nuevos endpoints/actions. |
| SECURITY-13 (confidencialidad) | COMPLIANT | Anti-sesgo intacto: ¡Durante LIVE el match **ya started** ⇒ predicciones visibles según BR-41.2! La proyección **no expone** predicciones futuras de otros (sólo proyecta sobre matches LIVE, todos `started`). Unmatch futuro no se proyecta (no está en `liveMatches`). En pool, el resolve override ?? global sólo pasa a `computeScore` el marcador-actual + su predicción (que ya es visible según BR-41.2); no filtra info oculta. |
| Realtime (Unit 58) | COMPLIANT | `useLiveResults()` reusado sin cambios (señal `{at}`, sin datos/PII). |
| Secrets | COMPLIANT | Sin secretos nuevos; reusa `NEXT_PUBLIC_SUPABASE_*` existentes. |
| Perf | COMPLIANT | Proyección cálculo puro O(rows × liveMatches) generalmente <50 ops; queries LIVE filtradas por `status="LIVE"` indexadas (`@@index([status])`, `schema.prisma:286`); predictions `where matchId IN liveMatchIds AND (poolId condiciones)` indexed por FK. No invalida cache confirmado. |

## 6. Verificación

| Check | Método |
|---|---|
| Tipos / lint | `tsc --noEmit` 0, Biome limpio (archivos tocados), ESLint 0. |
| Unit tests | `project-leaderboard.test.ts` (≥10 casos), `pool-leaderboard.test.tsx` (modo proyección), Vitest suite completa. |
| Build | `pnpm build` OK. |
| Manual | `/rankings` con un LIVE → Ranking con `<pts> → <proy.>` y `▲/▼/=`. Forzar LIVE → FINISHED en `/admin` → desaparece el modo proyección (sin cambios de posicion). `/pools/[id]` y `/pools/[id]/leaderboard` igual. Sin LIVE → como hoy. Knockout con marcador LIVE empatado → sin bonus penales en proyección (bonus aparece al FINISHED). Miembro `preJoin` en un LIVE → no proyectado en pool. |

## 7. Out of Scope

- Sub-escenarios de marcador ("qué pasaría si +1") (FR-REFINE-62 desestimado).
- Proyección en la grilla de Predicciones del pool (sólo aparece el total "—" en LIVE, BR-41.5/BR-61.5 intactas).
- Implementar Unit 61 (banner live-now) — queda pendiente; Unit 62 no la toca.
- Persistir `PredictionScore` para LIVE (no ocurre — el motor scoring exige FINISHED).
- Refactor de `/pools/[id]` para extraer `PoolDetailTabs` (eso era Unit 61) — Unit 62 añade `LeaderboardLiveRefresh` sólo alrededor de la sección Clasificación.
- Penalty bonus durante LIVE (BR-62.3 — no se puede sin `winnerTeamId`).
- Notificación push al entrar/modificar la proyección — fuera de alcance.