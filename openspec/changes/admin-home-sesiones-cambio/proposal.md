## Why

The admin authentication flow already exists (`admin-auth` spec) but `/admin` is a dead route — once a coleccionista logs in they have nothing to do. The product's whole purpose is coordinating sticker trades, and the moment a cambiador makes a request, the admin needs a single place to triage those requests. Without this page, the QR/public-exchange flow has no receiver and the value loop is broken.

## What Changes

- Add a real page at `/admin` (replacing the placeholder) that lists "sesiones de cambio" — requests submitted by cambiadores wanting to trade stickers.
- Each row shows: cambiador name, count of stickers offered, count of stickers the admin must give, creation date/time, and status (open/closed).
- Sort: open sessions first (newest to oldest by `createdAt`), closed sessions below (no specific order required).
- Visual differentiation between open and closed sessions using the project palette (azul FIFA for open, muted tokens for closed).
- Two actions per open row: accept (✓) and reject (✗). Accept opens a confirmation dialog before executing; reject runs immediately. Both update the list without a full page reload via Server Action + `revalidatePath`.
- Filters: text input for cambiador name (case-insensitive `includes`), tabs for status (todas / abiertas / cerradas). Filters are client-side over the data already fetched.
- Persistence in a JSON file (`data/sessions.json`) accessed through a repository abstraction (`src/lib/sessions-store.ts`) so it can be swapped for Prisma in a follow-up change without touching the UI or Server Actions.
- A seed file (`data/sessions.seed.json`) with 3 example sessions (2 open, 1 closed) is copied to `data/sessions.json` on first run.

## Capabilities

### New Capabilities
- `admin-sesiones`: Admin-side management of incoming trade sessions — list, filter, sort, accept, reject, with visual differentiation and real-time updates.

### Modified Capabilities
- (none) — `admin-auth` is reused as-is; the route is already protected by the existing middleware.

## Impact

- **New files**:
  - `src/app/admin/page.tsx` (Server Component)
  - `src/app/admin/actions.ts` (Server Actions: `acceptSession`, `rejectSession`)
  - `src/components/admin/session-list.tsx` (Client component, owns filter state)
  - `src/components/admin/session-row.tsx` (Client component, owns action buttons + dialog)
  - `src/components/admin/accept-dialog.tsx` (Dialog wrapper)
  - `src/components/admin/filter-bar.tsx` (Input + Tabs)
  - `src/components/admin/empty-state.tsx` (Empty state UI)
  - `src/lib/sessions.ts` (Types + Zod schemas)
  - `src/lib/sessions-store.ts` (JSON-file repository, swappable)
  - `data/sessions.seed.json` (committed seed data)
- **New runtime data**: `data/sessions.json` (gitignored, copied from seed on first access)
- **shadcn components used**: `card`, `button`, `dialog`, `input`, `badge`, `tabs` — all already installed
- **No new dependencies**
- **No DB / Prisma changes** in this change (deferred to a follow-up)
- **No breaking changes** to existing routes or auth flow
