# Unit 5: Predictions and Match Locking — Domain Entities

## Scope

Unit 5 owns user match predictions: score forecasts, knockout penalty-winner choice, server-authoritative lock metadata, and the read model needed to show the user's prediction next to match results.

v1 uses **one global prediction per user and match**. That prediction counts for all pools where the user participates. The schema should not implement per-pool predictions in v1, but can avoid naming that would make a future `poolId` scope impossible.

---

## Prediction

Represents the latest saved forecast for one user on one match.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `userId` | UUID | Owner; maps to authenticated Supabase user/profile identity |
| `matchId` | UUID | FK to Unit 4 `Match` |
| `homeScore` | int | Predicted home-team goals, integer 0–20 |
| `awayScore` | int | Predicted away-team goals, integer 0–20 |
| `penaltyWinnerTeamId` | UUID nullable | Required only for knockout matches when predicted score is tied; must be home or away team |
| `lockedAt` | datetime nullable | Set when prediction becomes immutable due to kickoff/lock processing |
| `lockReason` | enum/string nullable | e.g. `KICKOFF_REACHED`, `MATCH_STATUS_LOCKED`, future operational reasons |
| `createdAt` / `updatedAt` | datetime | Audit timestamps |

### Relationships
- Belongs to one authenticated user/profile.
- Belongs to one `Match` from Unit 4.
- Read by Unit 6 scoring after match result is available.

### Constraints
- Unique: `(userId, matchId)` in v1.
- `homeScore` and `awayScore` must be integers between 0 and 20.
- `penaltyWinnerTeamId` must be null unless the match phase is knockout and the predicted score is tied.
- If `penaltyWinnerTeamId` is present, it must equal `match.homeTeamId` or `match.awayTeamId`.
- Once locked, prediction values cannot change.

---

## Prediction Lock Metadata

Lock metadata is stored on `Prediction`, while match eligibility comes from Unit 4 `Match`.

| Field | Type | Notes |
|---|---|---|
| `lockedAt` | datetime nullable | Server time when the prediction was frozen |
| `lockReason` | enum/string nullable | Human/debug reason for freeze |
| `match.kickoffAt` | datetime | Authoritative deadline from Unit 4 |
| `match.status` | enum | `SCHEDULED` is the only editable status before kickoff |

### Notes
- The server rechecks lock conditions on every save attempt.
- A prediction can be absent at kickoff. Absence means the user earns no points for that match; the system must not create an implicit 0-0 prediction.
- UI countdowns are informational only; the server is authoritative.

---

## Prediction Display View

Read model for `/matches` and future pool views.

| Field | Type | Notes |
|---|---|---|
| `match` | Match view | Teams, phase, kickoff, status, real score/result |
| `prediction` | Prediction nullable | Current user's prediction if present |
| `canEdit` | boolean | Server-derived editability |
| `lockReason` | string nullable | Explanation when not editable |
| `showPenaltySelector` | boolean | True for knockout tied prediction before lock |
| `points` | int nullable | Deferred to Unit 6; null in Unit 5 |
| `pointsStatus` | enum/string | `PENDING_SCORING`, `NOT_SCORED`, future `SCORED` |

### Visibility
- Before kickoff: users see only their own prediction.
- After kickoff: predictions may become visible to pool members in Unit 6 social/ranking contexts.
- Unit 5 should not build broad social prediction browsing, but must not design rules that prohibit post-kickoff visibility.

---

## Future Prediction Scope

The v1 domain is global per user/match. If future product strategy requires pool-specific predictions, a later unit can add a scope entity such as:

| Field | Type | Notes |
|---|---|---|
| `poolId` | UUID nullable | Future optional scope; not implemented in v1 |

This is explicitly deferred. Unit 5 code generation should enforce global `(userId, matchId)` uniqueness.

---

## Cross-Unit Dependencies

| Unit | Dependency |
|---|---|
| Unit 3 | User must be authenticated, verified, and onboarded according to existing gates before core actions. |
| Unit 4 | Prediction eligibility reads match teams, phase type, kickoff, status, and result fields. |
| Unit 6 | Scoring reads prediction score and penalty winner; points are not calculated in Unit 5. |
| Unit 7 | Admin result overrides may trigger recalculation in Unit 6; predictions remain immutable. |
