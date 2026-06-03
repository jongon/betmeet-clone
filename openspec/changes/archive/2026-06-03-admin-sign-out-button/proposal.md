## Why

The admin auth flow lands the coleccionista on `/admin` but offers no way out — once logged in, the only way to switch accounts or free up the browser is to manually clear cookies. The `admin-auth` spec explicitly marks sign-out as "fuera de alcance de este change", so we need a focused follow-up that closes the loop.

## What Changes

- Add a sign-out control in the top-right corner of the `/admin` header, visible to any authenticated admin.
- A new Server Action `signOut` calls `supabase.auth.signOut()`, then redirects to `/admin/login` so the next visitor lands on the form.
- The button uses a shadcn `Button` with a `LogOut` icon and a "Cerrar sesión" label, placed on the same row as the page title so it sits at the right edge on desktop and wraps below on mobile.
- During the action the button is disabled and shows a "Cerrando…" pending state via `useTransition` (same pattern as the existing reject button).
- The `admin-auth` spec gains an explicit requirement for the sign-out action and the protected route guarantees the user has a session before the button is reachable.

## Capabilities

### New Capabilities
- `admin-sign-out`: Admin-initiated session termination — Server Action + button on `/admin` + post-logout redirect.

### Modified Capabilities
- `admin-auth`: Adds a requirement that the sign-out Server Action is exposed and that authenticated admins can invoke it from a `/admin` surface.

## Impact

- **New files**:
  - `src/app/admin/auth-actions.ts` (`'use server'` Server Action `signOut`)
  - `src/components/admin/sign-out-button.tsx` (Client component wrapping the action with `useTransition`)
- **Modified files**:
  - `src/app/admin/page.tsx` — header restructured into a flex row with title left, sign-out button right
  - `openspec/specs/admin-auth/spec.md` — ADDED requirement "El admin puede cerrar sesión desde /admin"
- **shadcn components used**: `button` (already installed), `lucide-react` `LogOut` icon (already installed)
- **No new dependencies**
- **No breaking changes** — existing routes and behavior unchanged when not interacting with the new button
