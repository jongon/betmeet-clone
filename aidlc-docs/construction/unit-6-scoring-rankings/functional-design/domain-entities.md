# Unit 6: Scoring and Pool Rankings — Domain Entities

> Unit 6 introduce **una** tabla nueva (`PredictionScore`) y reutiliza entidades de Units 3/4/5. La identidad de usuario viene de `Profile` (Unit 1).

---

## 1. PredictionScore (nueva)

Resultado de puntuar una `Prediction` contra el resultado real de su `Match`. Relación **1:1 con `Prediction`** (Q1=A). Guarda el desglose completo para transparencia y para alimentar `ScoreBreakdownExplainer` (Unit 2).

| Atributo | Tipo | Descripción |
|---|---|---|
| `id` | uuid (PK) | Identificador. |
| `predictionId` | uuid (FK → Prediction, **unique**) | Predicción puntuada (1:1). |
| `matchId` | uuid (FK → Match) | Denormalizado para re-puntuar por partido y limpiar (índice). |
| `userId` | uuid (FK → Profile) | Denormalizado para agregar el leaderboard sin join (índice). |
| `matchedCase` | enum `EXACT \| RESULT \| PARTIAL \| MISS` | Caso base (de `ScoreBreakdown`). |
| `basePoints` | int | Puntos del caso base (5/2/1/0). |
| `penaltyApplied` | bool | Si aplicó el bonus de penales. |
| `penaltyPoints` | int | Puntos del bonus (0 o +1). |
| `totalPoints` | int | `basePoints + penaltyPoints`. |
| `scoredAt` | timestamptz | Momento del cálculo (se actualiza en re-cálculo). |

**Constraints / índices**:
- `UNIQUE(predictionId)` — 1:1, base del upsert idempotente (BR-6.5).
- `@@index(matchId)` — re-score y barrido por partido.
- `@@index(userId)` — agregación del leaderboard.
- FK con `onDelete: Cascade` desde `Prediction` (si se borra la predicción, se borra su score).

**Notas de denormalización**: `userId`/`matchId` también están en `Prediction`, pero como la predicción es inmutable tras el lock (Unit 5), denormalizar es seguro y evita joins en el camino caliente del leaderboard.

**Mapeo a `ScoreBreakdown` (Unit 2)**: `{ matchedCase, basePoints, penaltyApplied, penaltyPoints, totalPoints, explanationKey: matchedCase }` — alimenta directamente `ScoreBreakdownExplainer`.

---

## 2. Entidades reutilizadas (sin cambios de tabla)

| Entidad | Unit | Uso en Unit 6 |
|---|---|---|
| `Prediction` | 5 | Entrada del scoring (`homeScore`, `awayScore`, `penaltyWinnerTeamId`). |
| `Match` | 4 | Resultado real (`homeScore`, `awayScore`, `winnerTeamId`, `status`, `phase.type`). Dispara al pasar a `FINISHED`. |
| `CompetitionPhase` | 4 | `type` define `isKnockout` (`KNOCKOUT` ⇒ true). |
| `Team` | 4 | Resolver `penaltyWinnerTeamId`/`winnerTeamId` → lado `home`/`away`. |
| `Pool` / `PoolMembership` | 3 | Conjunto de miembros a rankear en cada leaderboard. |
| `Profile` | 1 | Nickname + avatar en el leaderboard. |
| `ScoringRuleSet` / `computeScore` | 2 | Motor de cálculo (invariante BR-2.7). **No** se redefine. |

---

## 3. Read models (no persistidos)

### LeaderboardRow
| Atributo | Tipo | Descripción |
|---|---|---|
| `position` | int | Posición con **dense ranking** "1,1,2" (Q4=B). |
| `userId` | string | Miembro. |
| `nickname` | string | De `Profile` (Unit 1). |
| `avatarUrl` | string | De `Profile`. |
| `totalPoints` | int | Suma de `PredictionScore.totalPoints` del usuario (0 si no tiene). |
| `isViewer` | bool | Resalta al usuario actual. |
| `isTied` | bool | Comparte posición con otro. |

### Mapeo a la vista de Unit 5
Unit 6 alimenta `PredictionMatchView` (Unit 5) con `points`, `pointsStatus` y un nuevo `breakdown?: ScoreBreakdown` cuando está `SCORED` (BR-6.9).
