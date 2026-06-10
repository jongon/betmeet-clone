# Unit 4: Competition Data and API Sync — Code Generation Summary

## Status
- **Result**: COMPLETE
- **Scope**: MVP implementation for competition data, seeded World Cup 2026 fixture foundation, provider sync foundation, local flag assets, `/matches` fixture UI, and Unit 3 lock integration.
- **Verification**: `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm check`, `pnpm check:flags`, and `pnpm build` passed.

## Implemented
- Added Prisma domain models and enums for competitions, phases, teams, matches, and provider sync runs.
- Added Supabase migration `20260610000006_create_competition_data.sql` with read-oriented competition tables, write restrictions for clients, and sync run support.
- Added `src/features/competition/` with typed view models, Zod schemas, fixture queries, freshness calculation, seed data, provider abstractions, API-Football status mapping, sync orchestration, and idempotent upsert services.
- Added idempotent seed script `pnpm seed:competition` and local flag validation script `pnpm check:flags`.
- Added local SVG flags for seeded teams under `public/flags/`.
- Added authenticated dynamic route `/matches` with fixture sections, status badges, stale banner, team badges, and empty/error-ready rendering.
- Integrated Unit 3 pool freeze logic with Unit 4 competition kickoff lookup, preserving environment fallback behavior.
- Added Supabase Edge Function scaffold at `supabase/functions/competition-sync/index.ts` for scheduled/manual sync runtime hardening.
- Added tests for status mapping, freshness logic, sync orchestration, flag coverage, and competition lock behavior.

## Notes
- API-Football integration is a foundation: provider normalization and sync orchestration are present, but the Edge Function scaffold does not yet share the full Next/Prisma service runtime.
- Seed data intentionally includes only known/reconciliable World Cup 2026 data and nullable placeholders where official details are not finalized.
- `/matches` is marked `force-dynamic` to avoid build-time database access and render fixture data on demand.

## Commands
- `pnpm seed:competition`: seed/update competition data after migrations.
- `pnpm check:flags`: validate every seeded `flagKey` has a local SVG asset.
- `API_FOOTBALL_KEY`: server-side provider key only; previews remain seed/mock unless explicitly configured.
