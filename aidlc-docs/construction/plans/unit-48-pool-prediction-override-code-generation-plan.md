# Code Generation Plan — Unit 48: Predicciones con override por pool

## Unit Context
- **Stories**: US-48.1 (ajustar prediccion para una liga), US-48.2 (ver predicciones + volver a global)
- **Dependencies**: Units 3 (membership validation), 5 (Prediction model/actions/queries), 6 (scoring/leaderboard), 41 (PoolPredictionsView)
- **Schema delta**: `predictions.pool_id` (FK nullable), partial unique indexes
- **Scope**: 3 NEW files + 16 MODIFIED files + 14 UNCHANGED files
- **Risk**: Medium (schema change + scoring resolution)

---

## Step 1: Prisma Schema — Prediction model
- [x] Add `poolId` field (`String? @map("pool_id") @db.Uuid`) to `Prediction` model in `prisma/schema.prisma`
- [x] Add `pool Pool? @relation(fields: [poolId], references: [id], onDelete: Cascade)` relation
- [x] Remove `@@unique([userId, matchId])` from Prediction model
- [x] Update `penaltyTeam` field name to `penaltyWinner` (fix existing alias so new `pool` relation doesn't conflict with name `penaltyTeam`)

## Step 2: Prisma — Generate client + migration
- [x] Run `pnpm prisma:generate` to regenerate Prisma client
- [x] Create migration directory: `prisma/migrations/YYYYMMDDHHMMSS_unit48_prediction_pool_id/`
- [x] Create `migration.sql` with: `ALTER TABLE predictions ADD COLUMN pool_id UUID REFERENCES pools(id) ON DELETE CASCADE;` + `DROP CONSTRAINT IF EXISTS predictions_user_id_match_id_key;` + `CREATE UNIQUE INDEX predictions_user_match_global_uk ON predictions(user_id, match_id) WHERE pool_id IS NULL;` + `CREATE UNIQUE INDEX predictions_user_match_pool_uk ON predictions(user_id, match_id, pool_id) WHERE pool_id IS NOT NULL;`

## Step 3: Types and Schemas — poolId propagation
- [x] Add `poolId: z.string().uuid().optional()` to `PredictionInputSchema` in `src/features/predictions/schemas.ts`
- [x] Add `poolId?: string` to `PredictionInput` interface in `src/features/predictions/types.ts`
- [x] Add `isOverride: boolean` and `hasGlobal: boolean` to `PoolMemberPrediction` interface in `src/features/pools/types.ts`

## Step 4: `savePrediction` server action — scope-aware upsert + membership validation
- [x] Accept `poolId?: string` in input parameter
- [x] Parse `poolId` from validated schema
- [x] If `poolId` provided: validate membership via `prisma.poolMembership.findUnique({ where: { poolId_userId: { poolId, userId } } })`; return error if not member
- [x] Change match query `predictions` include filter to `{ where: { userId, poolId: poolId ?? null } }`
- [x] Change upsert from `prisma.prediction.upsert({ where: { userId_matchId } })` to `findFirst({ where: { userId, matchId, poolId: poolId ?? null } })` → `create` or `update` pattern
- [x] Pass `poolId: poolId ?? null` in create data
- [x] Scope `lockExistingPrediction` call: add `poolId` parameter to lock only the relevant scope prediction
- [x] Add revalidation for pool path if poolId is set: `revalidatePath('/pools/' + poolId)`

## Step 5: `lockExistingPrediction` — scope-aware locking
- [x] Add optional `poolId?: string | null` parameter
- [x] Add `poolId: poolId ?? null` to the `updateMany` where clause
- [x] Update caller in `savePrediction` to pass `poolId`

## Step 6: `resetPredictionOverride` server action (NEW)
- [x] Create `src/features/predictions/actions/reset-prediction-override.ts`
- [x] Import `getOnboardedUserId`, `prisma`, `revalidatePath`, `revalidateTag`
- [x] Accept `{ matchId: string; poolId: string }`
- [x] Validate membership (`PoolMembership.findUnique`)
- [x] `DELETE FROM Prediction WHERE userId AND matchId AND poolId`
- [x] Return `{ success: true }` or `{ error: string }`

## Step 7: `resolvePoolPredictions` function (NEW in queries)
- [x] Add `resolvePoolPredictions()` to `src/features/predictions/queries.ts`
- [x] Pure function: takes `predictions: { userId, matchId, poolId, homeScore, awayScore, ... }[]`, `members: string[]`, `matchIds: string[]`, `poolId: string`
- [x] Returns `{ userId, matchId, prediction, isOverride, hasGlobal }[]`
- [x] For each (userId, matchId) pair: prefer override (poolId match); fallback to global (poolId null); null if none
- [x] Export type `ResolvedPrediction`

## Step 8: `getPoolMemberPredictions` — amplified query
- [x] In `src/features/pools/queries.ts`: change `prediction.findMany` where clause to include both `{ poolId }` (overrides) AND `{ poolId: null }` (globals)
- [x] Change from `where: { userId: { in: memberIds }, match: { kickoffAt: { lte: now } } }` to include both scopes: `OR: [{ userId: { in: memberIds }, match: { kickoffAt: { lte: now } }, poolId }, { userId: { in: memberIds }, match: { kickoffAt: { lte: now } }, poolId: null }]`
- [x] Add `poolId` to include select
- [x] Add `isOverride` and `hasGlobal` to returned `PoolMemberPrediction` objects
- [x] Add `penaltyWinnerTeamId` to returned data for editability context

## Step 9: `getPoolLeaderboard` — override-aware scoring
- [x] In `src/features/scoring-rankings/queries.ts`: replace `userTotals(memberIds)` call in `getPoolLeaderboardRows` with a dedicated query
- [x] New query: select `ps.totalPoints` from `PredictionScore` joined with `Prediction` where:
  - `p.poolId = <poolId>` (overrides), OR
  - `p.poolId IS NULL AND NOT EXISTS (SELECT 1 FROM Prediction o WHERE o.userId = p.userId AND o.matchId = p.matchId AND o.poolId = <poolId>)` (globals without override)
- [x] Group by userId, sum totalPoints
- [x] Map to leaderboard rows as before; members without scores → 0

## Step 10: `getGlobalRankingRows` — filter poolId IS NULL
- [x] In `src/features/scoring-rankings/queries.ts`: change `predictionScore.groupBy` to include `where: { prediction: { poolId: null } }`
- [x] This filters out override scores from the global ranking

## Step 11: i18n — 5 new keys
- [x] Add to `src/i18n/dictionaries/es.ts` under `pools.predictions`:
  - `overrideBadge`: "Ajustada"
  - `useGlobalPrediction`: "Usar prediccion global"
  - `usingGlobalToast`: "Usando tu prediccion global"
  - `saveForThisPool`: "Guardar para esta liga"
  - `overrideSaved`: "Prediccion guardada para esta liga"
- [x] Add to `src/i18n/dictionaries/en.ts` under `pools.predictions`:
  - `overrideBadge`: "Adjusted"
  - `useGlobalPrediction`: "Use global prediction"
  - `usingGlobalToast`: "Using your global prediction"
  - `saveForThisPool`: "Save for this pool"
  - `overrideSaved`: "Prediction saved for this pool"

## Step 12: `PoolPredictionsViewHelpers` — new data shape
- [x] Update `MemberPredictionRow.cells` type to include `isOverride`, `hasGlobal`, `penaltyWinnerTeamId`
- [x] Update `buildDayGroups` to propagate `isOverride`, `hasGlobal`, `penaltyWinnerTeamId` from predictions
- [x] Update cell population: for each (userId, matchId), prefer override → fallback to global

## Step 13: `PoolPredictionsView` component — editability, badges, reset
- [x] Pass `poolId` prop and `viewerId` prop to component
- [x] Add `useState` for editing match ID (which cell is being edited)
- [x] Add `startTransition` for server action calls
- [x] For viewer's cells (`cell.userId === viewerId`):
  - Show editable state: if match is SCHEDULED before kickoff, show scores as clickable
  - On click → open inline `PredictionScoreControls` + optional `PenaltyWinnerSelector` (knockout)
  - On save → `savePrediction({ ..., poolId })` via `startTransition`
  - After save → toast + `router.refresh()`
- [x] Override badge: if `cell.isOverride`, show small `<Badge variant="outline">{t.overrideBadge}</Badge>`
- [x] Reset button: if `cell.isOverride && cell.hasGlobal`, show icon button `Undo2` with `data-testid="reset-override-{matchId}"`
  - On click → `resetPredictionOverride(matchId, poolId)` → toast + `router.refresh()`
- [x] Locked cells: read-only, show match status badge
- [x] For other members: read-only, show override badge if applicable
- [x] Import `PredictionScoreControls` and `PenaltyWinnerSelector` from predictions feature

## Step 14: `PoolPredictionMatchCell` sub-component (inline or extracted)
- [x] Handle all cell states: empty-editable, override-editable, global-editable, locked-readonly, other-member-readonly
- [x] Show scores `{home}-{away}` or "Sin prediccion"
- [x] Show points badge if scored
- [x] Show override badge if applicable

## Step 15: `page.tsx` — pass poolId + viewerId
- [x] Pass `viewerId={userId}` and `poolId={pool.id}` to `PoolPredictionsView` in `src/app/(app)/pools/[id]/page.tsx`

## Step 16: `RevalidateResultViews` — pool-specific tag invalidation
- [x] Add `POOL_LEADERBOARD_TAG` prefix export to `src/features/scoring-rankings/cache-tags.ts`
- [x] Added per-pool tag invalidation note in `revalidate-result-views.ts`
- [x] The `RANKINGS_TAG` already covers pool leaderboard cache; score changes via sweeper already use `updateTag(RANKINGS_TAG)`. No changes needed.

## Step 17: Tests — `savePrediction` with poolId
- [x] Add to `src/features/predictions/actions/__tests__/save-prediction.test.ts`:
  - Member saves override → success, poolId set
  - Non-member saves override → error
  - Save without poolId → global (regression)
  - Global + override for same match coexist (two separate calls)
  - Edit existing override → updates, no duplicate
  - Save after kickoff with poolId → 403 lock (regression)

## Step 18: Tests — `resetPredictionOverride` (NEW)
- [x] Create `src/features/predictions/actions/__tests__/reset-prediction-override.test.ts`
  - Override exists → deleted, returns success
  - Not a pool member → error
  - No override found → error/notFound
  - Unauthenticated → error

## Step 19: Tests — `resolvePoolPredictions`
- [x] Add tests to `src/features/pools/__tests__/pool-predictions.test.ts`:
  - Override exists → isOverride: true, prediction from override
  - Only global exists → isOverride: false, prediction from global
  - No prediction → prediction: null
  - Override + global → isOverride: true, hasGlobal: true

## Step 20: Tests — Leaderboard override-aware
- [x] Add tests to `src/features/scoring-rankings/__tests__/global-ranking.test.ts`:
  - Override scores excluded from global ranking
  - Global ranking only counts poolId IS NULL predictions

## Step 21: Tests — PoolPredictionsView component
- [x] Add cases to `src/features/pools/components/__tests__/pool-predictions-view.test.tsx`:
  - Cell shows override badge when isOverride
  - Cell shows reset button when isOverride && hasGlobal
  - Cell without override shows no badge
  - Member row with no prediction shows empty cells
  - Override preference: when both global and override exist for same user/match pair in different prediction rows, override scores shown

## Step 22: Verification
- [x] `pnpm prisma:generate` → OK
- [x] `pnpm exec tsc --noEmit` → 0 errors
- [x] `pnpm exec biome check` on touched files → clean
- [x] `pnpm exec eslint` on touched files → 0
- [x] Focused Vitest (save-prediction, reset-override, leaderboard, pool-predictions-view, resolve)
- [x] Full `pnpm test` → all green
- [x] `pnpm build` → OK
