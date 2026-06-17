# Unit 41 — Code Generation Plan: Predicciones visibles dentro del pool

## Unit Context

- **Requirement**: FR-REFINE-41.1–41.5 (Épica 41)
- **Story**: US-41.1 — Ver predicciones de otros miembros del pool
- **Dependencies**: Unit 3 (Pools), Unit 5 (Predictions), Unit 6 (Scoring), Unit 16 (fixture-by-day pattern)
- **DB Entities**: `Prediction`, `PredictionScore`, `Match`, `PoolMembership`, `Profile` (read-only, no new entities)
- **No schema/migration changes** — reuses existing models

## File Manifest

| Step | File | Action | Type |
|------|------|--------|------|
| 1 | `src/i18n/dictionaries/es.ts` | Modify | i18n |
| 2 | `src/i18n/dictionaries/en.ts` | Modify | i18n |
| 3 | `src/features/pools/types.ts` | Modify | Domain types |
| 4 | `src/features/pools/queries.ts` | Modify | Query |
| 5 | `src/features/pools/components/pool-predictions-view.tsx` | Create | Component |
| 6 | `src/app/(app)/pools/[id]/page.tsx` | Modify | Page |
| 7 | `src/features/pools/__tests__/pool-predictions.test.ts` | Create | Test |
| 8 | Verification: tsc + Biome + ESLint + vitest + build | — | Quality |

---

## Steps

### Step 1: Add i18n keys (ES) — `src/i18n/dictionaries/es.ts`
- [x] Add `predictions` sub-object under `pools:` before the closing `},` at line 386
- [x] Keys: `tab`, `dayLabel`, `memberHeader`, `noPrediction`, `pendingScore`, `emptyTitle`, `emptyDescription`
- [x] Values in Spanish per functional design §6

### Step 2: Add i18n keys (EN) — `src/i18n/dictionaries/en.ts`
- [x] Add `predictions` sub-object under `pools:` at corresponding location
- [x] Keys same as ES; values in English per functional design §6

### Step 3: Add domain types — `src/features/pools/types.ts`
- [x] Add `PoolMemberPrediction` interface (functional design §2.1)
- [x] Add `PoolPredictionsViewProps` interface (functional design §2.2)

### Step 4: Implement query — `src/features/pools/queries.ts`
- [x] Add `getPoolMemberPredictions(poolId: string): Promise<PoolMemberPrediction[] | null>`
- [x] Membership gate: `getCurrentUserId()` + `prisma.poolMembership.findUnique`
- [x] Fetch predictions where `userId IN memberIds` AND `match.kickoffAt <= now`
- [x] Include: match (with homeTeam, awayTeam, phase), user (nickname/avatar), score (totalPoints, matchedCase)
- [x] Transform to `PoolMemberPrediction[]` using `toTeamView` + `formatNickname`
- [x] Order by match kickoffAt ascending

### Step 5: Create component — `src/features/pools/components/pool-predictions-view.tsx`
- [x] Create server component with `PoolPredictionsViewProps`
- [x] Group predictions by member within each UTC match day
- [x] For each day (chronological): render day header + scrollable table
- [x] Table: sticky left column (member avatar + nickname), match columns (fifaCode labels + scores if FINISHED)
- [x] Cells: prediction "X - Y" with points badge, or "—" for no prediction / pending scoring
- [x] Empty state when no matches started
- [x] Mobile: `overflow-x-auto` with `bg-background` on sticky column

### Step 6: Restructure page — `src/app/(app)/pools/[id]/page.tsx`
- [x] Add Tabs imports from `@/components/ui/tabs` and new component import
- [x] Fetch `getPoolMemberPredictions(id)` in `Promise.all` alongside existing queries
- [x] Restructure left column: wrap leaderboard/members in `<Tabs defaultValue="ranking">`
- [x] Add three tabs: "Clasificación" (default), "Predicciones", "Miembros"
- [x] Sidebar (InviteShare, DirectedInviteForm, PoolActions) stays outside tabs, unchanged
- [x] Each `TabsContent` renders existing or new content

### Step 7: Create tests — `src/features/pools/__tests__/pool-predictions.test.ts` (query) + component tests
- [x] Query tests: membership gate returns null, unknown pool returns null, non-member returns null
- [x] Query tests: predictions returned only for matches with `kickoffAt <= now`
- [x] Query tests: no predictions → empty array, member without prediction → null predictedHome/Away
- [x] Component test: renders day groups with correct headers
- [x] Component test: renders member rows with avatar + nickname
- [x] Component test: renders prediction cells and points badges
- [x] Component test: renders empty state when no predictions

### Step 8: Verification
- [x] `pnpm exec tsc --noEmit` — 0 errors
- [x] `pnpm exec biome check` on all touched `src/` files — clean
- [x] `pnpm exec eslint` on all touched `src/` files — 0 errors
- [x] `pnpm test` — all tests passing (281/281)
- [x] `pnpm build` — successful production build
