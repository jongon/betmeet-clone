# Components

## 1. Auth & Session Component

**Purpose**: Integrate Supabase Auth with Next.js App Router and enforce authenticated session access.

**Responsibilities**:
- Configure Supabase SSR helpers for server/client auth flows.
- Support email/password, Google OAuth, passkeys, optional MFA, reset password, email verification.
- Enforce session checks in server components, middleware, and server actions.
- Provide account-linking awareness for same-email identities.

**Interfaces**:
- Supabase Auth APIs.
- Next.js middleware.
- Profile & Identity component for post-auth profile creation.

## 2. Profile & Identity Component

**Purpose**: Maintain public user identity used across pools and leaderboards.

**Responsibilities**:
- Store application profile linked to `auth.users`.
- Generate and validate classic discriminator nicknames: `nickname#1234`.
- Manage avatar source: Google photo, default avatar set, or Supabase Storage upload.
- Track verification level: unverified, verified, administrator.

**Interfaces**:
- Auth & Session for user identity.
- Supabase Storage for custom avatars.
- Pools, Predictions, Rankings for display identity.

## 3. Competition Data Component

**Purpose**: Represent competitions, phases, teams, matches, match states, and knockout progression.

**Responsibilities**:
- Store FIFA World Cup 2026 fixture and future competitions.
- Model group stage and knockout phases.
- Unlock future matches only when teams are known.
- Maintain match lifecycle: scheduled, live, finished, postponed, cancelled.

**Interfaces**:
- External Football API Adapter for ingestion.
- Predictions for match lock status.
- Scoring for final result calculation.

## 4. External Football API Adapter Component

**Purpose**: Isolate football data provider details behind an adapter interface.

**Responsibilities**:
- Use football-data.org as v1 default provider (era API-Football; migrado en Unit 25).
- Normalize provider payloads into internal competition/match/team structures.
- Track sync attempts, failures, rate limits, and provider timestamps.
- Support provider replacement without changing domain services.

**Interfaces**:
- Supabase Edge scheduled jobs.
- Competition Data component.
- Admin Console for sync visibility and manual fallback.

## 5. Pools & Membership Component

**Purpose**: Manage public/private groups where users compete.

**Responsibilities**:
- Create pools with type, capacity up to 100, invite code/link.
- Support public pool discovery with search/filter.
- Allow one user to join multiple pools.
- Enforce member removal only before first match starts.

**Interfaces**:
- Profile & Identity for members.
- Rankings for pool leaderboard.
- Predictions for pool-scoped participation context.

## 6. Predictions Component

**Purpose**: Capture user predictions and preserve immutable competition records.

**Responsibilities**:
- Allow score predictions until server-authoritative kickoff.
- Allow knockout penalty winner selection only when predicted score is tied.
- Lock prediction mutation once match starts.
- Preserve prediction history for auditability and future crypto betting readiness.

**Interfaces**:
- Competition Data for match state and phase.
- Profile & Identity for user ownership.
- Scoring & Rankings for point calculation.

## 7. Scoring & Rankings Component

**Purpose**: Calculate deterministic points and rank users within each pool.

**Responsibilities**:
- Apply scoring rules: exact score 5; otherwise cumulative result 2 plus 1 point per team goal count matched; none 0.
- Add knockout penalty winner bonus of 1 when applicable.
- Recalculate scores after official results or admin override.
- Rank users by pool only, allowing tied positions as shared winners.

**Interfaces**:
- Predictions for submitted predictions.
- Competition Data for final result.
- Pools & Membership for leaderboard scope.

## 8. Notifications Component

**Purpose**: Provide configurable notification channels and UX cues.

**Responsibilities**:
- Rely on Supabase Auth for verification and reset emails.
- Provide in-app UI cues for upcoming matches, lock states, and score outcomes.
- Manage browser push subscriptions, user notification preferences, event outbox, and delivery attempts in Unit 10.
- Send v1 push events for match start, match finish, pool invitation, global ranking improvement, and live goal events.
- Use standard Web Push + VAPID as the v1 provider, behind an adapter interface so OneSignal/FCM/Novu can be added later.
- Deduplicate repeated events from sync/scoring retries and remove invalid subscriptions.

**Interfaces**:
- Auth & Session for auth emails.
- UX Education Layer for in-app cues.
- Pools & Membership for invitation events.
- Competition Data for match lifecycle and goal events.
- Scoring & Rankings for global ranking movement.

## 9. Admin Console Component

**Purpose**: Give global administrators operational visibility and safe fallback controls.

**Responsibilities**:
- Show football API sync status.
- Allow global-admin-only manual result override.
- Trigger score recalculation after result override.
- Surface errors, provider failures, and audit events.

**Interfaces**:
- External Football API Adapter.
- Competition Data.
- Scoring & Rankings.

## 10. UX Education Layer Component

**Purpose**: Teach rules and guide users through the app without blocking play.

**Responsibilities**:
- Explain quiniela, scoring, pools, and match locks.
- Provide summary-public and full-authenticated Rules Center.
- Provide onboarding steps for nickname, avatar, rules, pool, first prediction.
- Show contextual scoring hints and score breakdowns.

**Interfaces**:
- Profile & Identity.
- Pools & Membership.
- Predictions.
- Scoring & Rankings.
