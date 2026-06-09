# Application Design Plan

## Purpose

Define the high-level application architecture for the quiniela SaaS before implementation. This plan covers component boundaries, service orchestration, dependencies, UX screen contracts, and security constraints.

## Plan Checklist

- [x] Confirm open application design decisions through the questions below
- [x] Generate `aidlc-docs/inception/application-design/components.md`
- [x] Generate `aidlc-docs/inception/application-design/component-methods.md`
- [x] Generate `aidlc-docs/inception/application-design/services.md`
- [x] Generate `aidlc-docs/inception/application-design/component-dependency.md`
- [x] Generate `aidlc-docs/inception/application-design/screen-contracts.md`
- [x] Generate `aidlc-docs/inception/application-design/application-design.md`
- [x] Validate design consistency against requirements, stories, workflow plan, and SECURITY rules

## Proposed Component Areas

1. **Auth & Session**: Supabase Auth, Google OAuth, email verification, account linking, MFA, Passkeys.
2. **Profile & Identity**: Profile, nickname discriminator, avatar selection/upload, user verification state.
3. **Competition Data**: Competitions, phases, teams, fixtures, match status, knockout unlocks.
4. **External Football API Adapter**: API-Football or selected provider abstraction, sync state, retries, admin fallback.
5. **Pools & Membership**: Public/private pools, invite links, membership limits, admin removal rules.
6. **Predictions**: Match predictions, editing until kickoff, penalty winner selection, immutable snapshots.
7. **Scoring & Rankings**: Deterministic points calculation, penalty bonus, per-pool leaderboard, tied winners.
8. **Notifications**: Auth emails via Supabase, business notifications later, optional push support.
9. **Admin Console**: Sync monitoring, manual override, user/system supervision.
10. **UX Education Layer**: Landing, onboarding, rules center, contextual scoring explanations, score breakdown.

## Design Questions

Please complete every `[Answer]:` field before I generate Application Design artifacts.

### Question 1
For Supabase client usage, which approach do you prefer?

A) Use the official Supabase SSR helpers for Next.js App Router and keep Prisma for domain DB access
B) Use Supabase client for auth only and Prisma for all domain data access
C) Use Supabase client for auth and selected RLS-protected reads, Prisma for writes/server actions
X) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question 2
For external football data, should the design assume API-Football as the default provider for v1?

A) Yes, use API-Football as default provider with an adapter interface
B) No, keep provider abstract and decide during implementation
C) Use manual/admin-loaded fixture data first, then add external API sync later
X) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question 3
How should match result sync be triggered in v1?

A) Scheduled polling from Vercel Cron Jobs
B) Supabase Edge Functions plus scheduled jobs
C) Admin-triggered sync only for MVP
D) Hybrid: scheduled polling plus admin manual override
X) Other (please describe after [Answer]: tag below)

[Answer]: B

### Question 4
For avatar uploads, which storage target should Application Design assume?

A) Supabase Storage bucket for custom avatars
B) Vercel Blob storage
C) No custom uploads in MVP; only Google photo and default avatar set
X) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question 5
For the Discord-style nickname, which display format do you prefer?

A) `nickname#1234` classic discriminator style
B) `nickname-1234` simpler URL-safe suffix
C) Unique username without visible suffix unless duplicate exists
X) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question 6
How much of the Rules Center should be public before login?

A) Fully public so users understand the game before registering
B) Summary public, full rules after login
C) Fully private after login
X) Other (please describe after [Answer]: tag below)

[Answer]: B

### Question 7
For pool discovery, should public pools be searchable/browsable in v1?

A) Yes, public directory with search/filter
B) Yes, but only a simple list ordered by activity/size
C) No, MVP joins pools only by invite/link; public discovery comes later
X) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question 8
For notifications in v1, what should be included?

A) Auth emails only (verification/reset) plus in-app UI cues
B) Auth emails plus email reminders for upcoming matches
C) Auth emails, email reminders, and push notifications
X) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question 9
For admin manual result overrides, who can use the feature?

A) Global administrators only
B) Global administrators plus a future trusted operator role
C) Do not include manual overrides in MVP
X) Other (please describe after [Answer]: tag below)

[Answer]: A

### Question 10
For v2 crypto readiness, should v1 include wallet fields in the profile schema?

A) Yes, include nullable wallet address fields now
B) No, keep v1 schema clean and add wallet fields during v2
C) Include an extension table for future wallet identities, but do not expose UI
X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Security Considerations

The generated design must enforce:

- SECURITY-04: HTTP security headers through Next.js/Vercel middleware.
- SECURITY-05: Schema validation on all Server Actions/API boundaries.
- SECURITY-08: Supabase RLS plus application-level authorization and ownership checks.
- SECURITY-11: Rate limiting on public/auth-sensitive endpoints and abuse-case handling.
- SECURITY-13: Immutable prediction records after kickoff and audit-friendly result changes.
- SECURITY-15: Fail-closed behavior for auth, match sync, prediction locking, and scoring.
