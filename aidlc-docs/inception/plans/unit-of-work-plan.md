# Unit of Work Plan

## Purpose

Decompose the quiniela SaaS into development units that are small enough to design, build, and verify independently while preserving correct cross-unit sequencing.

## Proposed Decomposition Approach

The application remains a **single Next.js monolith** deployed to Vercel, with logical modules and Supabase/Supabase Edge components. Units are development slices, not independently deployable microservices.

**Evolution**: The original plan defined 7 core units. Through iterative `/aidlc-refine` cycles, the project grew to **38 units** in two phases:

1. **Fase 1 — Core MVP** (Units 1–7): Foundation, Competition Data, Pools, Predictions, Scoring, Admin, UX Education. Built sequentially with full AI-DLC inception through construction.
2. **Fase 2 — Iterative Refines** (Units 8–38): Design system, email, push notifications, app shell, auth/profile/pool/ranking refines, onboarding gate, copy, passkeys, account deletion, performance (3 fases), i18n, football-data sync, cache fixes, seed/sync gaps, admin UX, and scoring rule changes. Added via `/aidlc-refine` and `/aidlc-start` without restarting approved stages.

## Plan Checklist

- [x] Confirm unit decomposition decisions through the questions below
- [x] Generate `aidlc-docs/inception/application-design/unit-of-work.md` with unit definitions and responsibilities
- [x] Generate `aidlc-docs/inception/application-design/unit-of-work-dependency.md` with dependency matrix
- [x] Generate `aidlc-docs/inception/application-design/unit-of-work-story-map.md` mapping stories to units
- [x] Document greenfield code organization strategy in `unit-of-work.md`
- [x] Validate unit boundaries and dependencies
- [x] Ensure all stories are assigned to units
- [x] Update plan to reflect all 38 units (this document, 2026-06-17)

---

## Fase 1: Core MVP (Units 1–7)

Original decomposition built sequentially through full AI-DLC inception → construction.

1. **Foundation: Auth, Profile, Nickname, Avatar**
2. **Competition Data and API Sync**
3. **Pools and Membership**
4. **Predictions and Match Locking**
5. **Scoring and Pool Rankings**
6. **Admin and Observability**
7. **UX Education and Onboarding**

---

## Fase 2: Post-Construction Iterative Refines (Units 8–38)

All added via `/aidlc-refine` or `/aidlc-start`, without restarting approved stages. Each unit has its own construction directory under `aidlc-docs/construction/unit-N-*`.

| # | Unit | Categoría | Entry Mode |
|---|------|-----------|------------|
| 8 | Design System & UI Polish | Visual / Cross-cutting | refina |
| 9 | Transactional Email | Infrastructure | refina |
| 10 | Web Push Notifications | Feature | refina |
| 11 | App Shell & Navigation | UI | aidlc-plan |
| 12 | Auth, Profile, Onboarding, Landing Refine | Bug fix / UX | refina |
| 13 | Pool Invitations Refine | Bug fix / UX | refina |
| 14 | Global Ranking & Rules Refine | Feature | refina |
| 15 | Landing·Reglas·Perfil·Auth·Calculadora | Bug fix (16 bugs) | refina |
| 16 | Onboarding Gate & Fixture Order | Bug fix / UX | refina |
| 17 | Rules, Avatar Upload, Nickname Consistency | Bug fix / UX | refina |
| 18 | Landing CTA Copy | Copy / Documental | refina |
| 19 | Email Change Single Confirmation | Security / UX | refina |
| 20 | Passkey Native API | Security / Bug fix | refina |
| 21 | Account Deletion Auth Purge | Security / Bug fix | refina |
| 22 | Performance Recommendations | Analysis | refina |
| 23 | Join Anytime (No Freeze) | Feature change | refina |
| 24 | i18n Language Selection | Feature | refina |
| 25 | Football-Data Sync | Infrastructure | refina |
| 26 | Performance Phase 1 — Quick Wins | Performance | refina |
| 27 | Performance Phase 2 — Structural | Performance | refina |
| 28 | Sync Match Persistence | Bug fix / Gap | aidlc-build |
| 29 | Seed Matches from football-data.org | Infrastructure | aidlc-start |
| 30 | Past Matches Filter | UI | aidlc-start |
| 31 | Revert Override Rescore | Bug fix | aidlc-start |
| 32 | Seed Team Reconciliation | Bug fix | refina |
| 33 | Extracción de equipos desde API | Bug fix / Gap | refina |
| 34 | Admin Match FIFA Codes | UI | refina |
| 35 | Cache Invalidation After Admin Mutations | Bug fix | refina |
| 36 | Scoring Accumulative | Feature change | refina |
| 37 | Performance Phase 3 — Auth Claims + Caches | Performance | refina |
| 38 | Passkey Security Management | Feature / UX | refina |

### Notas sobre Fase 2

- Units 12–17: Refines iterativos de bugs reportados en uso real del MVP.
- Units 18–21: Refines de seguridad y copy detectados en producción.
- Units 22–27: Análisis de performance + implementación progresiva en 3 fases.
- Units 28–35: Gaps de sync, seed, cache y admin UX.
- Units 36–38: Cambios de reglas de scoring y cierre de gaps funcionales.
- Unit 33 (Extracción de equipos desde API): sin directorio de construcción propio; sus artefactos se fusionaron en Unit 29 y Unit 32.

---

## Decomposition Questions

Please complete every `[Answer]:` field before I generate the unit artifacts.

### Question 1
Should UX Education and Onboarding be a standalone unit or merged into the Foundation unit?

A) Standalone unit to keep onboarding/rules/screen contracts explicit
B) Merge into Foundation to reduce unit count
C) Split UX across every feature unit instead of one dedicated unit
X) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question 2
Should Admin and Observability be built early or late?

A) Early, immediately after Competition Data/API Sync, so sync failures and overrides are supported during development
B) Late, after core user flows are complete
C) Minimal admin early, full observability later
X) Other (please describe after [Answer]: tag below)

[Answer]: Es la B, pero se tiene que considerar que también se puede ver el como van los pools privados y públicos.

### Question 3
For implementation sequencing, which user-facing milestone should come first?

A) A user can sign up, complete profile, create/join a pool
B) A user can view fixture and submit predictions without pools first
C) End-to-end thin slice: sign up, join one seed pool, predict one seed match, see score
X) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question 4
How should the code organization be structured inside the monolith?

A) Feature-first modules under `src/features/{auth,profile,competition,pools,predictions,scoring,admin,ux}`
B) Layer-first folders under `src/{actions,components,lib,services,data}`
C) Hybrid: feature-first for domain modules, shared primitives in `src/components` and `src/lib`
X) Other (please describe after [Answer]: tag below)

[Answer]: C

### Question 5
Should API-Football sync and admin manual override be in the same unit or separate units?

A) Same unit because both affect competition data integrity
B) Separate units: sync first, admin override later
C) Sync is a unit, manual override belongs to Admin and Observability
X) Other (please describe after [Answer]: tag below)

[Answer]: B

### Question 6
Should v1 include seed/demo data before real API sync is available?

A) Yes, seed World Cup-like data for development and tests
B) No, only real API data
C) Minimal seed data only for tests, not local demo UX
X) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question 7
Should scoring be implemented before full pool UX?

A) Yes, scoring engine should be built and tested before leaderboard UI
B) No, build pool UX first and add scoring later
C) Build a thin leaderboard placeholder first, then scoring engine
X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Recommended Implementation Sequence

1. Unit 1: Foundation — Auth, Profile, Nickname, Avatar
2. Unit 2: UX Education and Onboarding
3. Unit 3: Pools and Membership
4. Unit 4: Competition Data and API Sync
5. Unit 5: Predictions and Match Locking
6. Unit 6: Scoring and Pool Rankings
7. Unit 7: Admin and Observability
8. Unit 8: Design System and UI Polish _(post-construction refine; cross-cutting)_
9. Unit 9: Transactional Email _(post-construction refine; cross-cutting; no new deps)_
10. Unit 10: Web Push Notifications _(post-construction refine; event-driven; free baseline)_
11. Unit 12: Auth, Profile, Onboarding, Landing Refine _(post-construction bugs)_
12. Unit 13: Pool Invitations Refine _(post-construction bugs)_
13. Unit 14: Global Ranking & Rules Refine _(post-construction feature)_
14. Unit 15: Landing·Reglas·Perfil·Auth·Calculadora _(16 bugs post-construction)_
15. Unit 16: Onboarding Gate & Fixture Order _(post-construction bugs)_
16. Unit 17: Rules, Avatar Upload, Nickname Consistency _(post-construction bugs)_
17. Unit 18: Landing CTA Copy _(documental)_
18. Unit 19: Email Change Single Confirmation _(post-construction security)_
19. Unit 20: Passkey Native API _(post-construction bug)_
20. Unit 21: Account Deletion Auth Purge _(post-construction bug)_
21. Unit 22: Performance Recommendations _(análisis)_
22. Unit 23: Join Anytime (No Freeze) _(post-construction feature change)_
23. Unit 11: App Shell & Navigation _(post-construction UI; reuses primitives)_
24. Unit 24: i18n Language Selection _(post-construction feature)_
25. Unit 25: Football-Data Sync _(post-construction infrastructure)_
26. Unit 26: Performance Phase 1 — Quick Wins _(post-construction performance)_
27. Unit 27: Performance Phase 2 — Structural _(post-construction performance)_
28. Unit 28: Sync Match Persistence _(post-construction gap)_
29. Unit 29: Seed Matches from football-data.org _(post-construction infrastructure)_
30. Unit 30: Past Matches Filter _(post-construction UI)_
31. Unit 31: Revert Override Rescore _(post-construction bug)_
32. Unit 32: Seed Team Reconciliation _(post-construction bug)_
33. Unit 33: Extracción de equipos desde API _(post-construction gap; merged into Unit 29/32)_
34. Unit 34: Admin Match FIFA Codes _(post-construction UI)_
35. Unit 35: Cache Invalidation After Admin Mutations _(post-construction bug)_
36. Unit 36: Scoring Accumulative _(post-construction rule change)_
37. Unit 37: Performance Phase 3 — Auth Claims + Caches _(post-construction performance)_
38. Unit 38: Passkey Security Management _(post-construction feature)_

### Execution Notes

- Units 12–14 were batched together and verified as a group (163 tests).
- Units 22–23 + 11 + 24 were built in parallel/semi-parallel due to low dependency overlap.
- Units 26–27 were implemented together as two phases of the same performance epic.
- Unit 33 code was merged into Unit 29 and Unit 32 directories; no standalone construction directory.
- All 38 units are COMPLETE and verified as of 2026-06-17: **265/265 tests**, `pnpm build` OK.

---

## Security Notes

- Units containing writes must define validation and authorization boundaries.
- Prediction and scoring units must preserve auditability for future crypto betting.
- Competition sync and admin override units must fail closed and produce audit events.
- Security Baseline extension is **enabled** and enforced across all units.
- Property-Based Testing extension is **disabled**.
- CF-9: Single email confirmation (Secure email change disabled; tradeoff accepted).
- CF-10: Passkey native API adopted (Supabase experimental, RP ID = production domain).
- Units 12–38 respect the constraint: no restart of already-approved stages.
