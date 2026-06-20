# Functional Design — Unit 53: Ocultar predicciones futuras de otros miembros (anti-sesgo)

> Refine post-construcción sobre **Unit 41** (Predicciones visibles dentro del pool) y **Unit 48** (Predicciones con override + paginación de futuros). **No reinicia** etapas aprobadas (Units 1–52 intactas).

## Traceability

| ID | Source | Description |
|----|--------|-------------|
| FR-REFINE-53.1 | requirements | En la pestaña "Predicciones" del pool, las predicciones de **otros** miembros solo son visibles para partidos que ya **empezaron o terminaron** (`kickoffAt <= now`). Las de partidos futuros permanecen ocultas (anti-sesgo). |
| US-53.1 | stories | No ver las predicciones futuras de otros miembros para no sesgar las mías |

## 1. Contexto y causa raíz

**Unit 41 (BR-41.2)** estableció la ventana de visibilidad: una predicción es visible para los pares del pool **iff** `match.kickoffAt <= now()`. Las predicciones de partidos no iniciados permanecían privadas, **precisamente para no sesgar** las predicciones de los demás (FR-REFINE-41.1).

**Unit 48 (FR-REFINE-48.9 / BR-48.16)** añadió paginación día-a-día en la pestaña y, para permitir que el viewer navegue a días futuros y **edite sus propios overrides de pool**, **eliminó el filtro `kickoffAt <= now`** de `getPoolMemberPredictions` (la query pasó a cargar todos los matches y todas las predicciones). Efecto colateral: al quitar el filtro **para todos**, las predicciones futuras de **otros** miembros quedaron expuestas en la página → regresión de la garantía anti-sesgo de Unit 41.

**Unit 53** restaura la garantía anti-sesgo **acotada a los demás miembros**: el viewer sigue viendo y editando sus propias predicciones futuras (lo necesita para los overrides de pool de Unit 48), pero las predicciones futuras de los demás vuelven a estar ocultas hasta el kickoff.

## 2. Business Rules

### BR-53.1 — Ventana de visibilidad por miembro (anti-sesgo)
En la pestaña "Predicciones" de `/pools/[id]`, para cada fila `(miembro, partido)`:
- Si `miembro === viewer`: la predicción del viewer **siempre** es visible (incluye partidos futuros — necesario para que el viewer vea/edite su override de pool, BR-48.6).
- Si `miembro !== viewer`: la predicción es visible **iff** el partido ya empezó (`match.kickoffAt != null && kickoffAt <= now()`). Para partidos no iniciados (`kickoffAt > now` o `kickoffAt = null`, p. ej. KO con equipos TBD) la predicción del otro miembro permanece **oculta**.

Coincide con la ventana original de **BR-41.2** (`kickoffAt <= now`), ahora aplicada solo a los demás. **Reemplaza** la eliminación incondicional del filtro hecha por BR-48.16.

### BR-53.2 — Enforcement server-side (el contenido nunca llega al cliente)
El enmascarado se aplica en la **query** `getPoolMemberPredictions`, no solo en el render. Para una fila oculta (`miembro !== viewer` y partido no iniciado), los campos `predictedHome`, `predictedAway`, `totalPoints`, `matchedCase` se devuelven en `null`, `isOverride`/`hasGlobal` en `false`, y se marca `hidden: true`. Así el marcador predicho del otro miembro **no se serializa** en el payload de la página (no basta con ocultar en CSS/JS: sería leíble en el HTML/RSC). Es la defensa correcta para una garantía de equidad.

### BR-53.3 — Indicador visual de celda oculta
Una celda con `hidden: true` se renderiza con un icono de candado (`lucide` `Lock`) + etiqueta `pools.predictions.hiddenUntilKickoff` ("Oculta hasta el inicio" / "Hidden until kickoff"), en vez del marcador. No se muestran badges de override ni de puntos para esa celda. Comunica "esta predicción existe pero está oculta hasta que empiece el partido", alineado con la intención anti-sesgo.

### BR-53.4 — Sin cambios de scoring, leaderboard, ranking ni schema
El enmascarado es **solo de lectura en la vista de predicciones del pool**. No afecta `scoreMatch`, `getPoolLeaderboard`, `getGlobalRankingRows`, `/matches`, ni ninguna otra superficie. El leaderboard del pool sigue calculándose con todos los scores disponibles (los partidos no iniciados no tienen score de todas formas). Sin schema, migraciones, rutas ni cambios en server actions.

## 3. Cambio de implementación

### 3.1 `getPoolMemberPredictions` (`src/features/pools/queries.ts`)
Al mapear cada fila de `Prediction` a `PoolMemberPrediction`:

```ts
const now = Date.now();
// ...
const started = row.match.kickoffAt != null && row.match.kickoffAt.getTime() <= now;
const hidden = row.userId !== userId && !started;  // userId = viewer (getCurrentUserId)

return {
  // ...campos del match (label, flags, status) sin cambios — la columna del partido sí se muestra
  predictedHome: hidden ? null : row.homeScore,
  predictedAway: hidden ? null : row.awayScore,
  totalPoints: hidden ? null : (row.score?.totalPoints ?? null),
  matchedCase: hidden ? null : (row.score?.matchedCase ?? null),
  isOverride: hidden ? false : row.poolId === poolId,
  hasGlobal: !hidden && row.poolId === poolId && globalPairs.has(`${row.userId}::${row.matchId}`),
  hidden,
};
```

La query sigue cargando todos los matches (las columnas de partidos futuros se siguen mostrando, para que el viewer navegue y edite su propio override). Solo se enmascara el **contenido** de las predicciones ajenas no iniciadas.

### 3.2 Tipos
- `PoolMemberPrediction` (`src/features/pools/types.ts`): nuevo campo `hidden: boolean`.
- `MemberPredictionRow.cells[*]` (`pool-predictions-view-helpers.ts`): nuevo campo `hidden: boolean`, propagado desde la predicción elegida (`chosen?.hidden ?? false`).

### 3.3 Componente (`pool-predictions-view.tsx`)
En la celda de `MatchCard`: `const isHidden = cell?.hidden ?? false`. Si `isHidden`, renderiza el candado + `t.hiddenUntilKickoff` en lugar del marcador/badges. El bloque `canEdit` no se ve afectado (es viewer-only y el viewer nunca está oculto).

### 3.4 i18n
Nueva clave `pools.predictions.hiddenUntilKickoff` en `es.ts` ("Oculta hasta el inicio") y `en.ts` ("Hidden until kickoff").

## 4. Archivos

| Archivo | Cambio |
|---|---|
| `src/features/pools/queries.ts` | enmascarado server-side por `hidden` |
| `src/features/pools/types.ts` | `PoolMemberPrediction.hidden` |
| `src/features/pools/components/pool-predictions-view-helpers.ts` | `hidden` en el tipo de celda + propagación en `buildDayGroups` |
| `src/features/pools/components/pool-predictions-view.tsx` | render de candado + `Lock` import |
| `src/i18n/dictionaries/es.ts`, `en.ts` | `hiddenUntilKickoff` |
| `src/features/pools/__tests__/pool-predictions.test.ts` | +2 tests (enmascara a otro miembro en futuro; revela tras kickoff) |
| `src/features/pools/components/__tests__/pool-predictions-view.test.tsx` | `hidden: false` en la factory |

## 5. Security Baseline Compliance

| Regla | Estado | Razón |
|---|---|---|
| SECURITY-08 (gates/IDOR) | **COMPLIANT** | El membership gate de Unit 41 se conserva; el enmascarado refuerza la confidencialidad (no expone predicciones ajenas no iniciadas). |
| SECURITY-13 (fugas de datos) | **COMPLIANT** | El contenido enmascarado **no se serializa** al cliente (enforcement server-side, BR-53.2). |
| Otros | N/A | Feature de lectura, sin nueva superficie de input, schema, migraciones ni rutas. |

## 6. Verification Plan

| Check | Método |
|---|---|
| TypeScript | `pnpm exec tsc --noEmit` → 0 |
| Biome / ESLint | limpios en archivos tocados |
| Vitest | +2 tests de query (enmascarado / revelado tras kickoff); suite completa verde |
| Regresión | el viewer ve sus propias predicciones futuras; partidos pasados/LIVE de otros se revelan; paginación intacta |

## 7. Out of Scope

- Revelar la **existencia** (sin contenido) de la predicción de otro miembro en partido futuro: hoy el candado se muestra para cualquier fila enmascarada del otro miembro; no se distingue "predijo pero oculto" de "no predijo aún". No es necesario para la garantía anti-sesgo.
- Cambios en `/matches` (siempre global, sin pares).
- Cambios en leaderboard, ranking global o scoring.
