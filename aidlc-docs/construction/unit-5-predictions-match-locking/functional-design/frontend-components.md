# Unit 5: Predictions and Match Locking — Frontend Components

## Scope

Unit 5 extends the existing `/matches` fixture experience with prediction controls for the current user. The route remains the main v1 surface for predicting matches.

---

## `/matches` Prediction Integration

### Purpose
Let users save or update predictions directly from fixture cards.

### Content
- Phase/group section from Unit 4.
- Match teams, flags, FIFA codes, kickoff in local time, and status.
- Current user's saved prediction if present.
- Score controls when editable.
- Read-only prediction summary when locked.
- Real result if available.
- Points placeholder/deferred state until Unit 6.

### Primary CTA
- `Guardar predicción` for unsaved editable matches.
- `Actualizar predicción` for saved editable matches.

### Secondary Actions
- `Ver reglas de puntuación` linking to `/rules`.
- `Cambiar predicción` affordance before kickoff.

---

## PredictionScoreControls

### Purpose
Simple score input for home and away teams.

### Behavior
- Shows two integer controls, one per team.
- Range: 0–20.
- Defaults visually to 0-0 when no prediction exists, but this is not persisted until save.
- Increment/decrement buttons should be easy to tap on mobile.
- Direct numeric entry is allowed if validation remains clear.

### States
- Editable: controls active, CTA enabled when valid.
- Saving: controls and CTA disabled, pending feedback visible.
- Validation error: inline message near offending input.
- Locked: replaced by read-only summary.

---

## PenaltyWinnerSelector

### Purpose
Capture knockout penalty winner only when required.

### Visibility Rules
- Show only if match phase is knockout and predicted home score equals predicted away score.
- Hide and clear value when prediction is not tied.
- Never show for group-stage matches.

### Content
- Two selectable options: home team and away team.
- Copy: “Si empatan en eliminación directa, elige quién avanza por penales.”

### Validation
- Required when visible.
- Selected team must be one of the two match teams.

---

## PredictionStatusSummary

### Purpose
Show whether the user has saved a prediction and whether it can still be changed.

### Variants
- `not_saved_editable`: “Aún no guardaste predicción. Si no guardas antes del inicio, no sumas puntos.”
- `saved_editable`: “Predicción guardada. Puedes cambiarla hasta el inicio del partido.”
- `locked_saved`: “Predicción bloqueada.” with score and optional penalty winner.
- `locked_missing`: “Sin predicción guardada; no suma puntos en este partido.”
- `unavailable`: explain missing teams/kickoff, postponed, cancelled, or non-editable status.

---

## PredictionVsResult

### Purpose
Support US-3.4 without implementing Unit 6 scoring.

### Content
- User prediction score.
- Real score/result when Unit 4 has it.
- Penalty winner prediction and actual winner when applicable/available.
- Points row: `Pendiente de cálculo` until Unit 6.

### States
- Result unavailable: show prediction only.
- Live match: show current score if available with “en juego” status.
- Finished match: show final result and pending points placeholder.

---

## LockConflictMessage

### Purpose
Explain save failures that happen near kickoff.

### Trigger
Server action returns a lock/403 domain error after rechecking match state.

### Copy Guidance
- Clear: “El partido ya empezó o quedó bloqueado. Tu predicción no se guardó.”
- If an earlier prediction exists: “Se mantiene tu última predicción guardada antes del bloqueo.”
- If none exists: “No había predicción guardada, por lo que este partido no suma puntos.”

---

## Mobile UX

- Keep teams, score controls, and save CTA visible within the first card viewport where practical.
- Use large tap targets for increment/decrement buttons.
- Collapse scoring explanations behind a small rules/info affordance.
- Avoid dense tables for prediction entry; cards are preferred.

---

## Empty and Error States

| State | UI |
|---|---|
| No matches | Reuse Unit 4 fixture empty state; no prediction controls. |
| Knockout placeholders | Show placeholders and “Predicción disponible cuando se definan los equipos.” |
| Missing kickoff | Show “Horario pendiente; aún no se puede predecir.” |
| Postponed/cancelled | Show non-editable status and no save CTA. |
| Save validation error | Inline field errors; preserve entered values. |
| Save lock conflict | `LockConflictMessage`; refresh card state. |

---

## Data Test IDs

Recommended stable selectors for code generation:
- `prediction-card-{matchId}`
- `prediction-home-score`
- `prediction-away-score`
- `prediction-penalty-winner`
- `prediction-save-button`
- `prediction-status-summary`
- `prediction-lock-conflict`
- `prediction-vs-result`
