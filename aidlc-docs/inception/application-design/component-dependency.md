# Component Dependencies

## Dependency Matrix

| Component | Depends On | Used By |
|---|---|---|
| Auth & Session | Supabase Auth | Profile, Pools, Predictions, Admin |
| Profile & Identity | Auth & Session, Supabase Storage | Pools, Rankings, UX Education |
| Competition Data | Football API Adapter | Predictions, Scoring, Admin, UX |
| Football API Adapter | football-data.org, Supabase Edge Jobs | Competition Data, Admin |
| Pools & Membership | Profile, Competition Data | Rankings, Predictions |
| Predictions | Auth, Profile, Competition Data | Scoring, UX |
| Scoring & Rankings | Predictions, Competition Data, Pools | Leaderboard UI, Admin |
| Notifications | Auth, Competition Data, Predictions | UX cues |
| Admin Console | Auth, Competition Data, Sync, Scoring | Global admins |
| UX Education Layer | Rules content, Predictions, Scoring | Public and authenticated UI |

## Primary Data Flow

```text
football-data.org
  -> Football API Adapter
  -> Competition Data
  -> Match Result Update
  -> Scoring Service
  -> Pool Leaderboards
  -> User UI Score Breakdown
```

## Prediction Flow

```text
User Session
  -> Prediction Screen
  -> Prediction Service
  -> Competition Data checks match state
  -> Domain DB writes immutable prediction/update before kickoff
```

## Pool Flow

```text
Verified User
  -> Pool Service
  -> Create/Join Pool
  -> Membership stored
  -> Leaderboard scoped by pool
```

## Auth/Profile Flow

```text
Supabase Auth
  -> Auth callback
  -> Profile Service ensures profile
  -> Nickname/Avatar onboarding
  -> Verified user access
```

## Admin Override Flow

```text
Global Admin
  -> Admin Service
  -> Override Match Result
  -> Audit Event
  -> Recalculate Scores
  -> Refresh Pool Rankings
```

## Communication Patterns

- UI routes use server components for reads where possible.
- Mutations use Server Actions with schema validation.
- Domain persistence uses Prisma connected to Supabase PostgreSQL.
- Auth/session uses official Supabase SSR helpers.
- Background sync uses Supabase Edge scheduled jobs.
- RLS and server-side ownership checks both enforce authorization.
