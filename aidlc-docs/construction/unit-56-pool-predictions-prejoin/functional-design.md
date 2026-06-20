# Functional Design — Unit 56: Grilla de predicciones del pool acotada a la fecha de ingreso

> Refine post-construcción (2026-06-20) vía `/aidlc:refine`. **Plan presentado y aprobado
> antes de ejecutar.** Continuación de **Unit 55** (leaderboard acotado a la membresía): este
> cambio alinea la **pestaña "Predicciones"** con ese leaderboard. Refine sobre Unit 41
> (predicciones visibles en el pool) y Unit 48 (override por pool); hermano de Unit 53
> (celdas ocultas). **No reinicia** etapas aprobadas (Units 1–55).

## Traceability

| ID | Source | Description |
|----|--------|-------------|
| FR-REFINE-56.1 | requirements | Las celdas de partidos previos al ingreso del miembro se muestran vacías |
| US-56.1 | stories | Ver la grilla del pool coherente con el ranking del pool |
| BR-55.1 | unit-55 | El leaderboard del pool ya solo cuenta partidos con `kickoffAt ≥ joinedAt` |

## 1. Intención del usuario

Tras Unit 55, el **leaderboard** del pool dejó de contar los partidos previos al ingreso de
cada miembro. Pero la grilla ("Predicciones") seguía mostrando, para un miembro que se unió
tarde, su predicción global **heredada** con su **badge de puntos** en partidos anteriores a
su ingreso — puntos que ya **no** suman en el leaderboard. La grilla "prometía" puntos que el
ranking no contaba.

**Objetivo**: las celdas `(miembro, partido)` con `partido.kickoffAt < miembro.joinedAt` se
muestran **vacías** (sin marcador ni puntos), con un **ícono distinto al candado de Unit 53**.

**Decisiones del usuario** (vía `/aidlc:refine`):
- Celda pre-ingreso = **ícono distinto** al candado de Unit 53 (implementado: `CalendarOff`).
- Aplica **a todos por igual, incluido el viewer** (sus propias celdas pre-ingreso también vacías).
- Las **columnas/días pre-ingreso siguen apareciendo**; solo se vacían las celdas del miembro
  que aún no era parte de la liga.

## 2. Business Rules

| ID | Regla | Trazabilidad |
|---|---|---|
| **BR-56.1** | En la grilla del pool, una celda `(miembro, partido)` con `partido.kickoffAt < miembro.joinedAt` se considera **pre-ingreso** y se muestra **vacía**: sin marcador previsto, sin badge de puntos, sin badge "Ajustada". | FR-REFINE-56.1 |
| **BR-56.2** | La celda pre-ingreso muestra un ícono distinto al candado de Unit 53 (`CalendarOff`) + el texto `pools.predictions.notInPoolYet` ("Aún no estaba en la liga" / "Not in the pool yet"). | FR-REFINE-56.1 |
| **BR-56.3** | El enmascarado pre-ingreso aplica a **todos los miembros por igual, incluido el viewer**. | FR-REFINE-56.1 |
| **BR-56.4** | Las **columnas y los días** se conservan tal cual (otros miembros pueden tener datos en ese partido). Solo se vacían las celdas de los miembros pre-ingreso. | FR-REFINE-56.1 |
| **BR-56.5** | `preJoin` y `hidden` (Unit 53) son **mutuamente excluyentes**: `hidden` exige partido **no** iniciado (futuro de otro miembro); `preJoin` exige partido **ya** iniciado antes del ingreso (`kickoff < joinedAt ≤ now`). Si por defensa ambos coincidieran, `preJoin` tiene precedencia en el render. | FR-REFINE-56.1 |
| **BR-56.6** | Un partido con `kickoffAt = null` (knockout TBD) **nunca** es pre-ingreso (no ha iniciado). | FR-REFINE-56.1 |
| **BR-56.7** | El cálculo es **en la capa de vista** (`buildDayGroups`), usando `member.joinedAt` (de `PoolMemberSummary`) y `match.kickoffAt` (de `MatchView`), ambos ya disponibles. Un partido pre-ingreso es pasado y ya visible para cualquier miembro tras el kickoff (Unit 41/53), así que **no** hay riesgo de anti-sesgo ni confidencialidad y **no** se requiere enmascarado server-side (a diferencia de Unit 53). | FR-REFINE-56.1 |

## 3. Business Logic Model

### BL-56.1: `buildDayGroups` con celdas pre-ingreso

> Extiende el helper de Unit 41/48/53. Único delta: el guard de pre-ingreso por celda.

```
for member m in members:
  for col in day.matches:
    preJoin = col.kickoffAt != null
              AND m.joinedAt != null
              AND parse(col.kickoffAt) < parse(m.joinedAt)        // BR-56.1, BR-56.6
    if preJoin:
      cell = { predictedHome:null, predictedAway:null, totalPoints:null,
               isOverride:false, hasGlobal:false, hidden:false, preJoin:true }
      continue
    # ... resolución override/global existente (Unit 48) + hidden (Unit 53), preJoin:false
```

El componente `PoolPredictionsView` (`MatchCard`) añade una rama de render: si `cell.preJoin`
→ `<CalendarOff/> + t.notInPoolYet` (antes del bloque `hidden`/normal, BR-56.5). `canEdit` ya
es `false` para partidos pre-ingreso (son pasados; exige `SCHEDULED` + kickoff futuro), así que
no hay conflicto con la edición.

## 4. Contratos / cambios de código

| Archivo | Cambio |
|---|---|
| `src/features/pools/components/pool-predictions-view-helpers.ts` | `MemberPredictionRow.cells` añade `preJoin: boolean`; `buildDayGroups` computa `preJoin` por celda y la vacía cuando aplica. |
| `src/features/pools/components/pool-predictions-view.tsx` | Import `CalendarOff`; `isPreJoin` por celda; rama de render con ícono + `t.notInPoolYet`. |
| `src/i18n/dictionaries/{es,en}.ts` | Nueva key `pools.predictions.notInPoolYet`. |
| `src/features/pools/components/__tests__/pool-predictions-view.test.tsx` | +4 casos de pre-ingreso (vacía pre-ingreso; conserva post-ingreso; columna presente con mezcla; kickoff null no es pre-ingreso). |

### Sin cambios
- `getPoolMemberPredictions` y `pools/[id]/page.tsx` (la página ya pasa `members` con `joinedAt`
  y `matches` con `kickoffAt`).
- `PoolMemberPrediction` (DTO de la query) — `preJoin` es un estado de celda en la vista.
- El leaderboard del pool (Unit 55) y el ranking global.

### Fuera de alcance
- Enmascarado server-side del contenido heredado (innecesario: dato pasado, no anti-sesgo, BR-56.7).
- Distinguir "no participaba" de "participaba pero no predijo" más allá de la celda vacía.

## 5. Security Baseline Compliance

| Regla | Estado | Razón |
|---|---|---|
| SECURITY-13 | **COMPLIANT** | No introduce fuga: las predicciones pre-ingreso son de partidos pasados, ya visibles para los miembros tras el kickoff (Unit 41/53). |
| Resto | N/A | Cambio de presentación; sin nueva superficie de input, schema, migraciones, rutas ni server actions. |

## 6. Verificación

- `pnpm exec tsc --noEmit` → 0 errores.
- Biome / ESLint limpios en los archivos tocados (el warning de `<img>` en `TeamFlag` es preexistente).
- `pnpm exec vitest run src/features/pools/components/__tests__/pool-predictions-view.test.tsx` → verde.
- `pnpm exec vitest run` → suite completa verde.
- `pnpm build` → OK.
- Manual: en un pool unido a mitad de torneo, las celdas de un miembro recién unido para
  partidos previos a su ingreso salen vacías con `CalendarOff` + "Aún no estaba en la liga"
  (igual para el viewer); las columnas de esos días siguen apareciendo y los miembros que sí
  estaban muestran sus datos; los puntos visibles cuadran con el total del leaderboard (Unit 55).
