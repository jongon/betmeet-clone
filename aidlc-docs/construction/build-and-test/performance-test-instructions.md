# Performance Test Instructions — Unit 41

## Purpose
Validate that the new `getPoolMemberPredictions` query and `PoolPredictionsView` component do not introduce performance regressions.

## Performance Requirements
- **Query response** (worst case: 100 members × 64 matches): < 500ms (cold), < 100ms (warm via connection pool)
- **Page render** with predictions tab: no slower than existing `/pools/[id]` (only marginal overhead from extra query in `Promise.all`)
- **No new N+1 queries**: the query fetches all predictions in a single `findMany` call

## Setup Performance Test Environment
- **Database**: Supabase PostgreSQL 18 via Supavisor pooler
- **Connection pool**: `DB_CONNECTION_LIMIT = 5` (same as production)

## Test Parameters
- **Pool size**: 100 members (max capacity)
- **Matches started**: 64 (full World Cup)
- **Predictions**: 100 members × 64 matches = 6,400 prediction rows

## Run Performance Tests

### 1. Query Performance
Monitor query execution time via Prisma query logging:
```bash
DEBUG="prisma:query" pnpm dev
```
Navigate to `/pools/[id]` and observe query durations.

### 2. Page Load Time
Use browser DevTools or Lighthouse:
- Check `/pools/[id]` — TTFB should not increase significantly
- Check network tab: verify only one DB query for predictions

### 3. Cold Start
- Deploy to Vercel and measure cold start with `DB_CONNECTION_LIMIT = 5`
- Target: < 2s total cold start (including bundle compilation + DB connect)

## Performance Optimization Notes
- Query uses indexed columns: `Prediction.userId`, `Match.kickoffAt`, `PoolMembership(poolId, userId)`
- No over-fetching: `select` limits on `user` and `score` relations
- `Promise.all` parallelizes pool detail + leaderboard + predictions fetches
- Component is server-rendered: no client hydration overhead for the table

## Status
Performance testing is deferred — the current scope is Unit 41 feature delivery. Query is read-only, single `findMany` with indexes, and parallelized with existing queries. No performance regressions expected.
