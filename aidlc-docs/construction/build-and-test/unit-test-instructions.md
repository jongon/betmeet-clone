# Unit Test Instructions — Unit 45

## Run Unit Tests

### 1. Pools feature (focused)
```bash
pnpm exec vitest run src/features/pools/
```
**Expected**: 78 tests passing across 13 files.
- New tests (Unit 45):
  - `src/features/pools/actions/__tests__/update-pool-members-can-invite.test.ts` — 8 tests (owner true→false, owner false→true, non-owner, pool inexistente, sin onboarding, validación UUID, validación boolean, revalidatePath + log).
  - `src/features/pools/actions/__tests__/create-pool.test.ts` — 6 tests (PRIVATE con false persiste, PRIVATE default true, PUBLIC default true, onboarding error, transaction failure, redirect success).
  - `src/features/pools/components/__tests__/create-pool-form.test.tsx` — 5 tests (Switch no visible en PUBLIC, visible en PRIVATE, hidden+reset al cambiar a PUBLIC, sends default true, sends false cuando se apaga).
  - `src/features/pools/components/__tests__/pool-settings-card.test.tsx` — 5 tests (render inicial true, render inicial false, click→action+toast, error→rollback+FormError, disabled mientras pending).
- Modified tests (Unit 45):
  - `src/features/pools/actions/__tests__/create-directed-invite.test.ts` — +3 tests (non-owner blocked when membersCanInvite=false, owner always allowed even when membersCanInvite=false, PUBLIC blocks non-owner member).

### 2. Full test suite
```bash
pnpm test
```
**Expected**: 341 tests passing across 66 files (no regressions; +23 new tests from Unit 45).

### 3. Verify no regressions in adjacent features
```bash
pnpm exec vitest run src/features/admin/ src/features/notifications/ src/features/auth/ src/features/competition/
```
**Expected**: All passing. (These features interact with Pool via FK or notifications, but Unit 45 does not change their interfaces.)

## Test Coverage

- **Business logic (server actions)**: `updatePoolMembersCanInvite` (8 tests) + `createPool` (6) + `createDirectedInvite` (9, 3 new from Unit 45) = 23 tests.
- **UI behavior (client components)**: `CreatePoolForm` (5) + `PoolSettingsCardClient` (5) = 10 tests.
- **i18n**: not unit-tested; verified by tsc 0 errors on `Dictionary` type (compile-time check).
- **Total Unit 45 tests**: 23 new + 0 modified apart from the 3 added to create-directed-invite.

## Fixing Failing Tests

If `src/features/pools/actions/__tests__/create-pool.test.ts` fails:
- Verify `redirect` is mocked to throw (`vi.mock("next/navigation", () => ({ redirect: vi.fn(() => { throw new Error("REDIRECT"); }) }))`).
- Verify `prisma.$transaction` is re-mocked per test with the right `txCreate`/`txMembership` spies.
- Verify `generateUniqueInviteToken` is mocked to return a stable string.

If `src/features/pools/components/__tests__/pool-settings-card.test.tsx` fails on the "disables while pending" test:
- Verify the assertion uses `hasAttribute("disabled") || getAttribute("aria-disabled") === "true"` (base-ui Switch may not render a `button`).
