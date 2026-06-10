# Unit 6: Scoring and Pool Rankings — Functional Design Plan

## Unit
**Scoring and Pool Rankings** — calcular puntos de las predicciones al finalizar cada partido y construir el leaderboard por pool.

## Stories
- **US-5.1** Cálculo de Puntos (al finalizar un partido; reglas exacto 5 / resultado 2 / parcial 1 / miss 0 / +1 penales en knockout empatado).
- **US-5.2** Ranking por Pool (orden por puntos desc; empate comparte posición sin desempate; muestra nickname + avatar).

## Contexto del modelo existente (Units 4/5)
- **`Match`** (Unit 4): `homeScore`, `awayScore`, `homePenaltyScore`, `awayPenaltyScore`, `winnerTeamId`, `status` (`FINISHED` dispara scoring), `homeTeamId`/`awayTeamId`, `phase.type` (`GROUP`/`KNOCKOUT`/`LEAGUE`), `manualOverride`.
- **`Prediction`** (Unit 5): `userId`, `matchId`, `homeScore`, `awayScore`, `penaltyWinnerTeamId`. **Una predicción global por usuario/partido** que cuenta para todos sus pools.
- **Módulo compartido `src/features/scoring`** (Unit 2): `computeScore(ScoringExample)` + `ScoringRuleSet` — **fuente de verdad del invariante BR-2.7**. Unit 6 lo reutiliza con un adaptador `teamId → "home"/"away"`.
- **Hook de Unit 5**: `PredictionMatchView` ya expone `points: number | null` y `pointsStatus: "PENDING_SCORING" | "NOT_SCORED" | "SCORED"`; hoy están **stubeados** (`queries.ts`). Unit 6 los rellena con datos reales.
- **`ScoreBreakdownExplainer`** (Unit 2): componente data-agnóstico entregado para Unit 6.

## Dependencias / integraciones
- **Unit 5 (Predictions)**: lee predicciones; **modifica** su read model para servir puntos reales.
- **Unit 4 (Competition Data)**: resultados de `Match`; el scoring se dispara cuando un partido pasa a `FINISHED` (sync) y se re-dispara en override (Unit 7).
- **Unit 3 (Pools)**: membresías para el leaderboard por pool.
- **Unit 2**: reutiliza `computeScore` y `ScoreBreakdownExplainer`.

## Plan Checklist
- [x] Collect and analyze answers to clarification questions below
- [x] Resolve any ambiguous answers with follow-up questions (F1/F2)
- [x] Generate `domain-entities.md`, `business-logic-model.md`, `business-rules.md`, `frontend-components.md`

---

## Clarification Questions

Responde cada pregunta poniendo la letra después de `[Answer]:`. Si ninguna encaja, elige la última (X) y describe. Cada pregunta marca una opción **(recomendado)**.

---

### Question 1 — Persistencia del puntaje
¿Dónde guardamos los puntos calculados?

A) **Tabla `PredictionScore` 1:1 con `Prediction`** — guarda `points` + desglose (`matchedCase`, `basePoints`, `penaltyApplied`, `penaltyPoints`, `totalPoints`). El total por usuario se agrega con una query. Transparente y reusa el `ScoreBreakdown` de Unit 2. (recomendado)
B) Columnas de puntos directamente en `Prediction`.
C) `PredictionScore` + tabla materializada `UserCompetitionScore` (total cacheado) para leaderboards O(1).
X) Otro

[Answer]: A

---

### Question 2 — ¿Cuándo se dispara el cálculo?
El scoring corre al finalizar un partido (US-5.1). ¿Cómo se invoca?

A) **`scoreMatch(matchId)` idempotente + barredor `scoreFinishedUnscoredMatches()`** — el sync de Unit 4 llama a `scoreMatch` al marcar `FINISHED`; un cron de respaldo barre partidos finalizados sin puntuar; el override de Unit 7 re-dispara. (recomendado)
B) Solo un cron periódico que puntúa partidos `FINISHED` sin puntuar.
C) Solo invocación directa desde el sync (sin barredor de respaldo).
X) Otro

[Answer]: A

---

### Question 3 — Re-cálculo / idempotencia (override admin US-6.2)
Cuando un admin corrige el resultado, se debe recalcular (US-6.2). ¿Comportamiento de `scoreMatch`?

A) **Upsert / recálculo completo**: vuelve a puntuar todas las predicciones del partido y sobrescribe; seguro para re-ejecutar. (recomendado)
B) Solo puntúa lo que aún no tiene score (no recalcula).
X) Otro

[Answer]: A

---

### Question 4 — Empates en el ranking (US-5.2)
¿Qué esquema de posiciones?

A) **Standard competition ranking "1, 1, 3"** — empatados comparten posición y la siguiente posición salta (literal del AC: "si hay dos 1ros, el siguiente es el 3ro"). (recomendado)
B) Dense ranking "1, 1, 2".
X) Otro

[Answer]: B

---

### Question 5 — Partidos no jugados (CANCELLED / POSTPONED)
¿Cómo tratamos las predicciones de partidos que no se juegan?

A) **Excluidos del scoring**: no generan puntos ni cuentan; quedan `NOT_SCORED`. (recomendado)
B) Cuentan como 0 puntos.
X) Otro

[Answer]: A

---

### Question 6 — Pantalla del leaderboard
¿Dónde y cómo se muestra el ranking por pool?

A) **Leaderboard por pool** (pestaña/sección en el detalle del pool `/pools/[id]` y/o `/pools/[id]/leaderboard`): posición, nickname, avatar y puntos totales. Además el **desglose por partido** se muestra reutilizando `ScoreBreakdownExplainer` (Unit 2) en la vista de predicciones de Unit 5. (recomendado)
B) Leaderboard como página propia, sin integrar el desglose en Unit 5.
X) Otro

[Answer]: A

---

### Question 7 — Integración con la vista de predicciones de Unit 5
Unit 5 dejó `points`/`pointsStatus` stubeados. ¿Los conectamos?

A) **Sí** — Unit 6 modifica el read model de Unit 5 (`getFixtureWithMyPredictions`/`queries.ts`) para leer puntos reales desde `PredictionScore` y reflejar `SCORED`/`PENDING_SCORING`/`NOT_SCORED`. (recomendado)
B) No — Unit 6 expone una vista separada; Unit 5 queda con `points=null`.
X) Otro

[Answer]: A

---

### Question 8 — Alcance del total (confirmación)
¿El total del usuario es global y el mismo en todos sus pools?

A) **Sí** — una predicción global por usuario/partido (como definió Unit 5); el total es global y el leaderboard de cada pool solo cambia **qué miembros** se listan y rankean. (recomendado)
B) Puntajes por-pool (no aplica en v1).
X) Otro

[Answer]: No entiendo esta pregunta, dame un ejemplo.

---

## Notas
- Tras las respuestas generaré `domain-entities.md` (`PredictionScore`), `business-logic-model.md` (motor de scoring vía `computeScore` + adaptador, leaderboard, ranking de empates), `business-rules.md` (BR-6.x) y `frontend-components.md` (leaderboard + desglose).
- Unit 6 **sí** introduce tabla/migración nueva (`PredictionScore`) y **modifica** el read model de Unit 5.

---

## Follow-up Questions (resolver antes de generar)

### Follow-up F1 — Q8 con ejemplo
Ejemplo: Ana predice los 64 partidos y acumula **120 puntos**. Está en los pools "Amigos" (Beto, Carla) y "Oficina" (David).
- **A) Total global (recomendado)**: Ana tiene **un solo** total de 120; en cada pool se la rankea con esos mismos 120 contra distintos miembros. El puntaje no cambia entre pools, solo cambia contra quién compite.
- **B) Por-pool**: totales distintos por pool (no aplica en v1; la predicción es única y global).

[Answer]: A

---

### Follow-up F2 — Confirmar Q4 (conflicto con el AC)
Elegiste **B (dense, "1,1,2")**, pero el AC de US-5.2 ejemplifica standard: *"si hay dos 1ros, el siguiente es el 3ro"* ("1,1,3"). ¿Cómo procedemos?

A) **Mantener B (dense "1,1,2")** — acepto que se desvía del ejemplo del AC; documenta la decisión y se actualiza la interpretación del story. (tu elección actual)
B) **Cambiar a standard "1,1,3"** — alinear con el ejemplo literal del AC.
X) Otro

[Answer]: Mantener B
