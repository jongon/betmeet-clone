# Unit 6: Scoring and Pool Rankings — Business Rules

> Identificador `BR-6.x`. El cálculo reutiliza `ScoringRuleSet`/`computeScore` (Unit 2); estas reglas gobiernan **cuándo** y **cómo** se aplica y se rankea.

---

## Cálculo de puntos (US-5.1)

| ID | Regla |
|---|---|
| **BR-6.1** | Las constantes y la lógica de puntos provienen **exclusivamente** de `src/features/scoring` (Unit 2). Unit 6 **no** define reglas de puntuación propias (invariante BR-2.7). |
| **BR-6.2** | Solo se puntúan partidos con `status = FINISHED` y `homeScore`/`awayScore` no nulos. |
| **BR-6.3** | `isKnockout` se deriva de `match.phase.type === 'KNOCKOUT'`. El bonus de penales solo puede aplicar en knockout con marcador empatado (lo garantiza `computeScore`). |
| **BR-6.4** | El ganador de penales se traduce de `teamId` a lado: `home` si `teamId === match.homeTeamId`, `away` si `=== match.awayTeamId`, `null` en otro caso. Aplica a la predicción (`penaltyWinnerTeamId`) y al real (`match.winnerTeamId`). |

## Persistencia e idempotencia

| ID | Regla |
|---|---|
| **BR-6.5** | Cada `Prediction` tiene **a lo sumo un** `PredictionScore` (`UNIQUE(predictionId)`). El cálculo hace **upsert** (Q1=A, Q3=A). |
| **BR-6.6** | `scoreMatch(matchId)` es **idempotente**: re-ejecutarlo recalcula y sobrescribe todas las predicciones del partido (seguro tras override admin US-6.2, Q3=A). |
| **BR-6.7** | Si un partido **deja de ser puntuable** (`CANCELLED`/`POSTPONED`, o resultado revertido a nulo), `scoreMatch` **elimina** los `PredictionScore` existentes de ese partido (limpieza). |

## Disparo del cálculo (Q2=A)

| ID | Regla |
|---|---|
| **BR-6.8** | El cálculo se dispara: (a) cuando el sync de Unit 4 marca un partido `FINISHED` → `scoreMatch`; (b) un **barredor** `scoreFinishedUnscoredMatches()` (cron de respaldo) cubre partidos finalizados sin puntuar; (c) el override de Unit 7 re-dispara `scoreMatch`. |

## Estado de puntuación de la predicción (integración Unit 5, Q7=A)

| ID | Regla |
|---|---|
| **BR-6.9** | El `pointsStatus` de una predicción se resuelve así: existe `PredictionScore` ⇒ **`SCORED`** (con `points` y `breakdown`); si el partido es `CANCELLED`/`POSTPONED` ⇒ **`NOT_SCORED`** (no se puntuará); si existe predicción sin score ⇒ **`PENDING_SCORING`**; si no hay predicción ⇒ **`NOT_SCORED`**. |

## Partidos no jugados (Q5=A)

| ID | Regla |
|---|---|
| **BR-6.10** | Las predicciones de partidos `CANCELLED`/`POSTPONED` **no** generan puntos ni cuentan para el total; no se crea `PredictionScore`. |

## Total y alcance (Q8=A)

| ID | Regla |
|---|---|
| **BR-6.11** | El total de un usuario es **global**: `SUM(PredictionScore.totalPoints)` sobre todas sus predicciones puntuadas. Es el **mismo** en todos sus pools; el pool solo determina **contra quién** se rankea. |

## Ranking por pool (US-5.2)

| ID | Regla |
|---|---|
| **BR-6.12** | El leaderboard de un pool lista a **sus miembros** ordenados por total **descendente**. Un miembro sin predicciones puntuadas aparece con **0** puntos. |
| **BR-6.13** | **Empates**: se usa **dense ranking "1, 1, 2"** (Q4=B). Los empatados comparten posición y la siguiente posición incrementa en 1. **Nota**: esto se **desvía** del ejemplo del AC de US-5.2 ("si hay dos 1ros, el siguiente es el 3ro" = standard "1,1,3"); decisión explícita del usuario en Functional Design Q4=B / F2. |
| **BR-6.14** | No hay criterios de desempate (US-5.2): los empatados son indistinguibles en posición. |
| **BR-6.15** | El leaderboard muestra **nickname** y **avatar** (de `Profile`, Unit 1) y resalta al usuario que lo consulta. |

## Seguridad / autorización

| ID | Regla |
|---|---|
| **BR-6.16** | El leaderboard de un pool solo es visible para **miembros** del pool (consistente con la autorización de Unit 3, BR-3.28). |
| **BR-6.17** | `scoreMatch`/barredor son operaciones **server-side**; no se exponen como acción directa al cliente (las dispara el sync/cron/override). |
