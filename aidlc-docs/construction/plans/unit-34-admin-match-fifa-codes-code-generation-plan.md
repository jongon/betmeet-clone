# Unit 34: Códigos FIFA en `/admin/matches` — Code Generation Plan

## Status

- **Stage**: Code Generation Part 2 — COMPLETE
- **Unit**: Unit 34, refine UI-only sobre Unit 7 Admin and Observability
- **Approval Gate**: Approved by user continuation; Part 2 generation executed
- **Source of Truth**: This plan is the single source of truth for Unit 34 Code Generation.

## Plan Authoring Progress

- [x] Step 1: Read Unit 34 requirements, story, Unit 7 functional design, and current state.
- [x] Step 2: Read existing admin match query and component code to identify exact application paths.
- [x] Step 3: Confirm NFR and Infrastructure stages are skipped for this UI-only refine.
- [x] Step 4: Define executable generation steps with exact workspace-root paths.
- [x] Step 5: Log the approval prompt in `aidlc-docs/audit.md` and update `aidlc-docs/aidlc-state.md` in the same interaction.

## Unit Context

### Story Traceability

- **US-34.1**: As an admin, I want `/admin/matches` to show match labels with 3-letter FIFA codes, for example `BRA vs ARG`, so I can identify matches quickly.

### Functional Rules

- **BR-7.14**: Resolved teams in `/admin/matches` use `homeTeam.fifaCode` and `awayTeam.fifaCode` in `XXX vs YYY` format.
- **BR-7.15**: Unresolved sides keep the existing placeholder (`homePlaceholder` / `awayPlaceholder`) instead of inventing a code.

### Dependencies

- Reuses Unit 4 / CF-3 decision: `Team.fifaCode` is the football 3-letter code.
- Reuses Unit 7 admin read model and UI: `getAdminMatches()`, `AdminMatchRow`, `AdminMatchList`, `ForceResultDialog`, `RevertOverrideButton`.
- Does not change database schema, routes, sync, seed, scoring, auth, or public `/matches` presentation.

### Code Location

- Application code must be modified only under the workspace root.
- Documentation remains under `aidlc-docs/`.
- No application code is generated inside `aidlc-docs/`.

## Part 2 Generation Steps

### Step 1: Admin Match Read Model

- [x] Modify `src/features/admin/queries.ts` so `getAdminMatches()` builds the primary `label` from `homeTeam.fifaCode` and `awayTeam.fifaCode`, falling back per side to `homePlaceholder` / `awayPlaceholder` / `?`.
- [x] Keep `homeTeamName` and `awayTeamName` unchanged for compatibility; add explicit compact side labels for display.

### Step 2: Dialog Team Labels

- [x] Modify `src/features/admin/types.ts` only if the existing `AdminMatchRow` needs explicit per-side display labels.
- [x] Modify `src/features/admin/components/force-result-dialog.tsx` only if needed so override dialog controls use the same compact team labels without losing fallback behavior.
- [x] Leave `RevertOverrideButton` behavior unchanged because it receives only `matchId`; the row-level label remains the visible context.

### Step 3: Tests

- [x] Add or update admin query/component tests to verify `getAdminMatches()` returns `BRA vs ARG` when both teams are resolved.
- [x] Add or update tests to verify unresolved teams keep placeholders per side.
- [x] If dialog labels are changed, cover compact dialog labels through the shared `AdminMatchRow` labels used by `ForceResultDialog`.

### Step 4: Documentation Summary

- [x] Create `aidlc-docs/construction/unit-34-admin-match-fifa-codes/code/generation-summary.md` summarizing modified files, behavior, and skipped NFR/Infrastructure work.

### Step 5: Verification

- [x] Run targeted tests for admin query/component coverage.
- [x] Run TypeScript check or the narrowest feasible compile verification for touched files.
- [x] Run formatter/linter checks on touched files where feasible.

### Step 6: Progress Tracking

- [x] Mark all completed steps in this plan with `[x]` in the same interaction as completion.
- [x] Update `aidlc-docs/aidlc-state.md` to mark Unit 34 Code Generation complete after successful generation.
- [x] Append the Unit 34 Code Generation result to `aidlc-docs/audit.md` with exact files and verification results.

## Verification Results

- `pnpm exec vitest run src/features/admin/__tests__/queries.test.ts src/features/admin/actions/__tests__/revert-override.test.ts src/features/admin/services/__tests__/require-admin.test.ts src/features/admin/services/__tests__/resolve-winner.test.ts` → 4 files, **14/14 tests passed**.
- `pnpm exec vitest run src/features/admin/__tests__/queries.test.ts` → Unit 34 focused re-run, **2/2 tests passed**.
- `pnpm exec tsc --noEmit` → passed.
- `pnpm exec biome check src/features/admin/queries.ts src/features/admin/types.ts src/features/admin/components/force-result-dialog.tsx src/features/admin/__tests__/queries.test.ts` → passed. `aidlc-docs/` is ignored by Biome, so Markdown artifacts were reviewed by diff.
- `pnpm exec eslint src/features/admin/queries.ts src/features/admin/types.ts src/features/admin/components/force-result-dialog.tsx src/features/admin/__tests__/queries.test.ts` → passed.

## Security Baseline Compliance

- **SECURITY-01/02/04/06/07/10/12/13/14**: N/A, no infrastructure, storage, dependency, auth, or network changes.
- **SECURITY-03**: N/A, no logging changes and no sensitive data is introduced.
- **SECURITY-05**: N/A, no new API/input surface.
- **SECURITY-08**: Compliant, existing `/admin/*` server-side `requireAdmin()` guard remains unchanged.
- **SECURITY-09**: Compliant, no production error handling or configuration exposure changes.
- **SECURITY-11**: Compliant, change stays within existing admin presentation boundary and does not weaken defense in depth.
