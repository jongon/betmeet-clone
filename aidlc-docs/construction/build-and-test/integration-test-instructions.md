# Integration Test Instructions — Unit 45

## Purpose

Verify the cross-feature interactions introduced or affected by Unit 45:
- **Pools ↔ Profile** (auth): `updatePoolMembersCanInvite` and `createDirectedInvite` both depend on `getOnboardedUserId()` (FR-REFINE-16.1).
- **Pools ↔ Notifications**: `createDirectedInvite` enqueues a push notification when the invitee resolves to an existing user; the gating in Unit 45 must NOT break this.
- **Pools ↔ i18n**: the rename `pools.invite` → `pools.invitationTitle` + nested `pools.invite: { membersBlockedHint }` must be coherent in both `es.ts` and `en.ts`.

## Test Scenarios

### Scenario 1 — Unit 45 gate is enforced end-to-end
- **Description**: A non-owner member of a PRIVATE pool with `membersCanInvite = false` cannot send a directed invite.
- **Setup**: A pool with `type = "PRIVATE"`, `membersCanInvite = false`, two members (`owner`, `member`).
- **Test Steps**:
  1. `member` calls `createDirectedInvite({ poolId, target: "Other#1234" })`.
  2. Server returns `{ error: "El administrador no permite que los miembros inviten" }`.
  3. `poolDirectedInvite` row is not created.
  4. `queueNotificationEvent` is not called.
- **Covered by**: `src/features/pools/actions/__tests__/create-directed-invite.test.ts` ("rejects a non-owner member when membersCanInvite=false").

### Scenario 2 — Unit 45 gate is reflected in the UI
- **Description**: `/pools/[id]` shows the `PoolSettingsCard` only to the owner, and shows the `membersBlockedHint` text to a non-owner member when the gate is closed.
- **Setup**: A pool with `type = "PRIVATE"`, `membersCanInvite = false`; a non-owner member visits the page.
- **Test Steps**:
  1. SSR: `getPoolDetail(poolId)` returns `membersCanInvite: false`, `isOwner: false`.
  2. Page renders `<p>{t.invite.membersBlockedHint}</p>` instead of `<DirectedInviteForm />`.
  3. `PoolSettingsCard` is NOT rendered.
- **Covered by**: visual check post-deploy; the gate logic is in `src/app/(app)/pools/[id]/page.tsx` and the schema/types in queries.ts.

### Scenario 3 — Owner can flip the toggle and the UI re-renders
- **Description**: The owner toggles `membersCanInvite` from `true` to `false` via the Switch; the page reflects the new value after revalidation.
- **Setup**: A pool with `type = "PRIVATE"`, `membersCanInvite = true`; the owner is signed in.
- **Test Steps**:
  1. `PoolSettingsCardClient` is rendered with `initialMembersCanInvite={true}`.
  2. User clicks the Switch.
  3. `updatePoolMembersCanInvite({ poolId, membersCanInvite: false })` is called.
  4. Server persists the change, calls `revalidatePath("/pools/<id>")`, and logs `pool.settings_changed`.
  5. `toast.success(settings.saved)` appears.
  6. Non-owner members now see `membersBlockedHint` instead of the invite form.
- **Covered by**: `src/features/pools/components/__tests__/pool-settings-card.test.tsx` ("clicking the Switch calls updatePoolMembersCanInvite and toasts on success") + `src/features/pools/actions/__tests__/update-pool-members-can-invite.test.ts` (8 cases).

### Scenario 4 — i18n consistency
- **Description**: Both `es.ts` and `en.ts` expose the same `pools` shape; no client component fails to resolve a key.
- **Setup**: tsc type check on `Dictionary = WidenStrings<EsDictionary>`.
- **Test Steps**:
  1. `pnpm exec tsc --noEmit` returns 0 errors.
  2. `en.ts`'s `pools: { ...es.pools, ... }` does not omit any required key.
- **Covered by**: tsc 0 (compile-time check).

## Setup Integration Test Environment

These tests run in-process via Vitest; no external services are required beyond the existing Prisma mocks. The full integration test environment is the same as for any other unit (Vitest + jsdom for components).

## Run Integration Tests

```bash
pnpm exec vitest run src/features/pools/
pnpm test
```

**Expected**: 78/78 in `src/features/pools/`, 341/341 in full suite.

## Cleanup

No additional cleanup is required — Vitest resets mocks per test via `vi.clearAllMocks()` in `beforeEach`.
