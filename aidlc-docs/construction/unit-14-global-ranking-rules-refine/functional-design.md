# Unit 14 — Ranking Global y Reglas con Penales · Functional Design

> Refine post-construcción. Refina Unit 6 (scoring/ranking) y la calculadora
> educativa (Unit 2/Unit 11). **No reinicia** Units aprobadas.
> Cubre FR-REFINE-14.1 … 14.5 y la Épica 13 (US-13.1 … US-13.3). Español (AGENTS.md).

## 1. Estado del código existente

- Motor de scoring (`compute-score.ts`) **ya** aplica el bonus de penales **solo**
  cuando `isKnockout && actualHome === actualAway && predictedWinner === actualWinner`
  → **FR-REFINE-14.5 ya garantizado en el engine**.
- La calculadora (`scoring-calculator.tsx`) **ya** muestra el selector de ganador de
  penales solo con empate + knockout (`showPenalty`). Falta el **marcador de tanda**.
- Ranking por pool reutilizable: `getPoolLeaderboard`, `assignDensePositions`
  (dense "1,1,2"), tipo `LeaderboardRow`, componente `PoolLeaderboard`,
  `userTotals` (suma global de puntos por usuario, ya existe).
- **No existe** ranking global ni ruta `/rankings`.

## 2. Decisiones de diseño

### Ranking global (14.1 / 14.2 / 14.3)
- **Query nueva** `getGlobalRanking(viewerId)` en `scoring-rankings/queries.ts`:
  1. `predictionScore.groupBy(userId, _sum.totalPoints)` → usuarios con **≥1
     predicción puntuada** (FR-REFINE-14.1).
  2. Cargar `profile` de esos `userId` con `verificationStatus != UNVERIFIED` y
     `deletedAt = null` → solo **usuarios verificados**.
  3. Mapear a `LeaderboardRow` (posición, nickname, avatar, puntos; `isViewer`).
  4. **Orden y desempate determinístico (FR-REFINE-14.3)**: orden primario por
     `totalPoints` desc; **desempate por `nickname` ascendente** (estable y
     determinístico). Posiciones con `assignDensePositions` (empatados comparten
     posición; el orden de visualización dentro del empate es por nickname).
- **Ruta** `src/app/(app)/rankings/page.tsx` (grupo `(app)`, gateada por proxy).
  Reutiliza el componente `PoolLeaderboard` (acepta `LeaderboardRow[]`).
- **Navegación** (FR-REFINE-14.2): añadir enlace "Ranking" a `PrimaryNav`
  (Unit 11) → `/rankings`, con `aria-current`. Clave i18n `nav.rankings`.
- **Seguridad (FR-REFINE-14.3)**: la query solo selecciona nickname, avatar y
  puntos totales. **No** expone emails, pools privados ni predicciones
  individuales no públicas.

### Calculadora con marcador de penales (14.4 / 14.5)
- En `scoring-calculator.tsx`, cuando `showPenalty` (knockout + empate en 90'),
  añadir **dos inputs de marcador de tanda** (penales casa / visita, p. ej. 4-3)
  además del ganador.
- El **ganador se deriva** del marcador: `penHome > penAway → home`;
  `penHome < penAway → away`; iguales → sin ganador (la tanda no puede empatar; se
  pide corregir). El selector de ganador refleja/queda en sync con el marcador.
- El bonus sigue siendo fijo (+1) vía `computeScore` (sin cambiar el engine); el
  marcador es UX/educativo. **14.5**: los inputs de penales **solo** se habilitan
  con empate en 90' (ya implementado por `showPenalty`).

## 3. Contratos (nuevos / modificados)

| Símbolo | Tipo | Cambio |
|---------|------|--------|
| `getGlobalRanking(viewerId)` | nueva | Ranking global → `LeaderboardRow[]` |
| `src/app/(app)/rankings/page.tsx` | nueva | Página de ranking global |
| `PrimaryNav` | mod | Enlace "Ranking" → `/rankings` |
| `ScoringCalculator` | mod | Inputs de marcador de penales + ganador derivado |
| i18n `nav.rankings`, `calculator.penaltyScore*` | nuevas | Copy ES |

## 4. Estados y accesibilidad
- `/rankings`: estado vacío ("aún no hay puntuaciones") cuando no hay filas;
  resaltado de la fila del viewer (reusa `isViewer` de `PoolLeaderboard`).
- Inputs de penales con labels; el ganador derivado se anuncia.

## 5. Schema / Infra
- **Sin cambios de schema** (se reusa `PredictionScore`). Sin infra nueva.

## 6. Plan de archivos (para Code Generation)
- `src/features/scoring-rankings/queries.ts` (mod: `getGlobalRanking`)
- `src/app/(app)/rankings/page.tsx` (nueva)
- `src/components/layout/primary-nav.tsx` (mod: enlace Ranking)
- `src/features/education/components/scoring-calculator.tsx` (mod: marcador penales)
- i18n: `nav.rankings`, claves de marcador de penales en `es.ts`
- Tests: `getGlobalRanking` (filtra verificados/≥1 score, orden + desempate por
  nickname, no expone datos privados), derivación de ganador desde marcador.

## 7. Verificación (criterios de "hecho")
- `tsc` 0, Biome/ESLint limpios, Vitest verde, `next build` OK.
- `/rankings` lista usuarios verificados con ≥1 score, posición/nickname/avatar/
  puntos, desempate determinístico; enlazado desde el header.
- La calculadora acepta marcador de penales y deriva el ganador; penales solo con
  empate en 90'.
- Units 1-13 intactas; el engine de scoring (`compute-score.ts`) no cambia.
