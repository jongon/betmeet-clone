# Reverse Engineering (focalizado) — ¿Predicción global o por pool?

> Stage: INCEPTION — Reverse Engineering (modo brownfield, ejecución **focalizada**).
> Pregunta del usuario: *"Yo sé que puedo hacer una predicción global, pero ¿puedo hacer
> una predicción en un pool específico, es así?"*
>
> **Nota de alcance**: este repositorio ya está **forward-documentado** por AI-DLC
> (Units 1–23 con requirements, user-stories, application-design y diseños por unit). Un
> reverse-engineering completo (arquitectura/inventario/APIs/diagramas/stack/deps) sería
> en su mayoría **redundante** con esos artefactos. Por eso se ejecuta una pasada
> **focalizada** sobre la relación Predicciones ↔ Pools, anclada a `archivo:línea`.

## Respuesta corta

**No. Las predicciones son GLOBALES por usuario, no por pool.** Haces **una sola**
predicción por partido, y esa misma predicción cuenta en **todos** los pools/ligas a los
que pertenezcas. Un pool **no** tiene predicciones propias: es solo un **ranking
(leaderboard)** que filtra a un subconjunto de usuarios (sus miembros) usando los **mismos
puntos globales**.

## Evidencia en el modelo de datos (`prisma/schema.prisma`)

- **`model Prediction`**: clave única **`@@unique([userId, matchId])`** y **sin** ningún
  campo `poolId`. ⇒ Un usuario tiene exactamente **1 predicción por partido**; el modelo
  no puede almacenar predicciones distintas por pool.
- **`model PredictionScore`**: ligado a `predictionId` / `userId` / `matchId`, **sin**
  `poolId`. ⇒ El puntaje también es global por usuario y partido.
- **`model Pool` / `model PoolMembership`**: el pool agrupa **usuarios** (vía
  `PoolMembership`), no predicciones. No hay relación `Pool → Prediction`.

## Evidencia en la lógica de ranking (`src/features/scoring-rankings/queries.ts`)

- `getPoolLeaderboard(poolId, viewerId)` (líneas ~83–109): toma los **miembros** del pool
  (`poolMembership.findMany({ where: { poolId } })`) y calcula sus totales con
  `userTotals(members.map(m => m.userId))`.
- `userTotals` (líneas ~11–16) hace
  `prisma.predictionScore.groupBy({ by: ["userId"], where: { userId: { in: userIds } } })`
  — **sin filtro por pool**. ⇒ El total de un miembro **dentro de un pool** es su **total
  global** de puntos; el pool solo decide **quiénes** aparecen y, por tanto, tu **posición
  relativa**, no tus puntos.
- `getGlobalRanking` (líneas ~73–77) usa el mismo `groupBy` global sobre **toda** la tabla
  `PredictionScore`. Es la misma materia prima que el leaderboard de pool, sin acotar a
  miembros.

## Confirmación en los artefactos AI-DLC

- **US-3.1 / US-3.2** (`stories.md`): la predicción se define **por partido** ("tu
  pronóstico... en un partido"), modificable hasta el kickoff; no se menciona variación por
  pool.
- **US-5.2 Ranking por Pool**: el pool es un **ranking**, coherente con "mismos puntos,
  distinto conjunto de competidores".

## Modelo mental resultante

```
Usuario ── hace ──► 1 Predicción por Partido  ── genera ──►  PredictionScore (puntos globales)
                                                                   │
                                  ┌────────────────────────────────┼────────────────────────────────┐
                                  ▼                                 ▼                                 ▼
                         Ranking GLOBAL                     Leaderboard Pool A                Leaderboard Pool B
                    (todos los usuarios)              (miembros de A, MISMOS puntos)     (miembros de B, MISMOS puntos)
```

Tu puntaje es idéntico en cada pool en el que estés (= tu puntaje global); lo único que
cambia entre pools es **contra quién** compites y tu **posición** en esa tabla.

## Implicación (no es un bug, es el diseño)

Si lo que buscas es poder **predecir distinto en cada pool** (p. ej. una estrategia por
liga), eso **no** existe hoy y requeriría un **cambio de modelo de negocio + schema**
(añadir `poolId` a `Prediction`, predicciones por (usuario, partido, pool), y recomputar
scoring/ranking por pool). Sería un refine de alcance considerable. Este análisis **no**
implementa nada; queda a la espera de tu decisión.
