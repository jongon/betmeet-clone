# Performance Test Instructions — Unit 45

## Purpose

Unit 45 is a feature add, not a performance change. This document covers the minimal performance expectations and the queries that should remain fast.

## Performance Requirements

- **`getPoolDetail`** — must include `membersCanInvite` in `select` without breaking the existing N+1 (none) or `include` shape. The previous `include: { memberships: ... }` was replaced by `select: { ..., memberships: { include: { user: true }, orderBy: { joinedAt: "asc" } } }`. This is functionally equivalent; PostgreSQL still issues a single query.
- **`getMyPools`** — adds two columns (`type`, `membersCanInvite`) to the `select` of the joined `Pool`. No additional DB round-trip.
- **`updatePoolMembersCanInvite`** — two queries: `findUnique` (by PK) + `update` (by PK). Both indexed by `id`. No new indexes required.
- **`createPool`** — adds one column to the `data` of the `Pool.create` call. No additional queries.
- **`createDirectedInvite`** — adds two columns to the `select` of the `Pool.findUnique` call. No additional queries.

## Setup Performance Test Environment

Not required for Unit 45 (no perf-sensitive changes). The existing perf baseline is preserved.

## Run Performance Tests

Unit 45 does not introduce or change any perf-sensitive path. No additional performance tests are required.

If you want to verify the lack of regression at the query level, run the full Vitest suite and observe the suite duration:
```bash
pnpm test
```
**Expected**: no noticeable change vs the pre-Unit 45 baseline (≤ 1 second delta). The current full suite runs in ~3s; adding 23 tests with the same DB-mock overhead is well within tolerance.

## Performance Optimization

N/A for Unit 45.
