# Functional Design — Unit 75: Goles del partido vs goles de la tanda de penales

> Refine post-construcción (2026-06-30) sobre Unit 25 (sync football-data), Unit 28 (persistencia de matches), Unit 41 (predicciones del pool), Unit 71 (marcador en línea) y la infraestructura de penales de Unit 36. **No reinicia** etapas aprobadas (Units 1–72 intactas). Bug en vivo de la fase eliminatoria: cuando un partido empata en los 120 minutos y se define por **tanda de penales**, el resultado de la tanda se mostraba **como marcador final del partido**. Partido de referencia: **Alemania vs Paraguay**. **Refinamiento 2026-06-30 (ver §1bis):** el campo `score.penalties` del proveedor puede venir corrupto (empate imposible + `winner: null`); la tanda se deriva de `fullTime` (invariante documentada de football-data) y el partido de referencia se fijó con override congelado.

## Traceability

| ID | Source | Description |
|----|--------|-------------|
| FR-REFINE-75.1 | requirements | El sync separa el resultado del partido (juego corrido) de la tanda de penales; persiste `home_penalty_score`/`away_penalty_score` y deriva `winner_team_id`. Causa raíz en football-data |
| FR-REFINE-75.2 | requirements | `/matches` muestra el marcador del partido y, diferenciada, la tanda de penales (apilada, width-safe) |
| FR-REFINE-75.3 | requirements | Los resultados del pool muestran la tanda diferenciada sin romper la grilla en mobile |

## 1. Contexto y diagnóstico (causa raíz)

En la fase eliminatoria, football-data.org devuelve, para un partido definido por penales,
`score.duration = "PENALTY_SHOOTOUT"` con esta forma (datos reales de **Alemania vs Paraguay**,
LAST_32):

```json
"score": {
  "winner": null, "duration": "PENALTY_SHOOTOUT",
  "fullTime":    { "home": 5, "away": 6 },   // ← penales INCRUSTADOS (lo que se mostraba)
  "halfTime":    { "home": 0, "away": 1 },
  "regularTime": { "home": 1, "away": 1 },   // ← resultado real del partido
  "extraTime":   { "home": 0, "away": 0 },
  "penalties":   { "home": 4, "away": 5 }
}
```

El provider `FootballDataProvider` mapeaba `homeScore/awayScore = score.fullTime`, de modo que el
marcador mostrado (`5 - 6`) era el **agregado con la tanda incrustada**, no el resultado del juego
(`1 - 1`). Las columnas `home_penalty_score`/`away_penalty_score`/`winner_team_id` **ya existían** en
el schema (Unit 36) y `MatchView`/`queries`/`PredictionVsResult` **ya exponían/mostraban** la tanda,
pero el **sync nunca las llenaba** (solo el override admin de Unit 36 las poblaba). Dos headers de
marcador (`MatchCard` de `/matches` y el `sublabel` del grid del pool) tampoco la mostraban.

**Decisión (plan presentado y aprobado antes de ejecutar; el usuario aprobó el formato inline para
`/matches` y pidió que el pool no rompa la grilla en mobile):** corregir la **causa raíz** en el
provider + persistir la tanda y el ganador en el sync, y mostrar la diferenciación **apilada**
(segunda línea pequeña) en ambos headers para que no ensanche la fila/columna en mobile.

## 1bis. Refinamiento (2026-06-30): el campo `penalties` puede venir corrupto → derivar la tanda de `fullTime`

Tras desplegar la corrección anterior, **la tanda de Alemania vs Paraguay se mostraba `4 - 4`**, que no es
el resultado real. Diagnóstico contra la API y contra la **documentación oficial** de football-data.org
(`overtime.html`), que define la invariante `fullTime = regularTime + extraTime + penalties` (ejemplo EC1996:
`fullTime` 7–6 = 1–1 + 0–0 + 6–5):

```json
"score": {
  "winner": null,                       // ← imposible: un partido a penales SIEMPRE tiene ganador
  "duration": "PENALTY_SHOOTOUT",
  "regularTime": { "home": 1, "away": 1 },   // partido = 1-1 (sólido)
  "extraTime":   { "home": 0, "away": 0 },
  "penalties":   { "home": 4, "away": 4 },   // ← EMPATE imposible en una tanda (campo corrupto)
  "fullTime":    { "home": 4, "away": 5 }    // ← correcto: 1-1 + tanda 3-4
}
```

El dato **viola la invariante documentada**: `regularTime + penalties = 1–1 + 4–4 = 5–5 ≠ fullTime 4–5`. O
sea, el desglose `penalties` (`4-4`, + `winner: null`) vino **corrupto/incompleto** (el proveedor seguía
cargando el resultado; entre syncs cambió de `penalties 5-5 / fullTime 5-6` a `penalties 4-4 / fullTime 4-5`),
mientras que `fullTime` (4–5) sí traía el marcador decisivo y decodifica a la tanda real **`3 - 4`** (Paraguay
4–3, confirmado por el admin).

**Decisión:** `splitScore` deriva la tanda de **`fullTime − (regularTime + extraTime)`** (campo de marcador
siempre mantenido) en vez del desglose `penalties`; los dos coinciden cuando el dato es consistente, pero
`fullTime` resiste la corrupción puntual del desglose. Se rechaza una tanda derivada empatada/negativa (imposible)
y se cae al campo `penalties` solo si `fullTime` no trae una tanda decidida. El ganador del sync se deriva de esa
tanda (`derivePenaltyWinner`).

**Reparación de datos del partido de referencia (con OK del usuario; la DB de `.env` apunta a producción):** como
la API de ese partido fue inconsistente, se fijó con un **override de admin congelado**
(`scripts/override-penalty-match-537415.ts --apply`): `homeScore/awayScore = 1`, `homePenaltyScore/awayPenaltyScore
= 3/4`, `winnerTeamId = Paraguay`, `manualOverride = true` (el sync ya no lo pisa). Puntos re-calculados con
`scripts/rescore-penalty-match.ts --apply` (1/0/1, total 2 — sin cambio por la tanda, ya que ninguna predicción era
empate con ganador). Tests del provider: caso real GER-PAR (`penalties 4-4` ignorado, `fullTime 4-5` ⇒ tanda `3-4`)
+ caso de fallback al campo `penalties` cuando `fullTime` no incluye la tanda. Commit `e982bd2`.

## 2. Business Rules

### BR-75.1 — El provider separa juego corrido y tanda (`splitScore`)
`football-data.ts` amplía el tipo `score` con `regularTime`/`extraTime`/`penalties` (opcionales, solo
presentes en knockout que pasa de 90'). Según la **codificación documentada** de football-data.org
(`overtime.html`): `fullTime = regularTime + extraTime + penalties` (ejemplo oficial EC1996: `fullTime`
7–6 = `regularTime` 1–1 + `extraTime` 0–0 + `penalties` 6–5). `splitScore(score)`:
- Si `duration === "PENALTY_SHOOTOUT"` (y hay `regularTime`): `homeScore/awayScore = regularTime + extraTime`
  (el juego corrido, 120'); la **tanda se deriva de `fullTime − (regularTime + extraTime)`** —no del campo
  `penalties` directo— porque `fullTime` es el campo de marcador siempre mantenido y el desglose `penalties`
  puede venir corrupto (ver §1bis). Se **rechaza una tanda empatada** (imposible) y `< 0`; se cae al campo
  `penalties` solo si `fullTime` no trae una tanda decidida; si tampoco, `null`.
- Si no: `homeScore/awayScore = fullTime` (ya es el resultado real de 90'/120', sin tanda que separar);
  penales `null`.
- Verificación con la referencia (dato corrupto real): `fullTime` 4–5, `penalties` 4–4 → partido `1 - 1`,
  tanda derivada **`3 - 4`** (Paraguay 4–3); el `4 - 4` del campo `penalties` se ignora.

### BR-75.2 — El sync persiste la tanda y deriva el ganador
`NormalizedMatchSchema` añade `homePenaltyScore`/`awayPenaltyScore` (int ≥ 0, nullable, opcionales).
`syncMatchesToDB` persiste ambos y deriva `winner_team_id` con `resolveSyncedWinnerTeamId` (por
marcador; si se empató el juego, por la tanda vía `derivePenaltyWinner` de Unit 36) **solo cuando el
status entrante es `FINISHED`** (un empate en juego no es resultado aún). El congelado existente
(`manualOverride` o regresión terminal) se respeta para **todos** los campos nuevos (penales y
ganador), de modo que un override admin nunca se sobrescribe. Con esto el bonus de penales (US-5.1)
también puntúa en partidos auto-sincronizados, que antes quedaban con `winner_team_id` nulo.

### BR-75.3 — `/matches` muestra la tanda diferenciada (width-safe)
En `MatchCard`, la columna central de la rejilla `grid-cols-[1fr_auto_1fr]` (Unit 71) pasa a un
`flex flex-col items-center`: el marcador del partido arriba y, **solo si hay penales**
(`homePenaltyScore !== null && awayPenaltyScore !== null`), una línea pequeña
`(H - A pen.)` (`text-[10px] sm:text-xs`, `text-muted-foreground`) debajo. Al ir **apilada** dentro de
la columna `auto`, no ensancha la fila ni rompe el marcador en línea de Unit 71 en mobile.

### BR-75.4 — Los resultados del pool muestran la tanda diferenciada (width-safe)
Los penalty scores se threadean por `pools/types.ts` (`MatchView`/`PoolMemberPrediction`) →
`pools/queries.ts` (ambas usan `include`, ya traen las columnas) → `MatchColumn` en
`buildDayGroups` (`pool-predictions-view-helpers.ts`, normalizado con `?? null`). En el header de
columna de `PoolPredictionsView`, el bloque central pasa a un `flex flex-col` apilado: el marcador
(o el live score) arriba y, si hay penales, `H-A pen.` en una segunda línea pequeña. El `sublabel`
sigue siendo solo `"H - A"` (los penales no se incrustan en el string) para **no ensanchar el header
ni romper la grilla en mobile**. `PredictionVsResult` ya mostraba la tanda y ahora recibe el dato.

### BR-75.5 — Preservación de contratos
Sin nueva migración (columnas ya existían). Sin nuevas claves i18n: la etiqueta `pen.` se hardcodea
igual que en `PredictionVsResult` (idéntica es/en). Se preservan `data-testid`, `score()` (`"vs"` sin
marcador), el live score de Unit 58, la semántica del override admin (Unit 36/`resolveWinner`) y los
partidos sin tanda se ven idénticos a antes. Sin nueva superficie de input/rutas/server actions.

## 3. Archivos

| Archivo | Cambio |
|---------|--------|
| `src/features/competition/services/providers/football-data.ts` | MODIFIED — tipo `score` + `splitScore` (juego corrido vs tanda; tanda derivada de `fullTime`, §1bis) |
| `src/features/competition/schemas.ts` | MODIFIED — `NormalizedMatchSchema` + `homePenaltyScore`/`awayPenaltyScore` |
| `src/features/competition/services/sync-orchestrator.ts` | MODIFIED — persiste tanda + `resolveSyncedWinnerTeamId` (FINISHED, congelado respetado) |
| `src/features/competition/components/match-card.tsx` | MODIFIED — línea de tanda apilada bajo el marcador |
| `src/features/pools/types.ts` | MODIFIED — penalty fields en `MatchView`/`PoolMemberPrediction` |
| `src/features/pools/queries.ts` | MODIFIED — mapeo de penalty fields (matches + predictions) |
| `src/features/pools/components/pool-predictions-view-helpers.ts` | MODIFIED — `MatchColumn` + `buildDayGroups` |
| `src/features/pools/components/pool-predictions-view.tsx` | MODIFIED — header de columna apilado (width-safe) |
| `*/__tests__/football-data.test.ts`, `sync-orchestrator.test.ts`, `pool-predictions-view.test.tsx` | MODIFIED — cobertura de penales: tanda derivada de `fullTime` + fallback a `penalties` (§1bis), + fixtures de 4 tests por el cambio de tipo |
| `scripts/repair-unit-75-penalty-scores.ts` | NEW — re-lee RESULTS por el provider corregido y reescribe la tanda/ganador de los partidos a penales (dry-run por defecto) |
| `scripts/rescore-penalty-match.ts` | NEW — recalcula `PredictionScore` de un partido tras corregir su resultado (reusa `computeScore`, dry-run por defecto) |
| `scripts/override-penalty-match-537415.ts` | NEW — override de admin congelado para el dato corrupto de Alemania vs Paraguay (§1bis; dry-run por defecto) |

## 4. Stages

Requirements/User Stories EXECUTE (FR-REFINE-75.1–75.3, US-75.1). Functional Design EXECUTE (este
doc). Code Generation EXECUTE. Build and Test EXECUTE. **SKIP** Reverse Engineering, Units Generation,
NFR Requirements/Design, Infrastructure, Application Design (refine sin nuevo unit-of-work; sin
schema/migraciones/rutas/server actions/i18n nuevos — reusa columnas y componentes existentes).

## 5. Out of scope

- Snapshot de seed (`world-cup-2026-fixtures.json`): solo registra partidos **pendientes** (sin scores), no necesita campos de penales.
- El override admin de penales (Unit 36): ya almacena goles + tanda + ganador correctamente; no se toca.
- Backfill de artefactos AI-DLC de Units 73/74 (commits de fix sin docs); ver nota de numeración en requirements.
- Mostrar la cantidad exacta de penales en el **selector de predicción** (sigue siendo solo ganador de la tanda, US-3.3).
