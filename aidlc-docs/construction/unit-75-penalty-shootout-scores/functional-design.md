# Functional Design — Unit 75: Goles del partido vs goles de la tanda de penales

> Refine post-construcción (2026-06-30) sobre Unit 25 (sync football-data), Unit 28 (persistencia de matches), Unit 41 (predicciones del pool), Unit 71 (marcador en línea) y la infraestructura de penales de Unit 36. **No reinicia** etapas aprobadas (Units 1–72 intactas). Bug en vivo de la fase eliminatoria: cuando un partido empata en los 120 minutos y se define por **tanda de penales**, el resultado de la tanda se mostraba **como marcador final del partido**. Partido de referencia: **Alemania vs Paraguay**.

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

## 2. Business Rules

### BR-75.1 — El provider separa juego corrido y tanda (`splitScore`)
`football-data.ts` amplía el tipo `score` con `regularTime`/`extraTime`/`penalties` (opcionales, solo
presentes en knockout que pasa de 90'). `splitScore(score)`:
- Si `duration === "PENALTY_SHOOTOUT"` y hay `penalties`: `homeScore/awayScore = regularTime + extraTime`
  (el juego corrido, 120'); `homePenaltyScore/awayPenaltyScore = penalties`.
- Si no: `homeScore/awayScore = fullTime` (ya es el resultado real de 90'/120', sin tanda que separar);
  penales `null`.
- Verificación con la referencia: `1 - 1` (partido) + `4 - 5` (penales). El `fullTime` 5–6 ya no se usa
  como marcador.

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
| `src/features/competition/services/providers/football-data.ts` | MODIFIED — tipo `score` + `splitScore` (juego corrido vs tanda) |
| `src/features/competition/schemas.ts` | MODIFIED — `NormalizedMatchSchema` + `homePenaltyScore`/`awayPenaltyScore` |
| `src/features/competition/services/sync-orchestrator.ts` | MODIFIED — persiste tanda + `resolveSyncedWinnerTeamId` (FINISHED, congelado respetado) |
| `src/features/competition/components/match-card.tsx` | MODIFIED — línea de tanda apilada bajo el marcador |
| `src/features/pools/types.ts` | MODIFIED — penalty fields en `MatchView`/`PoolMemberPrediction` |
| `src/features/pools/queries.ts` | MODIFIED — mapeo de penalty fields (matches + predictions) |
| `src/features/pools/components/pool-predictions-view-helpers.ts` | MODIFIED — `MatchColumn` + `buildDayGroups` |
| `src/features/pools/components/pool-predictions-view.tsx` | MODIFIED — header de columna apilado (width-safe) |
| `*/__tests__/football-data.test.ts`, `sync-orchestrator.test.ts`, `pool-predictions-view.test.tsx` | MODIFIED — cobertura de penales (+ fixtures de 4 tests por el cambio de tipo) |

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
