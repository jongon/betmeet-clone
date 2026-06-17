# Code Generation Plan — Unit 42: Agrupación por día local del usuario

## Status

- **Stage**: Code Generation Part 1 — PLAN COMPLETE / AWAITING APPROVAL
- **Unit**: Unit 42, refine post-construcción sobre `/matches`, Unit 30 y Unit 41
- **Created**: 2026-06-17T23:16:04Z
- **Approval Gate**: Waiting for explicit approval before Part 2 Generation

## Unit Context

- **Requirement coverage**: FR-REFINE-42.1 through FR-REFINE-42.5.
- **Story coverage**: US-42.1.
- **Primary user outcome**: a match shown as 01:00 on 18 June in the user's browser timezone appears under the 18 June day block, not the UTC date block.
- **Application code location**: workspace root only, under `src/`. No application code goes in `aidlc-docs/`.
- **No schema or infrastructure changes**: no Prisma migration, new route, provider, storage, auth, env var, or dependency.

## Dependencies And Current Code Findings

- `/matches` currently receives already-grouped server data from `getFixtureByDayWithMyPredictions()` and partitions with `new Date().toISOString().slice(0, 10)`, both UTC-based.
- `src/features/predictions/services/fixture-by-day.ts` groups by `match.kickoffAt.slice(0, 10)` and labels with an `Intl.DateTimeFormat` fixed to `timeZone: "UTC"`.
- `src/features/pools/components/pool-predictions-view.tsx` duplicates UTC day grouping with `kickoffAt?.slice(0, 10)` and a UTC formatter.
- `src/features/predictions/components/matches-fixture-view.tsx` is already a client component, so it can derive the browser timezone without adding routes or persisted profile fields.

## Implementation Strategy

Use the smallest shared helper change:

- Add timezone-safe pure helpers in `src/features/predictions/services/fixture-by-day.ts`.
- Keep server-rendered `/matches` as a safe UTC fallback for first render.
- Move timezone-sensitive regrouping and past/current partitioning into the existing client `MatchesFixtureView`, using `Intl.DateTimeFormat().resolvedOptions().timeZone` after mount.
- Reuse the same helper in `PoolPredictionsView` for local-day grouping, with SSR fallback to UTC because this server component cannot know the browser timezone on first render without a larger persistence change.

This preserves caching and avoids extra database reads. It fixes `/matches`, and it removes duplicated UTC slicing from Unit 41 so both day-based views share one local-day contract.

## Generation Steps

- [x] **Step 1 — Analyze current implementation paths**
  - Reviewed `src/features/predictions/services/fixture-by-day.ts`.
  - Reviewed `src/app/(app)/matches/page.tsx`.
  - Reviewed `src/features/predictions/components/matches-fixture-view.tsx`.
  - Reviewed `src/features/pools/components/pool-predictions-view.tsx`.
  - Reviewed focused tests for fixture grouping, day partitioning, and pool predictions grouping.

- [x] **Step 2 — Create this code generation plan**
  - Defined code paths, step sequence, story traceability, and verification scope.
  - Confirmed application code targets are under `src/`, not `aidlc-docs/`.

- [x] **Step 3 — Add shared timezone helpers**
  - Modify `src/features/predictions/services/fixture-by-day.ts`.
  - Add `coerceTimeZone(value)` with `UTC` fallback after validating via `Intl.DateTimeFormat`.
  - Add `formatLocalDayKey(date, timeZone)` that returns `yyyy-mm-dd` for the coerced timezone.
  - Add/adjust day-label formatting so labels use the selected timezone and active locale where available.
  - Update `groupFixtureByDay(phases, options?)` to accept optional `{ timeZone, locale }` while defaulting safely to `UTC` and Spanish labels for existing callers.

- [x] **Step 4 — Update `/matches` local timezone behavior**
  - Modify `src/app/(app)/matches/page.tsx` to stop computing UTC `today` and stop passing pre-partitioned days.
  - Keep the server query and fixture cache unchanged.
  - Modify `src/features/predictions/components/matches-fixture-view.tsx` to accept grouped fixture data or groups and recompute local grouping/partitioning client-side after reading browser timezone.
  - Use `formatLocalDayKey(new Date(), timeZone)` for `today` before calling `partitionDaysByToday`.
  - Preserve the existing collapsed-past-days UI, `data-testid` values, and match card rendering.

- [x] **Step 5 — Align Unit 41 pool prediction day grouping**
  - Modify `src/features/pools/components/pool-predictions-view.tsx` to use `formatLocalDayKey` and shared label formatting instead of `kickoffAt?.slice(0, 10)` and local duplicate formatter logic.
  - Keep reverse day ordering (`days.reverse()`) from the later Unit 41 refine.
  - Keep visibility based on absolute kickoff in the query; do not change scoring, timestamps, or membership gate.

- [x] **Step 6 — Update focused tests**
  - Update `src/features/predictions/__tests__/group-fixture-by-day.test.ts` with timezone boundary assertions:
    - `2026-06-17T23:00:00Z` + `Europe/Madrid` -> `2026-06-18`.
    - Same instant + `UTC` -> `2026-06-17`.
    - Invalid or missing timezone falls back to `UTC`.
  - Update `src/features/predictions/__tests__/partition-days-by-today.test.ts` if needed to document local-day `today` input.
  - Update `src/features/pools/components/__tests__/pool-predictions-view.test.tsx` to stop asserting UTC slicing and assert shared local-day grouping semantics.

- [x] **Step 7 — Run focused verification**
  - Run focused Vitest files for prediction day helpers and pool prediction grouping.
  - Run `pnpm exec tsc --noEmit`.
  - Run Biome and ESLint on touched source/test files.
  - Run full suite/build only if the implementation touches shared component boundaries more broadly than planned.

- [x] **Step 8 — Summarize generated artifacts**
  - Create/update `aidlc-docs/construction/unit-42-matches-local-day-timezone/code/generation-summary.md` with modified files, verification results, and remaining operational smoke note.
  - Mark all completed checkboxes in this plan immediately after each step.
  - Update `aidlc-docs/aidlc-state.md` and append to `aidlc-docs/audit.md` in the same interaction.

## Expected Modified Application Files

- `src/features/predictions/services/fixture-by-day.ts`
- `src/app/(app)/matches/page.tsx`
- `src/features/predictions/components/matches-fixture-view.tsx`
- `src/features/pools/components/pool-predictions-view.tsx`
- `src/features/predictions/__tests__/group-fixture-by-day.test.ts`
- `src/features/predictions/__tests__/partition-days-by-today.test.ts` if needed
- `src/features/pools/components/__tests__/pool-predictions-view.test.tsx`

## Expected Documentation Files

- `aidlc-docs/construction/unit-42-matches-local-day-timezone/code/generation-summary.md`
- `aidlc-docs/construction/plans/unit-42-matches-local-day-timezone-code-generation-plan.md`
- `aidlc-docs/aidlc-state.md`
- `aidlc-docs/audit.md`

## Out Of Scope

- Persisting timezone in `profiles`.
- Adding a timezone cookie route or server action unless the minimal client wrapper proves insufficient.
- Changing `kickoffAt`, sync, scoring, prediction lock, admin views, or database schema.
- Changing displayed match time formatting, except through existing `MatchCard` behavior.

## Approval Requirement

Part 2 Generation must not begin until the user explicitly approves this plan or asks for changes.
