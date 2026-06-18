# Build Instructions — Unit 45

## Prerequisites
- **Package Manager**: pnpm 11.7.0
- **Node**: >= 24
- **Environment**: `.env` configured with DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL, etc.

## Build Steps

### 1. Generate Prisma Client
```bash
pnpm prisma:generate
```
**Expected**: `✔ Generated Prisma Client (7.8.0) to ./src/generated/prisma in 162ms` (with the new `members_can_invite` column on `Pool`).

### 2. Apply Database Migration (Operations)
```bash
pnpm prisma migrate deploy
```
**Expected**: applies `20260618010000_unit45_pool_members_can_invite` (adds `members_can_invite BOOLEAN NOT NULL DEFAULT TRUE` to `pools`).

### 3. Type Check
```bash
pnpm exec tsc --noEmit
```
**Expected**: 0 errors.

### 4. Lint & Format (focused on touched files)
```bash
pnpm exec biome check \
  prisma/schema.prisma \
  src/features/pools/schemas.ts \
  src/features/pools/types.ts \
  src/features/pools/queries.ts \
  src/features/pools/actions/create-pool.ts \
  src/features/pools/actions/create-directed-invite.ts \
  src/features/pools/actions/update-pool-members-can-invite.ts \
  src/features/pools/actions/__tests__/create-pool.test.ts \
  src/features/pools/actions/__tests__/create-directed-invite.test.ts \
  src/features/pools/actions/__tests__/update-pool-members-can-invite.test.ts \
  src/features/pools/components/create-pool-form.tsx \
  src/features/pools/components/pool-settings-card.tsx \
  src/features/pools/components/pool-settings-card-client.tsx \
  src/features/pools/components/invite-share.tsx \
  src/features/pools/components/__tests__/create-pool-form.test.tsx \
  src/features/pools/components/__tests__/pool-settings-card.test.tsx \
  "src/app/(app)/pools/[id]/page.tsx" \
  "src/app/(app)/pools/join/[token]/page.tsx" \
  src/i18n/dictionaries/es.ts \
  src/i18n/dictionaries/en.ts \
  src/lib/auth-logger.ts

pnpm exec eslint --quiet \
  prisma/schema.prisma \
  src/features/pools/schemas.ts \
  src/features/pools/types.ts \
  src/features/pools/queries.ts \
  src/features/pools/actions/create-pool.ts \
  src/features/pools/actions/create-directed-invite.ts \
  src/features/pools/actions/update-pool-members-can-invite.ts \
  src/features/pools/actions/__tests__/create-pool.test.ts \
  src/features/pools/actions/__tests__/create-directed-invite.test.ts \
  src/features/pools/actions/__tests__/update-pool-members-can-invite.test.ts \
  src/features/pools/components/create-pool-form.tsx \
  src/features/pools/components/pool-settings-card.tsx \
  src/features/pools/components/pool-settings-card-client.tsx \
  src/features/pools/components/invite-share.tsx \
  src/features/pools/components/__tests__/create-pool-form.test.tsx \
  src/features/pools/components/__tests__/pool-settings-card.test.tsx \
  "src/app/(app)/pools/[id]/page.tsx" \
  "src/app/(app)/pools/join/[token]/page.tsx" \
  src/i18n/dictionaries/es.ts \
  src/i18n/dictionaries/en.ts \
  src/lib/auth-logger.ts
```
**Expected**: Biome 0 warnings/errors, ESLint 0 errors.

### 5. Unit Tests
```bash
pnpm exec vitest run src/features/pools/
pnpm test
```
**Expected**: `src/features/pools/` 78/78 (13 archivos, +23 de Unit 45); full suite 341/341 (66 archivos).

### 6. Production Build
```bash
pnpm build
```
**Expected**: All 25 routes generated. `/pools/[id]` is dynamic. New files: `pool-settings-card.tsx`, `pool-settings-card-client.tsx`, `update-pool-members-can-invite.ts`, plus tests.

## Troubleshooting

### Build fails with TypeScript errors referencing `membersCanInvite`
- Check that `pnpm prisma:generate` has been run
- Verify `src/generated/prisma/` is fresh (regenerate if stale)
- Clear stale types: `rm -rf .next/dev/types`

### Build fails with missing imports
- Verify `UpdatePoolMembersCanInviteSchema` and `UpdatePoolMembersCanInviteInput` are exported from `src/features/pools/schemas.ts`
- Verify `membersCanInvite: boolean` is on `PoolDetail` and `MyPoolSummary` in `src/features/pools/types.ts`
- Verify `updatePoolMembersCanInvite` is exported from `src/features/pools/actions/update-pool-members-can-invite.ts`
- Verify `PoolSettingsCard` is exported from `src/features/pools/components/pool-settings-card.tsx`

### Migration does not apply cleanly
- The pooler (port 6543) may block DDL on a database where RLS migrations reference `auth`. Apply directly via the Supabase SQL editor or use the session-mode direct connection.
- The migration is idempotent at the SQL level (no destructive operations) but should be applied once per environment.

### i18n type errors about `pools.invite` / `pools.invitationTitle`
- The functional design renames `pools.invite` (string) → `pools.invitationTitle` and creates a nested `pools.invite: { membersBlockedHint }` object. Both `es.ts` and `en.ts` must have the new shape; `en.ts` uses `...es.pools, ...` spread and overrides the locale-specific strings.
- The two existing references (`invite-share.tsx:26` and `pools/join/[token]/page.tsx:21`) must use `t.invitationTitle` / `dictionary.pools.invitationTitle`.
