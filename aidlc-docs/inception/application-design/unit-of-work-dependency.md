# Unit of Work Dependencies

## Dependency Matrix

| Unit | Depends On | Blocks | Notes |
|---|---|---|---|
| 1. Foundation | None | All user-specific units | Auth/profile identity is required everywhere |
| 2. UX Education | Unit 1 for authenticated onboarding | Improves adoption, but not all backend units | Standalone per user preference |
| 3. Pools | Unit 1 | Predictions, Rankings | First user-facing milestone |
| 4. Competition Data/API Sync | Seed data can start independently; auth needed for admin sync views later | Predictions, Scoring, Admin | API sync and admin override are separated |
| 5. Predictions | Units 1, 4; Unit 3 for pool context | Scoring | Requires match lock semantics |
| 6. Scoring/Rankings | Units 3, 4, 5 | Admin observability, leaderboard polish, notifications | Scoring engine before full leaderboard UI |
| 7. Admin/Observability | Units 1, 3, 4, 6 | None | Full admin later, includes pool progress visibility |
| 8. Design System/UI Polish | Units 1–7 | None | Cross-cutting presentation refine; no behavior changes |
| 9. Transactional Email | Units 1, 8 | Unit 10 only for shared notification preferences vocabulary | Cross-cutting email config/templates; no new runtime deps |
| 10. Web Push Notifications | Units 1, 3, 4, 6, 9 | None | Additive post-construction unit; consumes events and user preferences |

## Critical Path

```text
Foundation
  -> Pools
  -> Competition Data/API Sync
  -> Predictions
  -> Scoring/Rankings
  -> Admin/Observability
  -> Transactional Email
  -> Web Push Notifications
```

UX Education runs as a standalone unit after Foundation and can evolve alongside Pools and Predictions.

## Parallelization Opportunities

- Unit 2 can proceed after Unit 1 while Unit 3 starts.
- Unit 4 seed data can start in parallel with Unit 3 if schema decisions are stable.
- Unit 7 dashboard read-only pool visibility can begin after Units 3 and 4, but overrides should wait until Unit 6.

## Coordination Points

- **Profile identity**: nickname/avatar fields consumed by pool and ranking views.
- **Competition/match IDs**: required by predictions and scoring.
- **Prediction immutability**: required by scoring and future crypto readiness.
- **Score breakdown schema**: required by rankings, UX explanations, and admin inspection.
- **Admin override audit**: touches competition result and scoring recalculation.
- **Notification event hooks**: Unit 3 invitations, Unit 4 status/score transitions, and Unit 6 ranking recalculation must emit deduplicatable notification events without changing their approved core behavior.
- **Push payload privacy**: push payloads must be generic/minimal; detailed private data is fetched after authenticated navigation.

## Testing Checkpoints

1. After Unit 1: auth/profile/nickname/avatar lifecycle works.
2. After Unit 3: verified user can create/join pools.
3. After Unit 4: seed fixture and API sync produce normalized matches.
4. After Unit 5: prediction lock cannot be bypassed.
5. After Unit 6: scoring rules are deterministic and leaderboards are pool-scoped.
6. After Unit 7: admin override creates audit event and recalculates scores.
7. After Unit 9: auth email templates/config are versioned and Supabase+Resend SMTP is documented.
8. After Unit 10: users can opt into push, change preferences, receive allowed event types, and avoid duplicate sends.
