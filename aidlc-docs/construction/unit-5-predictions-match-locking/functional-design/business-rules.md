# Unit 5: Predictions and Match Locking — Business Rules

## Prediction Scope and Ownership

| ID | Rule |
|---|---|
| BR-5.1 | v1 stores one prediction per authenticated user and match. |
| BR-5.2 | The same prediction counts for every pool where the user participates. |
| BR-5.3 | Pool-specific predictions are explicitly deferred; code generation must not implement per-pool prediction editing in Unit 5. |
| BR-5.4 | A user may only create, update, and read their own pre-kickoff predictions. |

## Match Eligibility and Locking

| ID | Rule |
|---|---|
| BR-5.5 | A prediction can be created or edited only before server time reaches `match.kickoffAt`. |
| BR-5.6 | The server must re-read match state and server time during every save attempt. |
| BR-5.7 | Client clock, cached UI state, or countdown display cannot authorize a save. |
| BR-5.8 | Matches with missing home team, missing away team, or missing kickoff are not prediction-eligible. |
| BR-5.9 | Only `SCHEDULED` matches before kickoff are editable. |
| BR-5.10 | `LOCKED`, `LIVE`, `FINISHED`, `POSTPONED`, and `CANCELLED` matches are not editable. |
| BR-5.11 | Save attempts after lock fail closed with a 403-style domain error. |
| BR-5.12 | Once locked, prediction score fields and penalty winner cannot change. |

## Missing Predictions

| ID | Rule |
|---|---|
| BR-5.13 | If a user does not save a prediction before kickoff, the system must not create a default prediction. |
| BR-5.14 | A missing prediction means the user earns no points for that match. |
| BR-5.15 | UI score controls may visually start at 0-0 for input convenience, but 0-0 is not persisted unless the user explicitly saves it before kickoff. |

## Score Validation

| ID | Rule |
|---|---|
| BR-5.16 | Predicted home and away scores must be integers. |
| BR-5.17 | Predicted home and away scores must each be between 0 and 20 inclusive. |
| BR-5.18 | Invalid scores must produce field-level validation feedback and must not partially save. |

## Knockout Penalty Winner

| ID | Rule |
|---|---|
| BR-5.19 | Penalty winner selection applies only to knockout matches. |
| BR-5.20 | Penalty winner selection is required when a knockout prediction is tied. |
| BR-5.21 | Penalty winner selection is forbidden when a knockout prediction is not tied. |
| BR-5.22 | Penalty winner selection is forbidden for group-stage matches. |
| BR-5.23 | The selected penalty winner must be either the match home team or away team. |
| BR-5.24 | Unit 5 stores only penalty winner team, not penalty shootout score. |

## Visibility

| ID | Rule |
|---|---|
| BR-5.25 | Before kickoff, predictions are private to their owner. |
| BR-5.26 | After kickoff, predictions may be visible in pool/social contexts implemented by Unit 6. |
| BR-5.27 | Unit 5 `/matches` displays only the current user's predictions. |

## Result and Scoring Handoff

| ID | Rule |
|---|---|
| BR-5.28 | Unit 5 may show real match results from Unit 4 when available. |
| BR-5.29 | Unit 5 must not calculate final points. |
| BR-5.30 | Unit 5 UI may show points as pending/deferred until Unit 6 implements scoring. |
| BR-5.31 | Prediction data must support Unit 6 exact score, correct result, one-team score, and knockout penalty bonus calculations. |

## Security and Auditability

| ID | Rule |
|---|---|
| BR-5.32 | Prediction writes require an authenticated, verified, onboarded user according to existing app gates. |
| BR-5.33 | Prediction writes must be validated server-side even if the client already validated input. |
| BR-5.34 | RLS and server actions must prevent users from writing predictions for other users. |
| BR-5.35 | Lock metadata must be retained for future auditability. |
| BR-5.36 | Unit 5 prepares immutable-after-lock records but does not implement V2 ledger/hash-chain audit. |
| BR-5.37 | User-facing lock errors must be clear and must not expose database or provider internals. |
