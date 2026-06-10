# Unit 6: Scoring and Pool Rankings — Business Logic Model

> Lógica técnico-agnóstica: adaptador al motor compartido, motor de scoring por partido, barredor, agregación del leaderboard y ranking de empates.

---

## BL-1: Adaptador `Prediction`+`Match` → `ScoringExample`

Traduce el modelo persistido al contrato del motor compartido (Unit 2), sin duplicar reglas (BR-6.1, BR-6.4).

```
function teamToSide(teamId, match) -> "home" | "away" | null:
    if teamId == match.homeTeamId: return "home"
    if teamId == match.awayTeamId: return "away"
    return null

function toScoringExample(prediction, match) -> ScoringExample:
    return {
        predictedHome: prediction.homeScore,
        predictedAway: prediction.awayScore,
        actualHome: match.homeScore,
        actualAway: match.awayScore,
        isKnockout: match.phase.type == "KNOCKOUT",
        predictedPenaltyWinner: teamToSide(prediction.penaltyWinnerTeamId, match),
        actualPenaltyWinner: teamToSide(match.winnerTeamId, match),
    }
```
> `computeScore` ignora los penales fuera de "knockout + empate"; pasar `winnerTeamId` como `actualPenaltyWinner` es correcto porque en un knockout empatado el `winnerTeamId` es el ganador de la tanda.

---

## BL-2: `scoreMatch(matchId)` — motor por partido (US-5.1, idempotente)

```
function scoreMatch(matchId):
    match = load Match(matchId) with phase + predictions
    if match.status != FINISHED OR match.homeScore == null OR match.awayScore == null:
        // No puntuable (incluye CANCELLED/POSTPONED): limpiar scores previos (BR-6.7)
        delete PredictionScore where matchId == matchId
        return

    transaction:
        for prediction in match.predictions:
            breakdown = computeScore(toScoringExample(prediction, match))   // Unit 2
            upsert PredictionScore by predictionId with {
                matchId, userId: prediction.userId,
                matchedCase: breakdown.matchedCase,
                basePoints: breakdown.basePoints,
                penaltyApplied: breakdown.penaltyApplied,
                penaltyPoints: breakdown.penaltyPoints,
                totalPoints: breakdown.totalPoints,
                scoredAt: now(),
            }
```
- **Idempotente** (BR-6.5/6.6): re-ejecutar sobrescribe. Seguro tras override admin (US-6.2).
- **Atómico** por partido (transacción).

---

## BL-3: `scoreFinishedUnscoredMatches()` — barredor de respaldo (Q2=A)

```
function scoreFinishedUnscoredMatches():
    matches = Match where status == FINISHED
              AND exists prediction without PredictionScore
    for m in matches: scoreMatch(m.id)
```
Invocado por cron/post-sync. Cubre partidos que finalizaron sin disparo directo.

**Disparos (BR-6.8)**: (a) sync de Unit 4 al marcar `FINISHED` → `scoreMatch`; (b) barredor; (c) override de Unit 7 → `scoreMatch`. Puntos de integración (Units 4/7).

---

## BL-4: Total del usuario (global, Q8=A)

```
function userTotals(userIds) -> Map<userId, points>:
    rows = SELECT userId, SUM(totalPoints) AS points
           FROM prediction_scores WHERE userId IN userIds GROUP BY userId
    return map(rows)   // ausentes ⇒ 0  (BR-6.11, BR-6.12)
```
El total es global (BR-6.11); el pool solo filtra **qué** usuarios se agregan.

---

## BL-5: Leaderboard por pool (US-5.2)

```
function getPoolLeaderboard(poolId, viewerId) -> LeaderboardRow[]:
    members = poolMemberships(poolId) join Profile (nickname, avatar)   // BR-6.12, BR-6.15
    totals = userTotals(members.map(userId))
    rows = members.map(m => { userId, nickname, avatarUrl, totalPoints: totals[m]?? 0 })
    sort rows by totalPoints DESC
    assignDensePositions(rows)        // BL-6
    mark isViewer = (userId == viewerId)
    return rows
```
Acceso solo para miembros del pool (BR-6.16).

---

## BL-6: Asignación de posiciones — **dense ranking** "1,1,2" (Q4=B)

```
function assignDensePositions(rowsSortedDesc):
    position = 0
    prevPoints = null
    for i, row in rowsSortedDesc:
        if i == 0 OR row.totalPoints != prevPoints:
            position = position + 1          // dense: +1 aunque haya habido empate
        row.position = position
        row.isTied = (hay otra fila con los mismos totalPoints)
        prevPoints = row.totalPoints
```
Resultado: puntos `[10,10,8,8,7]` → posiciones `[1,1,2,2,3]` (dense, BR-6.13).
> Desviación documentada del ejemplo del AC (standard "1,1,3"); decisión Q4=B/F2.

---

## BL-7: Resolución de `pointsStatus` para Unit 5 (BR-6.9, Q7=A)

```
function resolvePoints(prediction, match, score) -> { points, status, breakdown }:
    if score != null:                       return { points: score.totalPoints, status: SCORED, breakdown: toBreakdown(score) }
    if match.status in {CANCELLED, POSTPONED}: return { points: null, status: NOT_SCORED }
    if prediction != null:                  return { points: null, status: PENDING_SCORING }
    return { points: null, status: NOT_SCORED }
```
Unit 6 **modifica** el read model de Unit 5 (`getFixtureWithMyPredictions`) para usar esta resolución en vez del stub (`points: null`), e incluye `breakdown` cuando `SCORED`.

---

## Flujos de datos (resumen)

| Flujo | Origen | Transformación | Destino |
|---|---|---|---|
| Puntuar partido | Match FINISHED | BL-1 + BL-2 (`computeScore`) | `PredictionScore` |
| Barrido | cron/post-sync | BL-3 | `PredictionScore` |
| Leaderboard | Pool + scores | BL-4 + BL-5 + BL-6 | `LeaderboardRow[]` |
| Vista de predicción | Unit 5 | BL-7 | `points`/`pointsStatus`/`breakdown` |

## Integraciones

| Con | Qué |
|---|---|
| Unit 2 | `computeScore`/`ScoringRuleSet` (motor) y `ScoreBreakdownExplainer` (UI) |
| Unit 4 | dispara `scoreMatch` al `FINISHED`; override re-dispara (vía Unit 7) |
| Unit 5 | **modifica** su read model para servir puntos/estado/desglose reales |
| Unit 3 | membresías para el leaderboard; autorización por pool |
| Unit 1 | nickname/avatar en el leaderboard |
