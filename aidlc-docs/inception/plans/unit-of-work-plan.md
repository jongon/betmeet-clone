# Unit of Work Plan

## Purpose

Decompose the quiniela SaaS into development units that are small enough to design, build, and verify independently while preserving correct cross-unit sequencing.

## Proposed Decomposition Approach

The application remains a **single Next.js monolith** deployed to Vercel, with logical modules and Supabase/Supabase Edge components. Units are development slices, not independently deployable microservices.

## Plan Checklist

- [x] Confirm unit decomposition decisions through the questions below
- [x] Generate `aidlc-docs/inception/application-design/unit-of-work.md` with unit definitions and responsibilities
- [x] Generate `aidlc-docs/inception/application-design/unit-of-work-dependency.md` with dependency matrix
- [x] Generate `aidlc-docs/inception/application-design/unit-of-work-story-map.md` mapping stories to units
- [x] Document greenfield code organization strategy in `unit-of-work.md`
- [x] Validate unit boundaries and dependencies
- [x] Ensure all stories are assigned to units

## Proposed Units

1. **Foundation: Auth, Profile, Nickname, Avatar**
2. **Competition Data and API Sync**
3. **Pools and Membership**
4. **Predictions and Match Locking**
5. **Scoring and Pool Rankings**
6. **Admin and Observability**
7. **UX Education and Onboarding**

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

## Recommended Dependency Order

Default recommendation if no changes are requested:

1. Foundation: Auth, Profile, Nickname, Avatar
2. Competition Data and API Sync
3. Pools and Membership
4. Predictions and Match Locking
5. Scoring and Pool Rankings
6. Admin and Observability
7. UX Education and Onboarding

## Security Notes

- Units containing writes must define validation and authorization boundaries.
- Prediction and scoring units must preserve auditability for future crypto betting.
- Competition sync and admin override units must fail closed and produce audit events.
