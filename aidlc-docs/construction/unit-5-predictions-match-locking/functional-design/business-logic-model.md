# Unit 5: Predictions and Match Locking — Business Logic Model

## BL-5.0: Prediction Eligibility

Purpose: decide if a user may create or update a prediction for a match.

```
function getPredictionEligibility(match, now): Eligibility
    if match.homeTeamId == null or match.awayTeamId == null:
        return blocked("TEAMS_NOT_DEFINED")
    if match.kickoffAt == null:
        return blocked("KICKOFF_NOT_DEFINED")
    if now >= match.kickoffAt:
        return blocked("KICKOFF_REACHED")
    if match.status != SCHEDULED:
        return blocked("MATCH_NOT_EDITABLE")
    return editable()
```

Rules:
- Server time is authoritative.
- Client countdowns are hints only.
- `LIVE`, `FINISHED`, `LOCKED`, `POSTPONED`, and `CANCELLED` are not editable.
- Knockout placeholders are not editable until both teams are official.

---

## BL-5.1: Create or Update Prediction

Purpose: save the latest user prediction before kickoff.

```
submitPrediction(userId, matchId, input): Result
    require authenticated verified user
    match = load match with phase and teams
    eligibility = getPredictionEligibility(match, serverNow())
    if not eligibility.editable:
        lockExistingPredictionIfNeeded(userId, match, eligibility.reason)
        return forbidden(eligibility.reason)

    validated = validatePredictionInput(match, input)
    prediction = upsert Prediction by userId + matchId:
        homeScore = validated.homeScore
        awayScore = validated.awayScore
        penaltyWinnerTeamId = validated.penaltyWinnerTeamId
        updatedAt = now
    return success(prediction)
```

Properties:
- Upsert stores only the latest editable state.
- `createdAt` remains the first save time; `updatedAt` tracks the latest pre-lock edit.
- No prediction is created automatically for users who did not submit before kickoff.

---

## BL-5.2: Prediction Input Validation

```
validatePredictionInput(match, input): ValidPrediction
    require integer input.homeScore between 0 and 20
    require integer input.awayScore between 0 and 20

    isDrawPrediction = input.homeScore == input.awayScore
    isKnockout = match.phase.type == KNOCKOUT

    if isKnockout and isDrawPrediction:
        require input.penaltyWinnerTeamId is match.homeTeamId or match.awayTeamId
    else:
        require input.penaltyWinnerTeamId == null
```

Notes:
- Group-stage draws never collect a penalty winner.
- Knockout non-draw predictions do not collect a penalty winner.
- Unit 5 stores only penalty winner team, not penalty shootout score.

---

## BL-5.3: Lock Existing Prediction

Purpose: freeze prediction records once the match is no longer editable.

```
lockExistingPredictionIfNeeded(userId, match, reason): void
    prediction = find Prediction by userId + match.id
    if prediction exists and prediction.lockedAt is null:
        update prediction set lockedAt = now, lockReason = reason
```

Lock triggers:
- User tries to save after lock and already had a prediction.
- Background lock job or read path detects kickoff reached in a later implementation.
- Match status changes away from `SCHEDULED` before or at kickoff.

Absence behavior:
- If no prediction exists at kickoff, do nothing.
- Missing prediction means zero opportunity for that match, not an implicit 0-0.

---

## BL-5.4: Prediction Display on `/matches`

```
getFixtureWithMyPredictions(userId, filters): FixturePredictionView
    fixture = Unit4.getFixture(filters)
    predictions = list Prediction where userId = current user and matchId in fixture.matches
    for each match:
        eligibility = getPredictionEligibility(match, now)
        attach prediction, canEdit, lockReason, result fields, points placeholder
```

Display states:
- No prediction and editable: show score controls defaulting to 0-0 as UI input only.
- Saved prediction and editable: show saved score and `Cambiar predicción` affordance.
- Locked with prediction: show read-only prediction and match result if available.
- Locked without prediction: show “Sin predicción guardada; no suma puntos en este partido.”
- Awaiting scoring: show points placeholder until Unit 6.

---

## BL-5.5: Post-Kickoff Visibility Policy

```
canViewPrediction(viewer, prediction, match, context): boolean
    if viewer.id == prediction.userId: return true
    if now < match.kickoffAt: return false
    if context is Unit6 pool visibility and users share pool: return true
    return false
```

Unit 5 implements only self-view in `/matches`. The policy records the product rule that predictions may become visible after kickoff in Unit 6 pool contexts.

---

## BL-5.6: Unit 6 Scoring Handoff

Unit 5 does not calculate points.

It must persist enough data for Unit 6:
- `homeScore`
- `awayScore`
- `penaltyWinnerTeamId`
- `matchId`
- `userId`
- immutable lock state after kickoff

Unit 6 combines prediction data with Unit 4 result data:
- exact score = 5
- correct result/winner/draw = 2
- one team score = 1
- knockout penalty winner bonus = +1

---

## Data Flows Summary

| Flow | Input | Logic | Output |
|---|---|---|---|
| Open fixture predictions | Current user + fixture filters | BL-5.4 | Fixture with current user's prediction state |
| Save prediction | Score inputs + optional penalty winner | BL-5.0, BL-5.1, BL-5.2 | Upserted prediction or 403 lock error |
| Late save attempt | Submit after kickoff/status change | BL-5.0, BL-5.3 | Forbidden response, existing prediction locked if present |
| Show locked match | Match after kickoff | BL-5.4 | Read-only prediction or no-prediction state |
| Score later | Finished match + prediction | BL-5.6 | Unit 6 scoring input |
