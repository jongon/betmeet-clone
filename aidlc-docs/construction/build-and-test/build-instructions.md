# Build Instructions — Unit 41

## Prerequisites
- **Package Manager**: pnpm 11.7.0
- **Node**: >= 24
- **Environment**: `.env` configured with DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL, etc.

## Build Steps

### 1. Generate Prisma Client
```bash
pnpm prisma:generate
```

### 2. Type Check
```bash
pnpm exec tsc --noEmit
```
**Expected**: 0 errors.

### 3. Lint & Format
```bash
pnpm exec biome check src/features/pools/queries.ts src/features/pools/types.ts src/features/pools/components/pool-predictions-view.tsx src/features/pools/__tests__/pool-predictions.test.ts src/features/pools/components/__tests__/pool-predictions-view.test.tsx "src/app/(app)/pools/[id]/page.tsx" src/i18n/dictionaries/es.ts src/i18n/dictionaries/en.ts
pnpm exec eslint --quiet src/features/pools/queries.ts src/features/pools/types.ts src/features/pools/components/pool-predictions-view.tsx src/features/pools/__tests__/pool-predictions.test.ts src/features/pools/components/__tests__/pool-predictions-view.test.tsx "src/app/(app)/pools/[id]/page.tsx" src/i18n/dictionaries/es.ts src/i18n/dictionaries/en.ts
```
**Expected**: Biome 0 warnings/errors, ESLint 0 errors.

### 4. Production Build
```bash
pnpm build
```
**Expected**: All routes generated, including `/pools/[id]` (dynamic). New files: `pool-predictions-view.tsx`, tab integration in pool detail page.

## Troubleshooting

### Build fails with TypeScript errors
- Check that `pnpm prisma:generate` has been run
- Verify `src/generated/prisma/` exists
- Clear stale types: `rm -rf .next/dev/types`

### Build fails with missing imports
- Verify `PoolMemberPrediction` is exported from `src/features/pools/types.ts`
- Verify `getPoolMemberPredictions` is exported from `src/features/pools/queries.ts`
- Verify `PoolPredictionsView` is exported from `src/features/pools/components/pool-predictions-view.tsx`
