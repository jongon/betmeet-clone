## Context

The project is a Mundial 2026 sticker exchange platform. Two specs are already merged: `design-system` (UI tokens, components, fonts) and `admin-auth` (Supabase login, middleware, session cookies). The middleware already protects `/` and `/admin/*` and redirects unauthenticated visitors to `/admin/login`, so any new `/admin` page is automatically behind auth — we don't need to touch auth.

What doesn't exist yet: the actual admin dashboard, the album module, the QR generation, and the public `/cambio/[token]` page where cambiadores create the trade sessions. This change delivers only the admin-side list of those sessions (read + accept/reject) with no public flow and no Prisma schema. Sessions are persisted to a JSON file through a repository so the next change can swap to Prisma without rewriting the UI.

## Goals / Non-Goals

**Goals:**
- Deliver the admin's "inbox" of trade sessions with list, filters, sort, and accept/reject actions.
- Persist sessions durably across reloads (JSON file) behind a swappable repository.
- Update the list without a full page reload after accept/reject.
- Use only already-installed shadcn primitives and the project palette (azul FIFA + rojo de marca + muted tokens).
- Stay within the boundaries of the existing `admin-auth` middleware (no new auth code, no new protected routes — `/admin` is the only new page).

**Non-Goals:**
- Public view at `/cambio/[token]` (next change).
- QR generation (next change).
- Prisma schema or DB migration (next change).
- Album/repetidos/faltantes module (separate change).
- Sign-out flow (separate change — only the "Sesiones" surface is delivered here).
- Real-time push (no websockets, no polling). Server Action + `revalidatePath` is enough; the list updates the next render after the action returns.
- Multi-admin concurrency safety. Single admin in this demo, file-based store is not concurrent-safe by design — flagged in Risks.

## Decisions

### 1. JSON-file repository instead of in-memory or Prisma
- **Choice**: A module `src/lib/sessions-store.ts` exports `getAllSessions()`, `acceptSession(id)`, `rejectSession(id)`. It reads/writes `data/sessions.json` (gitignored). On first read, if the file is missing, it copies from `data/sessions.seed.json` (committed).
- **Why**: The user needs persistence now, no DB available, and a real Prisma schema is explicitly out of scope. A JSON file survives reloads, is trivial to seed, and the repository boundary means the next change replaces the implementation in one place.
- **Alternatives considered**:
  - In-memory array: lost on every server restart, can't demo reliably.
  - localStorage: only on the admin's own browser, no source of truth for Server Components and no seed capability.
  - SQLite: heavier setup, doesn't bring us closer to the eventual Prisma/Postgres stack.
  - JSON file picked because it mirrors what Prisma will replace one-for-one (`findMany` / `update`).

### 2. Sort on the server, filter on the client
- **Choice**: The Server Component computes the open-first/closed-below sort. The Client Component owns the filter state (name input + status tabs) and filters in memory.
- **Why**: The sort is canonical and the same for every viewer, so it belongs on the server. The filter is a UI affordance over an already-fetched list of ≤10 items, so a round-trip per keystroke would be wasteful. Server Actions already re-render the page after mutations, so the freshly-sorted data flows back through props.
- **Alternatives considered**:
  - All client-side: would mean the initial render is unsorted, and the sort would re-run on every filter change.
  - All server-side with URL search params: would make the URL noisy and require `useSearchParams` plumbing; overkill for 10 items.

### 3. Server Actions + `revalidatePath` for updates
- **Choice**: `src/app/admin/actions.ts` exports `'use server'` functions `acceptSession(id)` and `rejectSession(id)`. They mutate via the repository, then call `revalidatePath('/admin')`. The Server Component re-renders with fresh data and the new list reaches the Client Component through props.
- **Why**: This is the canonical Next.js 16 pattern, no client-side fetch logic, no `useEffect`, and works with `useFormStatus` for the button's pending state.
- **Alternatives considered**:
  - Client-side `fetch` to a Route Handler: more wiring, breaks the server-action ergonomics, and doesn't get free re-render.
  - Optimistic UI with `useOptimistic`: nice but unnecessary here; the round-trip is local and the data list is small.

### 4. Accept = Dialog, Reject = no dialog
- **Choice**: The accept button opens a `Dialog` (already installed via shadcn) with confirm/cancel; the reject button fires the Server Action immediately.
- **Why**: This is the explicit product spec. Accepting is the irreversible commitment (the admin is agreeing to trade), so it warrants a confirmation step. Rejecting just dismisses the request and is safer to fire on a single click.
- **Implementation**: The `AcceptDialog` is a controlled component. The row's accept button toggles local state `isDialogOpen`; on confirm, the row calls the action via a `Form` whose submit is gated on the dialog's confirm. We pass `id` via a hidden input.

### 5. Repository swappability: typed boundary, not Prisma-shaped yet
- **Choice**: The repository returns/accepts the exact `Session` type and never leaks Node-only things (e.g., `fs`) to callers. The functions are async even though the JSON read is sync, so swapping to Prisma later is a type-preserving change.
- **Why**: Forces the right ergonomics for the next change (await the call) and keeps the UI agnostic of the store implementation.
- **Alternatives considered**:
  - Returning Prisma-shaped objects now: would lock the UI to Prisma's API and make the swap harder.

### 6. Visual differentiation via tokens, not literal colors
- **Choice**:
  - Open session row: `bg-primary/5 border-primary/20` (azul FIFA tint).
  - Closed session row: `bg-muted text-muted-foreground` (neutralized).
  - Open badge: `bg-brand text-white` (rojo de marca as accent).
  - Closed badge: `bg-muted text-muted-foreground`.
  - Accept icon button: `text-primary hover:bg-primary/10`.
  - Reject icon button: `text-destructive hover:bg-destructive/10`.
- **Why**: AGENTS.md forbids literal color values in components. Tokens automatically work in light/dark.
- **Alternatives considered**:
  - Custom CSS classes: more work, less aligned with shadcn/Tailwind v4 patterns.

### 7. Date formatting via `Intl.DateTimeFormat`
- **Choice**: Render `createdAt` with `new Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(session.createdAt))`.
- **Why**: Zero dependencies, server-side render friendly, locale-aware. No need for `date-fns` for one formatter.
- **Alternatives considered**:
  - `date-fns`: extra dep, overkill.
  - `<time dateTime={iso}>` with a custom formatter: not worth the indirection.

## Risks / Trade-offs

- **[File-store is not concurrent-safe]** → Acceptable for a single-admin demo. Documented in the spec as a known limitation. The next change (Prisma) removes the risk.
- **[Repository functions are sync internally but async externally]** → Slight ceremony. Mitigated by the small call sites.
- **[No optimistic UI]** → Brief flash of "stale" data after a click while the action runs. Mitigated by `useFormStatus` disabling the button so the user doesn't double-click; data is local and latency is low.
- **[Closed sessions are stored with a final `status: 'closed'`, no history]** → The spec says closed is definitive; no "reopen" exists. The store mirrors that: a `closed` session can't transition back. The action is a no-op on closed sessions (defensive — see spec scenario).
- **[Seed file drift]** → If `data/sessions.json` is ever deleted, the next read re-seeds from `sessions.seed.json`, losing user changes. Acceptable for a demo; production version uses Prisma.
- **[No automated tests in this change]** → Project has no test infrastructure yet. Verification is `pnpm lint` + `pnpm build` + manual QA with seed data.
