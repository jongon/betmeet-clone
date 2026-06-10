# Unit 3: Pools and Membership — Code Generation Summary

## Status
- Code Generation Part 2: complete.
- Scope executed: 13/13 planned steps.
- Current gate: awaiting user approval to proceed to Unit 4 Functional Design.

## Implemented
- Data model: Prisma `PoolType`, `Pool`, `PoolMembership` with owner/profile relations, unique membership, invite token, archive state, and indexes.
- Supabase migration: pool capacity constraint, public-name partial unique index, and RLS policies for public/member reads.
- Pool domain layer: types, Zod schemas, invite token generation, competition lock service backed by `WORLD_CUP_KICKOFF`, session helpers, queries.
- Server Actions: create, join public, join by token, kick member, leave, personal archive toggle, delete pool.
- Account deletion integration: owner transfer/delete handling before profile soft-delete, plus UI for selecting new owners ordered oldest to newest.
- Routes: `/pools`, `/pools/new`, `/pools/discover`, `/pools/[id]`, `/pools/join/[token]`.
- UI components: pool cards, create form, public directory search/list/cards, member list, kick button, invite sharing (copy + WhatsApp), pool actions, join confirmation.
- Landing integration: home `PoolPreview` reads real public pools and hides safely if the DB query fails during prerender/runtime.
- Build fix discovered during verification: moved nickname suggestions into a client-safe pure module so onboarding no longer bundles Prisma/pg into browser code.

## Verification
- `pnpm prisma:generate`: passed.
- `pnpm exec tsc --noEmit`: passed.
- `pnpm test`: passed, 47/47 tests.
- `pnpm build`: passed.
- `pnpm check`: passed.

## Notes
- The package `test` script now runs Vitest directly instead of Node's `tsx --test`, matching the existing test suite.
- Full Biome checks are clean after removing unused code, replacing non-null assertions with explicit env guards, and using `next/image` for the MFA QR code.
