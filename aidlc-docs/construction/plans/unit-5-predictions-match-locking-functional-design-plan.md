# Unit 5: Predictions and Match Locking — Functional Design Plan

## Unit
**Predictions and Match Locking** — permitir que usuarios verificados registren, modifiquen y consulten predicciones de marcador para partidos disponibles, con bloqueo autoritativo del servidor al kickoff y soporte de ganador por penales en knockout.

## Stories
- **US-3.1** Predecir marcador: ingresar goles para equipo local y visitante antes del inicio del partido.
- **US-3.2** Modificar predicción: actualizar libremente antes del kickoff; endpoint devuelve error 403 una vez iniciado.
- **US-3.3** Predicción de penales: en knockout, si el marcador predicho es empate, elegir ganador por penales.
- **US-3.4** Visualización de predicciones: ver predicción del usuario junto al resultado real y puntos por partido cuando Unit 6 los calcule.
- **Match Prediction Screen contract**: flujo primario de predicción y estados de edición/bloqueo.

## Carry-Forward Inputs
- **US note**: Predicciones deben ser inmutables una vez iniciado el partido, pensando en V2 con apuestas USDT/Solana y auditabilidad legal/técnica.
- **Unit 4 dependency**: un partido solo es elegible si tiene ambos equipos definidos y kickoff conocido; timestamps UTC, UI en hora local.
- **Unit 4 BR-4.13/4.15/4.17/4.20**: estados del partido y elegibilidad cierran predicciones si kickoff pasó, si faltan equipos/kickoff o si está postponed/cancelled.
- **Unit 6 dependency**: Unit 5 debe almacenar datos suficientes para puntuar exact score, winner/draw, one-team score y bonus de penales.
- **Security baseline**: writes sensibles requieren autorización, validación server-side y RLS; errores no deben filtrar internals.

## Plan Checklist
- [x] Collect and analyze answers to clarification questions below.
- [x] Resolve ambiguous answers with follow-up questions if needed. *(No follow-up required; Q1 interpreted as global v1 prediction with future per-pool extension deferred.)*
- [x] Generate `domain-entities.md`.
- [x] Generate `business-logic-model.md`.
- [x] Generate `business-rules.md`.
- [x] Generate `frontend-components.md`.

---

## Clarification Questions

Responde cada pregunta poniendo la letra después de `[Answer]:`. Si ninguna encaja, elige `X` y describe. Las opciones recomendadas están marcadas.

---

### Question 1 — Alcance de predicciones por usuario (US-3.1)
¿Qué debe poder predecir un usuario en v1?

A) **Una predicción global por usuario y partido** — la misma predicción cuenta para todos los pools donde participa. (recomendado)
B) Una predicción distinta por pool y partido.
C) Una predicción por competición, sin relación con pools hasta Unit 6.
X) Otro

[Answer]: A, pero pudiera editar por cada pool, si así lo deseara

---

### Question 2 — Modelo de edición antes del kickoff (US-3.2)
¿Cómo guardamos cambios antes del bloqueo?

A) **Upsert de último estado + timestamps** — se sobrescribe la predicción editable y se conserva `createdAt/updatedAt/lockedAt` cuando corresponda. (recomendado)
B) Historial completo de cada cambio desde v1.
C) Solo permitir crear una vez; sin edición.
X) Otro

[Answer]: A

---

### Question 3 — Auditoría futura V2 cripto
La nota transversal pide inmutabilidad/auditabilidad para V2. ¿Qué nivel dejamos ahora?

A) **Base preparada** — registros inmutables después del lock, campos de lock/fuente, timestamps y constraints; sin ledger/hash chain todavía. (recomendado)
B) Implementar ledger append-only/hash chain desde v1.
C) No agregar nada especial hasta V2.
X) Otro

[Answer]: A

---

### Question 4 — Goles válidos en predicción (US-3.1)
¿Qué rango de goles debe aceptar la UI/API?

A) **Enteros 0–20 por equipo** — suficiente para fútbol, simple de validar y testear. (recomendado)
B) Enteros 0–99 por equipo.
C) Sin límite superior explícito.
X) Otro

[Answer]: A

---

### Question 5 — Elegibilidad de partido para predecir
Además de kickoff futuro, ¿qué condiciones deben bloquear creación/edición?

A) **Ambos equipos definidos + kickoff futuro + status editable** (`SCHEDULED`/pre-lock only); `LIVE`, `FINISHED`, `POSTPONED`, `CANCELLED` no editables. (recomendado)
B) Solo comparar kickoff; ignorar equipos/status.
C) Permitir predicción de placeholders knockout antes de definir equipos.
X) Otro

[Answer]: A

---

### Question 6 — Penales en knockout (US-3.3)
¿Cómo modelamos el ganador por penales?

A) **Campo `penaltyWinnerTeamId` obligatorio solo si knockout + predicción empatada**; debe ser uno de los dos equipos. (recomendado)
B) Permitir seleccionar ganador por penales en cualquier partido empatado, incluso grupos.
C) Pedir marcador exacto de penales.
X) Otro

[Answer]: A

---

### Question 7 — UI de predicción inicial
¿Dónde debe vivir el flujo principal para predecir en v1?

A) **En `/matches` con cards editables y/o CTA de predicción** — extender fixture existente para predecir desde el calendario. (recomendado)
B) Crear ruta separada `/predictions` como centro principal.
C) Solo desde detalle de pool.
X) Otro

[Answer]: A

---

### Question 8 — Visibilidad de predicciones antes del partido (US-3.4)
¿Quién puede ver una predicción antes de que el partido empiece?

A) **Solo el propio usuario** hasta kickoff; visibilidad social/ranking queda para Unit 6. (recomendado)
B) Todos los miembros de un pool pueden ver predicciones antes del kickoff.
C) Nadie ve predicciones hasta que termina el partido.
X) Otro

[Answer]: A, pero se pueden ver una vez el partido se ha empezado

---

### Question 9 — Resultado real y puntos en Unit 5 (US-3.4)
Unit 6 calcula puntos. ¿Qué debe mostrar Unit 5?

A) **Predicción + resultado real si existe; puntos como placeholder/deferred** hasta Unit 6. (recomendado)
B) Implementar ya cálculo de puntos completo en Unit 5.
C) No mostrar resultados reales junto a predicciones hasta Unit 6.
X) Otro

[Answer]: A

---

### Question 10 — Lock boundary y errores
Si el usuario intenta guardar cerca del kickoff y el tiempo cambia entre render y submit, ¿qué debe pasar?

A) **Servidor decide y falla cerrado** — server action reconsulta partido/tiempo; si ya bloqueó, devuelve error 403 y UI muestra estado bloqueado. (recomendado)
B) La UI decide con el reloj del cliente.
C) Se acepta una tolerancia de gracia posterior al kickoff.
X) Otro

[Answer]: A, Tienes que considerar que si el usuario no fijo resultados antes del kickoff no tendrá ningún punto. No se asume 0-0 como predicción válida.

---

## Expected Functional Design Outputs
- `domain-entities.md`: `Prediction`, lock metadata, user/match relationships, penalty winner field, future scoring relationship.
- `business-logic-model.md`: eligibility, create/update, lock check, penalty validation, prediction display, Unit 6 scoring handoff.
- `business-rules.md`: BR-5.x for editability, immutability, validation, authorization, visibility, knockout penalty conditions.
- `frontend-components.md`: prediction controls, match prediction card state, penalty selector, locked/read-only states, user prediction/result comparison placeholders.
