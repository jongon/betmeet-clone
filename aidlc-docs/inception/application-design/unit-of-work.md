# Units of Work

## Decomposition Strategy

The application remains a single Next.js monolith deployed to Vercel. Units are logical development slices inside the monolith, not independently deployable services.

## Code Organization Strategy

Use a hybrid structure:

```text
src/
├── app/                         # Next.js App Router routes
├── components/                  # shared UI primitives and shadcn/ui components
├── features/                    # domain feature modules
│   ├── auth/
│   ├── profile/
│   ├── ux-education/
│   ├── competition/
│   ├── pools/
│   ├── predictions/
│   ├── scoring/
│   └── admin/
├── lib/                         # shared utilities, env, validation, logging
├── generated/                   # generated Prisma client
└── types/                       # shared app types when not feature-local
```

Feature modules should own their server actions, schemas, services, and feature-specific components. Shared primitives stay in `src/components` and `src/lib`.

## Unit 1: Foundation - Auth, Profile, Nickname, Avatar

**Goal**: Enable users to authenticate and establish a public identity.

**Responsibilities**:
- Supabase Auth SSR setup.
- Email/password, Google OAuth, passkeys/MFA integration points.
- Profile creation linked to Supabase `auth.users`.
- Verification state: unverified, verified, administrator.
- Classic `nickname#1234` discriminator.
- Avatar source: Google photo, default avatar set, Supabase Storage upload.

**Primary Deliverable**: User can sign up, log in, complete profile, and see their public identity.

## Unit 2: UX Education and Onboarding

**Goal**: Make the rules and first-run experience understandable.

**Responsibilities**:
- Public rules summary and authenticated full Rules Center.
- Onboarding flow for nickname, avatar, rules, pool action, first next step.
- Contextual scoring explanations and in-app cues.
- Landing explanation of quiniela, pools, and scoring.

**Primary Deliverable**: User understands how to play before making predictions.

## Unit 3: Pools and Membership

**Goal**: Allow verified users to create, discover, join, and manage pools.

**Responsibilities**:
- Public/private pool creation.
- Public pool directory with search/filter.
- Invite links/codes for private pools.
- Capacity limit up to 100.
- Multiple pool membership per user.
- Pool admin member removal before first match only.

**Primary Deliverable**: First milestone from user answer: user can sign up, complete profile, and create or join a pool.

## Unit 4: Competition Data and API Sync

**Goal**: Provide the tournament, fixture, teams, and match states needed for predictions.

**Responsibilities**:
- World Cup-like seed/demo data for development and tests.
- Competition, phase, team, match, and match result models.
- API-Football adapter as default provider.
- Supabase Edge scheduled jobs for sync.
- Provider sync logs and error states.

**Primary Deliverable**: Fixture and match states are available without relying on manual setup.

## Unit 5: Predictions and Match Locking

**Goal**: Allow users to predict matches safely before kickoff.

**Responsibilities**:
- Submit/update score predictions before match start.
- Server-authoritative kickoff lock.
- Knockout penalty winner option only on tied predictions.
- Immutable prediction records once locked.

**Primary Deliverable**: User can predict available matches with correct lock behavior.

## Unit 6: Scoring and Pool Rankings

**Goal**: Calculate points and show pool standings.

**Responsibilities**:
- Deterministic scoring engine.
- Exact score 5 points.
- Correct winner/draw 2 points.
- One team score 1 point.
- Penalty winner bonus +1 in knockout.
- Pool-only leaderboard.
- Tied users share winner/rank state with no tiebreakers.

**Primary Deliverable**: Scores are computed before full leaderboard UI polish, then shown per pool.

## Unit 7: Admin and Observability

**Goal**: Provide global administrators operational visibility and fallback controls.

**Responsibilities**:
- Build late after core user flows.
- Show sync status and sync failures.
- Show how public and private pools are progressing.
- Global-admin-only manual result override.
- Trigger recalculation after overrides.
- Audit events for sensitive admin actions.
- Full observability can mature after MVP.

**Primary Deliverable**: Admin can inspect system state and safely correct match result issues.

## Unit 8: Design System and UI Polish

**Goal**: Give the product a distinctive, modern, accessible visual identity backed by a robust, themeable design system — without rewriting feature components.

**Responsibilities**:
- Added post-construction via `/aidlc-refine` (cross-cutting; does not change Units 1–7 behavior).
- Three-layer token architecture (primitive → semantic → component) in `src/app/globals.css`, building on the existing `@theme inline` + CSS-variable setup.
- Two orthogonal theming axes: brand/personality (`data-theme`: `deportivo` default | `moderno` | `premium`) and color scheme (`.dark`: light | dark), so the visual personality is switchable without touching components.
- Default brand: "deportivo/enérgico" identity (energetic palette + display typography aligned to the football domain).
- Brand selector (context + `data-theme` on `<html>` + anti-FOUC script) alongside the existing `next-themes` light/dark toggle.
- Component variant refinements (`src/components/ui/*`) only where new tokens require it; polish of anchor screens (landing, pools, matches/predictions, rankings).
- Accessibility: AA contrast across all brand × scheme combinations, visible focus, keyboard-navigable theme/brand controls.

**Primary Deliverable**: A coherent, themeable UI where the brand personality and light/dark scheme can switch at runtime, with no regression to the 111 passing tests.

## Recommended Implementation Sequence

1. Unit 1: Foundation - Auth, Profile, Nickname, Avatar
2. Unit 2: UX Education and Onboarding
3. Unit 3: Pools and Membership
4. Unit 4: Competition Data and API Sync
5. Unit 5: Predictions and Match Locking
6. Unit 6: Scoring and Pool Rankings
7. Unit 7: Admin and Observability
8. Unit 8: Design System and UI Polish (post-construction refine; cross-cutting)

## Security Notes

- Units 1, 3, 5, 6, and 7 contain sensitive writes and must define validation, authorization, and RLS boundaries.
- Unit 5 and Unit 6 must preserve immutable prediction/scoring data for future crypto betting.
- Unit 7 must require audit reasons for manual result overrides.
