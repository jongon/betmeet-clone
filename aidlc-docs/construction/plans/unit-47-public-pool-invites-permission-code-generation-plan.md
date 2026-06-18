# Code Generation Plan — Unit 47: Extensión del permiso de invitación a pools públicos

## Context

- **Unit**: Unit 47 (refine post-construcción sobre Unit 45)
- **Stories**: US-47.1 — Configurar permiso de invitación en cualquier tipo de pool
- **Dependencies**: Unit 45 (`membersCanInvite` column, `PoolSettingsCard`, gate logic)
- **Risk**: Low — removes restrictions, no schema/migrations/new files
- **Architecture**: Feature-based monolith (Next.js App Router), brownfield — modify existing files only

## File Plan

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | `src/features/pools/actions/create-directed-invite.ts` | MODIFY | Gate simplification: remove `pool.type !== "PRIVATE" \|\|` from non-owner check |
| 2 | `src/features/pools/actions/update-pool-members-can-invite.ts` | MODIFY | Remove PUBLIC rejection guard + error message (lines 39-44) |
| 3 | `src/features/pools/components/create-pool-form.tsx` | MODIFY | Switch always visible; remove `type === "PRIVATE"` wrapper + reset logic |
| 4 | `src/app/(app)/pools/[id]/page.tsx` | MODIFY | Simplify `canInvite` (line 36) and `PoolSettingsCard` render (line 108) |
| 5 | `src/features/pools/actions/__tests__/create-directed-invite.test.ts` | MODIFY | PUBLIC non-owner blocked → allowed when `membersCanInvite=true` |
| 6 | `src/features/pools/actions/__tests__/update-pool-members-can-invite.test.ts` | MODIFY | "rejects PUBLIC" → "allows PUBLIC"; add new positive case |
| 7 | `src/features/pools/components/__tests__/create-pool-form.test.tsx` | MODIFY | Switch always visible; remove "does NOT show for PUBLIC", add "shows for PUBLIC" |
| 8 | Verification | RUN | tsc --noEmit, Biome, ESLint, vitest focused + full, pnpm build |

## Step-by-Step Execution

### Step 1: Modify `create-directed-invite.ts` gate (BR-47.3)
- [ ] Remove `pool.type !== "PRIVATE" ||` from line 91
- [ ] Gate becomes: `if (!pool.membersCanInvite)` (owner already excluded above)
- [ ] Delete/update stale comment on lines 87-89 (Unit 45 → Unit 47)

### Step 2: Modify `update-pool-members-can-invite.ts` (BR-47.6)
- [ ] Remove lines 39-44 (the `if (pool.type !== "PRIVATE")` block with error return)
- [ ] Update docblock to reflect both pool types are accepted
- [ ] Remove stale comments about PRIVATE-only restriction

### Step 3: Modify `create-pool-form.tsx` (BR-47.2)
- [ ] Remove `{type === "PRIVATE" && (` wrapper (line 84) and closing `)}` (line 98)
- [ ] Remove `handleTypeChange` function (lines 22-27) — no longer needed
- [ ] Switch from `<select onChange={handleTypeChange}>` to basic `setType(poolType)` without reset

### Step 4: Modify `pools/[id]/page.tsx` (BR-47.4, BR-47.5)
- [ ] Line 36: `canInvite = pool.isOwner || pool.membersCanInvite` (remove `pool.type === "PRIVATE" &&`)
- [ ] Line 108: `pool.isOwner` only (remove `&& pool.type === "PRIVATE"`)
- [ ] Update source comments to reference Unit 47 instead of Unit 45

### Step 5: Update `create-directed-invite.test.ts` (BR-47.1, BR-47.3)
- [ ] Modify PUBLIC test case (lines 126-141): non-owner member with `membersCanInvite: true` on PUBLIC pool → **should succeed** (invite allowed)
- [ ] Add case: PUBLIC non-owner member with `membersCanInvite: false` → blocked with error
- [ ] Update test description to remove "Unit 45" references

### Step 6: Update `update-pool-members-can-invite.test.ts` (BR-47.6)
- [ ] Replace "rejects the call for PUBLIC pools" test (lines 99-111) with "allows PUBLIC pool update"
- [ ] New test: owner of PUBLIC pool can change `membersCanInvite` → success + calls update + logs
- [ ] Update default mock `type` to "PUBLIC" (tests shouldn't need PRIVATE default anymore — or keep PRIVATE as default and add explicit PUBLIC test)
- [ ] Update test list description to reference Unit 47

### Step 7: Update `create-pool-form.test.tsx` (BR-47.2)
- [ ] Replace "does NOT show the membersCanInvite Switch by default (type=PUBLIC)" with "shows the membersCanInvite Switch by default (type=PUBLIC)"
- [ ] Remove "hides the Switch and resets value when type changes back to PUBLIC" test (reset logic removed)
- [ ] Add "shows Switch for PUBLIC" / "shows Switch for PRIVATE" tests
- [ ] Update "sends membersCanInvite=true to createPool by default" to work for PUBLIC (default type)

### Step 8: Verification
- [ ] `pnpm exec tsc --noEmit` — 0 errors
- [ ] `pnpm exec biome check src/features/pools/ src/app/\(app\)/pools/\[id\]/page.tsx` — clean
- [ ] `pnpm exec eslint` on touched files — clean
- [ ] `pnpm test` — focused + full suite green
- [ ] `pnpm build` — OK

## Out of Scope

- Schema changes (column already exists from Unit 45)
- Migrations
- New i18n keys
- New routes
- New files (all changes are modifications to existing files)
- `directed-invite-form.tsx`, `pool-settings-card.tsx`, `pool-settings-card-client.tsx`, `search-nicknames.ts`, schemas, types, queries — unchanged
