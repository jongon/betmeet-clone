# Application Design

## Summary

The application is a Next.js 16 App Router SaaS for football quinielas. It uses Supabase Auth for identity, Supabase PostgreSQL for data, Prisma for domain persistence, Supabase Storage for avatars, Supabase Edge scheduled jobs for football data sync, and Vercel for app deployment.

## Key Design Decisions

| Area | Decision |
|---|---|
| Supabase usage | Official Supabase SSR helpers for Next.js App Router; Prisma for domain DB access |
| Football provider | football-data.org as v1 default behind adapter interface (era API-Football; migrado en Unit 25) |
| Match sync | Supabase Edge Functions plus scheduled jobs |
| Avatar storage | Supabase Storage bucket |
| Nickname format | Classic `nickname#1234` discriminator |
| Rules Center | Summary public, full rules after login |
| Public pools | Searchable/browsable public directory in v1 |
| Notifications | Auth emails only plus in-app UI cues in v1 |
| Admin overrides | Global administrators only |
| Crypto v2 readiness | No wallet fields in v1; add during v2 |

## Architecture

The system is organized into ten component areas:

1. Auth & Session
2. Profile & Identity
3. Competition Data
4. External Football API Adapter
5. Pools & Membership
6. Predictions
7. Scoring & Rankings
8. Notifications
9. Admin Console
10. UX Education Layer

## Service Layer

Server Actions coordinate user-triggered mutations. Server components and route handlers perform reads where appropriate. Prisma is the domain persistence layer. Supabase SSR helpers handle auth/session and Supabase Edge scheduled jobs handle background sync.

## UX Layer

Application Design includes screen contracts for:

- Landing / Public Home
- Onboarding
- Rules Center
- Match Prediction Screen
- Pool Detail
- Pool Invite / Join
- Leaderboard
- Profile / Avatar / Nickname
- Admin Sync Dashboard

These contracts ensure users learn scoring, pools, prediction locks, and rankings while progressing through the product.

## Security Compliance

- **SECURITY-04**: Security headers must be implemented in middleware/deployment config.
- **SECURITY-05**: All Server Actions and route handlers require schema validation.
- **SECURITY-08**: Supabase RLS and application ownership checks both apply.
- **SECURITY-11**: Public endpoints need rate limiting and misuse-case handling.
- **SECURITY-13**: Predictions become immutable after kickoff; manual result overrides require audit reason.
- **SECURITY-15**: Auth, sync, prediction locking, and scoring must fail closed.

## Artifact Index

- `components.md`: Component definitions and responsibilities.
- `component-methods.md`: High-level method signatures.
- `services.md`: Service definitions and orchestration patterns.
- `component-dependency.md`: Dependencies and data flows.
- `screen-contracts.md`: UX contracts for primary surfaces.
