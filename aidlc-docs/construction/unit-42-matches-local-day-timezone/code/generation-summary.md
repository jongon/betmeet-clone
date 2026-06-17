# Unit 42 — Generation Summary

## Implemented

- Added timezone-safe helpers in `src/features/predictions/services/fixture-by-day.ts`: `coerceTimeZone`, `formatLocalDayKey`, `formatLocalDayLabel`, timezone-aware `groupFixtureByDay`, and `regroupFixtureDaysByTimeZone`.
- Updated `/matches` so `page.tsx` stops computing UTC `today`; `MatchesFixtureView` now derives browser timezone via `useSyncExternalStore`, regroups server fallback days client-side, and partitions past/current days with that same timezone.
- Updated Unit 41 pool predictions grouping by extracting pure helpers to `pool-predictions-view-helpers.ts` and replacing `kickoffAt.slice(0, 10)` with shared local-day helpers.
- Added/updated focused tests for `Europe/Madrid` vs `UTC` boundary behavior and invalid timezone fallback.

## Verification

- Focused Vitest: `22/22` tests passing.
- Full Vitest: `285/285` tests passing.
- TypeScript: `pnpm exec tsc --noEmit` OK.
- Biome focused check: OK.
- ESLint focused check: OK.
- Production build: `pnpm build` OK.

## Notes

- No schema, migrations, routes, providers, auth, scoring, sync, or admin changes.
- `kickoffAt` remains the canonical UTC instant; only day grouping/labels and past-day partitioning changed.
- Recommended smoke: open `/matches` in a browser with `Europe/Madrid` timezone and verify a local 01:00 June 18 kickoff appears under June 18.
