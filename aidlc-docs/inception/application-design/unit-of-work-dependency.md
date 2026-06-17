# Unit of Work Dependencies

## Dependency Matrix

### Fase 1: Core MVP (Units 1–7)

| Unit | Depends On | Blocks | Notes |
|---|---|---|---|
| 1. Foundation | None | All user-specific units | Auth/profile identity is required everywhere |
| 2. UX Education | Unit 1 for authenticated onboarding | Improves adoption, but not all backend units | Standalone per user preference |
| 3. Pools | Unit 1 | Predictions, Rankings | First user-facing milestone |
| 4. Competition Data/API Sync | Seed data can start independently; auth needed for admin sync views later | Predictions, Scoring, Admin | API sync and admin override are separated |
| 5. Predictions | Units 1, 4; Unit 3 for pool context | Scoring | Requires match lock semantics |
| 6. Scoring/Rankings | Units 3, 4, 5 | Admin observability, leaderboard polish, notifications | Scoring engine before full leaderboard UI |
| 7. Admin/Observability | Units 1, 3, 4, 6 | None | Full admin later, includes pool progress visibility |

### Fase 2: Post-Construction Iterative Refines (Units 8–38)

| Unit | Depends On | Blocks | Notes |
|---|---|---|---|
| 8. Design System/UI Polish | Units 1–7 | None | Cross-cutting presentation refine; no behavior changes |
| 9. Transactional Email | Units 1, 8 | Unit 10 only for shared notification preferences vocabulary | Cross-cutting email config/templates; no new runtime deps |
| 10. Web Push Notifications | Units 1, 3, 4, 6, 9 | None | Additive; consumes events and user preferences |
| 11. App Shell & Navigation | Units 1, 8 | None | UI-only; reuses `signOut()`, `ThemeToggle`, `BrandToggle`, `Avatar`, `getProfile()` |
| 12. Auth/Profile/Onboarding/Landing Refine | Units 1, 2, 8, 11 | Units 13, 15 | Refines auth flows; no schema changes |
| 13. Pool Invitations Refine | Units 3, 10, 12 | Unit 15 | Refines invitation flows + push integration |
| 14. Global Ranking & Rules Refine | Units 2, 6 | Unit 15 | Adds global ranking + penalty rules |
| 15. Landing·Reglas·Perfil·Auth·Calculadora | Units 2, 12, 13, 14 | Units 16, 17 | 16 bugs; migración `onboarding_completed` |
| 16. Onboarding Gate & Fixture Order | Unit 15 | Unit 17 | Defense in depth + fixture ordering; resolves CF-8 |
| 17. Rules/Avatar/Nickname Consistency | Units 15, 16 | None | Upload collision fix + case-insensitive nickname; migración `nickname_change_count` |
| 18. Landing CTA Copy | Unit 15 | None | Documental; "Crea mi Liga" → "Entra a Jugar" |
| 19. Email Change Single Confirm | Unit 15, CF-9 | None | Security tradeoff; secure email change disabled |
| 20. Passkey Native API | Unit 1, CF-10 | Unit 38 | Migrates `@simplewebauthn` → native Supabase passkey API |
| 21. Account Deletion Auth Purge | Unit 1 | None | Conformance fix; `auth.admin.deleteUser()` |
| 22. Performance Recommendations | Units 1–21 | Units 26, 27, 37 | Analysis only; findings deferred to implementation phases |
| 23. Join Anytime (No Freeze) | Unit 3 | None | Removes competition freeze gates on membership |
| 24. i18n Language Selection | Units 1–23 | None | Transversal; migración `profiles.locale` |
| 25. Football-Data Sync | Unit 4 | Units 28, 29 | Real provider against football-data.org |
| 26. Performance Phase 1 | Units 1–25 | None | Quick wins: `select`, `Promise.all`, connection_limit, FK indexes |
| 27. Performance Phase 2 | Units 1–26 | None | Structural: `revalidate`, N+1 fix, `React.cache`, more indexes |
| 28. Sync Match Persistence | Units 4, 25 | Unit 29 | Orquestador persiste matches; `syncMatchesToDB()` |
| 29. Seed Matches from football-data.org | Units 25, 28 | None | `seedMatchesFromFootballData()` + snapshot fallback |
| 30. Past Matches Filter | Units 2, 5 | None | UI-only; client-side toggle |
| 31. Revert Override Rescore | Units 6, 7 | None | `revertMatchOverride` + `scoreMatch` |
| 32. Seed Team Reconciliation | Unit 4 | None | `reconcileSeedTeam()` for duplicate FIFA codes |
| 33. Extracción de equipos desde API | Units 25, 29, 32 | None | Code merged into Units 29/32 dirs |
| 34. Admin Match FIFA Codes | Unit 7 | None | UI-only; `fifaCode` labels in `/admin/matches` |
| 35. Cache Invalidation After Admin Mutations | Units 7, 22, 31 | None | `revalidateResultViews()` helper |
| 36. Scoring Accumulative | Units 2, 6, 14 | None | Rule change: additive scoring |
| 37. Performance Phase 3 | Units 22, 26, 27 | None | `getClaims`, hook, leaderboard cache, cold-start; migración `auth_access_token_hook` |
| 38. Passkey Security Management | Units 1, 20 | None | List/delete/register passkeys in `/settings/security` |

---

## Critical Path

```text
Foundation (1) ──────────────────────────────────────────────────────────────┐
  ├── Pools (3) ─────────────┐                                                │
  ├── UX Education (2) ──────┤                                                │
  ├── Competition Data (4) ──┤                                                │
  │   └── Football-Data (25)─┤                                                │
  │       └── Sync Match (28)┤                                                │
  │           └── Seed (29)──┤                                                │
  ├── Predictions (5) ───────┤                                                │
  ├── Scoring (6) ───────────┤                                                │
  ├── Admin (7) ─────────────┤                                                │
  │   └── FIFA Codes (34)────┤                                                │
  └── (all above) ───────────┤                                                │
      ├── Design System (8)──┤                                                │
      ├── Email (9) ─────────┤                                                │
      ├── Push (10) ─────────┤                                                │
      ├── Refines (12–21)────┤                                                │
      ├── Perf Analysis (22)─┤                                                │
      ├── Join Anytime (23)──┤                                                │
      ├── App Shell (11)─────┤                                                │
      ├── i18n (24) ─────────┤                                                │
      ├── Perf P1 (26) ──────┤                                                │
      ├── Perf P2 (27) ──────┤                                                │
      ├── Past Filter (30)───┤                                                │
      ├── Revert Rescore (31)┤                                                │
      ├── Team Reconcile (32)┤                                                │
      ├── Cache Fix (35) ────┤                                                │
      ├── Scoring Acc. (36)──┤                                                │
      ├── Perf P3 (37) ──────┤                                                │
      └── Passkey Mgmt (38)──┘                                                │
```

---

## Parallelization Opportunities

- **Fase 1**: Unit 2 can proceed after Unit 1 while Unit 3 starts. Unit 4 seed data can start in parallel with Unit 3 if schema decisions are stable. Unit 7 dashboard read-only pool visibility can begin after Units 3 and 4, but overrides should wait until Unit 6.
- **Fase 2 early refines (8–10)**: Design system, email, and push can develop in parallel against stable Units 1–7.
- **Fase 2 bug refines (12–17)**: Batched; 12–14 analyzed together, 15–17 sequential due to cumulative dependencies.
- **Fase 2 feature refines (22–27)**: Performance analysis (22) informed two implementation phases (26, 27); i18n (24) ran independently.
- **Fase 2 gap refines (28–35)**: Sequential due to infrastructure dependencies (25→28→29; 25→29→33→32).
- **Fase 2 final refines (36–38)**: Independent of each other; scoring (36) touches Units 2/6, performance P3 (37) touches auth/caching, passkey (38) touches auth UI.

---

## Coordination Points

- **Profile identity**: nickname/avatar fields consumed by pool and ranking views.
- **Competition/match IDs**: required by predictions and scoring.
- **Prediction immutability**: required by scoring and future crypto readiness.
- **Score breakdown schema**: required by rankings, UX explanations, and admin inspection.
- **Admin override audit**: touches competition result and scoring recalculation.
- **Cache invalidation (Unit 35)**: centralized in `revalidateResultViews()`, consumed by `forceResult`, `revertOverride`, `triggerSync`.
- **Performance phases**: 22 (analysis) → 26 (phase 1) → 27 (phase 2) → 37 (phase 3: auth claims + leaderboard cache + cold-start).
- **Notification event hooks**: Unit 3 invitations, Unit 4 status/score transitions, and Unit 6 ranking recalculation must emit deduplicatable notification events without changing their approved core behavior.
- **Push payload privacy**: push payloads must be generic/minimal; detailed private data is fetched after authenticated navigation.
- **Seed/sync pipeline**: `FootballDataProvider` (Unit 25) → `syncMatchesToDB` (Unit 28) → `seedMatchesFromFootballData` (Unit 29) → equipo extraction (Unit 33, merged) → team reconciliation (Unit 32).

---

## Testing Checkpoints

1. After Unit 1: auth/profile/nickname/avatar lifecycle works.
2. After Unit 3: verified user can create/join pools.
3. After Unit 4: seed fixture and API sync produce normalized matches.
4. After Unit 5: prediction lock cannot be bypassed.
5. After Unit 6: scoring rules are deterministic and leaderboards are pool-scoped.
6. After Unit 7: admin override creates audit event and recalculates scores.
7. After Unit 8: theme/brand switching works across all screens, AA contrast, 111 tests green.
8. After Unit 9: auth email templates/config are versioned and Supabase+Resend SMTP is documented.
9. After Unit 10: users can opt into push, change preferences, receive allowed event types, and avoid duplicate sends.
10. After Unit 15: onboarding gate enforces email confirmation + profile completion; login/register with react-hook-form; 163/163 tests.
11. After Unit 16: onboarding enforced in depth (Prisma gate + layout redirect); fixture ordered by day with UTC; 173/173 tests.
12. After Unit 17: avatar uploads collision-free; nickname case-insensitive; grace period post-onboarding; 179/179 tests.
13. After Unit 20: passkey registration/sign-in works with native Supabase API; `@simplewebauthn/browser` removed.
14. After Unit 21: account deletion purges `auth.users` via Admin API; email liberated.
15. After Unit 24: app renders in `es` and `en`; cookie + `profiles.locale` persistence; Rules Center bilingual.
16. After Units 26–27: navigation <300ms TTFB; 207/207 tests; `connection_limit` 3; FK + profile + sync run indexes.
17. After Units 28–29: sync persists matches to DB; seed idempotent from football-data.org with snapshot fallback.
18. After Unit 35: cache invalidated immediately after admin mutations; no double-refresh needed.
19. After Unit 36: additive scoring with breakdown; `BRA 2-1 vs BRA 3-2 = 3 points`; 255/255 tests.
20. After Unit 37: `getClaims` eliminates GoTrue round-trips; leaderboard cached; `connection_limit` 5; 258/258 tests.
21. After Unit 38: passkey list/delete/register in `/settings/security`; 265/265 tests.
