# Unit 6: Scoring and Pool Rankings — Frontend Components

> Leaderboard por pool (US-5.2) + integración del desglose de puntos en la vista de predicciones de Unit 5 (Q6=A). Sobre los patrones de Units 1–5 (App Router, Server Components, shadcn/base-ui, i18n tipado).

---

## Mapa de rutas

| Ruta | Acceso | Componente | Estado |
|---|---|---|---|
| `/pools/[id]` | Miembro del pool | `PoolDetailPage` (Unit 3) | **Modificado**: añade sección/pestaña **Leaderboard** |
| `/pools/[id]/leaderboard` | Miembro del pool | `PoolLeaderboardPage` | Nuevo (vista completa) |
| `/matches` (vista de predicciones) | Autenticado | Vistas de Unit 5 | **Modificado**: muestra puntos + desglose cuando `SCORED` |

---

## 1. PoolLeaderboard (componente principal)

**Tipo**: Server Component; recibe `LeaderboardRow[]` de `getPoolLeaderboard(poolId, viewerId)` (BL-5).

```
PoolLeaderboard
├── LeaderboardHeader     (nombre del pool, nº de miembros)
└── LeaderboardTable
    └── LeaderboardRow[]   (posición · avatar · nickname · puntos)
```

### LeaderboardRow
| Prop | Tipo | Descripción |
|---|---|---|
| `position` | number | Dense ranking "1,1,2" (BR-6.13) |
| `nickname` | string | Identidad (Unit 1) |
| `avatarUrl` | string | Avatar (Unit 1) |
| `totalPoints` | number | Total global (BR-6.11) |
| `isViewer` | boolean | Resalta la fila del usuario actual (BR-6.15) |
| `isTied` | boolean | Indicador visual de empate |

- Empatados muestran la **misma** posición; estilo de "empate" cuando `isTied`.
- `data-testid="leaderboard-row-{userId}"`, `leaderboard-position-{userId}`.
- Estado vacío: si nadie tiene puntos aún, muestra a todos con 0 (no se oculta el leaderboard).

---

## 2. PoolLeaderboardPage (`/pools/[id]/leaderboard`)

**Tipo**: Server Component. Autoriza miembro (BR-6.16); 404/redirect si no lo es. Renderiza `PoolLeaderboard` a pantalla completa con enlace de vuelta al detalle del pool.

---

## 3. Integración en PoolDetailPage (modifica Unit 3)

- Se añade una **pestaña/sección "Tabla de posiciones"** dentro de `/pools/[id]` que monta `PoolLeaderboard` (vista compacta: top N + "ver completa").
- No se duplica la lógica: ambas vistas consumen `getPoolLeaderboard`.

---

## 4. Integración del desglose en la vista de predicciones (modifica Unit 5)

La vista "predicción vs resultado" de Unit 5 (`PredictionVsResult`) muestra, cuando `pointsStatus === "SCORED"`:
- Los **puntos** obtenidos en ese partido.
- El **desglose** reutilizando **`ScoreBreakdownExplainer`** (Unit 2), construido desde el `breakdown` que Unit 6 añade al read model (BL-7).

| Estado | UI |
|---|---|
| `SCORED` | puntos + `ScoreBreakdownExplainer(breakdown)` |
| `PENDING_SCORING` | "Pendiente de cálculo" |
| `NOT_SCORED` | sin puntos (partido no jugado o sin predicción) |

- `data-testid="prediction-points-{matchId}"`.
- Requiere extender `PredictionMatchView` (Unit 5) con `breakdown?: ScoreBreakdown` y conectar la resolución `resolvePoints` (BL-7) en `getFixtureWithMyPredictions`.

---

## Lógica de servidor (contratos)

| Función | Tipo | Regla |
|---|---|---|
| `getPoolLeaderboard(poolId, viewerId)` | query (lectura) | BL-5, BR-6.16 |
| `scoreMatch(matchId)` | servidor (no cliente) | BL-2, BR-6.17 |
| `scoreFinishedUnscoredMatches()` | servidor (cron/sync) | BL-3 |
| `resolvePoints(...)` (en read model Unit 5) | lectura | BL-7, BR-6.9 |

## Archivos nuevos/modificados (orientativo para code generation)

**Nuevos**:
```
src/features/scoring-rankings/services/score-match.ts        (BL-1, BL-2)
src/features/scoring-rankings/services/score-sweeper.ts      (BL-3)
src/features/scoring-rankings/queries.ts                     (getPoolLeaderboard, userTotals)
src/features/scoring-rankings/services/ranking.ts            (BL-6 dense ranking)
src/features/scoring-rankings/types.ts                       (LeaderboardRow)
src/features/scoring-rankings/components/pool-leaderboard.tsx (+ leaderboard-row)
src/app/pools/[id]/leaderboard/page.tsx
src/features/scoring-rankings/__tests__/*                    (score-match, ranking, leaderboard)
prisma/schema.prisma                                         (model PredictionScore)
supabase/migrations/20260610000010_create_prediction_scores.sql  (RLS)
```
**Modificados**:
```
src/features/predictions/types.ts      (+ breakdown en PredictionMatchView)
src/features/predictions/queries.ts    (resolvePoints en getFixtureWithMyPredictions — quita el stub)
src/features/pools/components/...       (sección Leaderboard en el detalle del pool)
```

> Nota: el nombre del módulo (`scoring-rankings`) evita colisión con `src/features/scoring` (el motor compartido de Unit 2, que NO se toca).
