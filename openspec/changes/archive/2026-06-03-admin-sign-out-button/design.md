## Context

`admin-auth` provides a complete login + middleware + cookie-refresh flow but defers sign-out. The current `/admin` page (the admin home / sessions list) has a header that shows the user's email but no way to terminate the session. From a user-flow perspective, an admin who finishes their shift needs a visible affordance to log out, especially on shared devices.

This change is a small, focused addition. The Supabase SSR cookie machinery is already in place, so sign-out reduces to one `auth.signOut()` call followed by a redirect — but we want to do it in a Server Action (so cookies are written via the same SSR client used everywhere else) and surface it from a Client component (so we get a clean pending state during the round-trip).

## Goals / Non-Goals

**Goals:**
- Give the admin a single, discoverable "Cerrar sesión" control in the top-right of `/admin`.
- Terminate the Supabase session server-side and clear the SSR cookies, then land the user on `/admin/login`.
- Disable the button while the action is in flight to prevent double-clicks.
- Update `admin-auth` spec to record the new requirement.

**Non-Goals:**
- Revoking all sessions for the user (Supabase `signOut()` is "scope = local" — it only kills the current session; we don't loop through admin's other devices).
- A global sign-out from any page (only from `/admin`).
- A dropdown menu, account settings, or any other user-menu UX. Just the button, top-right.
- Anything related to the public flow (`/cambio/[token]`) — no cambiador-facing auth.

## Decisions

### 1. Server Action over a Route Handler
- **Choice**: `'use server'` action `signOut()` in a new `src/app/admin/auth-actions.ts` file.
- **Why**: Matches the rest of the auth flow (signIn is already a Server Action). Server Actions get free cookie writes via `setAll` in the same `createSupabaseServerClient` we use elsewhere. No new HTTP surface.
- **Alternatives considered**:
  - `POST /api/auth/signout` Route Handler: more wiring, no benefit, breaks the action pattern.
  - Client-side `supabase.auth.signOut()` from the browser client: would not clear the httpOnly cookies set by the SSR client; would leave the middleware thinking the user is still logged in until the next refresh.

### 2. Client wrapper component with `useTransition`
- **Choice**: `SignOutButton` is a small client component that renders a shadcn `Button`, calls `startTransition` on click, and disables itself while pending. The label switches to "Cerrando…" during the transition.
- **Why**: Same pattern as the existing reject/accept buttons. The user gets a visible "this is working" cue and can't double-fire. No need to invent a different mechanism (e.g., a `<Form>` + `useFormStatus`) for a single click handler.
- **Alternatives considered**:
  - `<form action={signOut}>` + `useFormStatus`: more boilerplate, no gain since there's no progressive enhancement story (the button is on a protected route that requires JS-rendered Supabase state anyway).

### 3. Where to place the button
- **Choice**: Inside the existing `<header>` of `/admin`, restructured so the title group sits on the left and the sign-out button on the right, with the email line wrapping below on narrow screens.
- **Why**: Top-right is the explicit ask. The header already exists, so this is a structural change, not a new region. The `gap-3` and `justify-between` on the new flex row keep the visual rhythm of the existing card.
- **Layout sketch**:
  ```
  ┌────────────────────────────────────────────────────┐
  │ Sesiones de cambio [3 abiertas]      [Cerrar ses]  │
  │ Sesión iniciada como user@x                         │
  └────────────────────────────────────────────────────┘
  ```

### 4. Post-logout destination
- **Choice**: Hardcode `/admin/login` as the redirect target. Do not honor any incoming `next` param.
- **Why**: After sign-out, the user is unauthenticated. The middleware will already redirect to `/admin/login` for any `/admin/*` access, but redirecting explicitly inside the Server Action avoids a second network round-trip and gives the user immediate feedback that they're out.
- **Alternatives considered**:
  - `redirect("/")`: pointless now that `/` always sends to login or `/admin`.
  - Honor `next`: opens a small redirect-loop risk if `next` is something the user no longer has access to.

### 5. Where to put the action file
- **Choice**: New file `src/app/admin/auth-actions.ts` rather than reusing `src/app/admin/login/actions.ts` or `src/app/admin/actions.ts`.
- **Why**: The login actions file is scoped to the login page (and contains `signIn`). The sessions actions file is scoped to the sessions feature. Auth actions (sign-out, and future things like password change) deserve their own file colocated with the admin routes.

## Risks / Trade-offs

- **[Sign-out is local scope only]** → If the admin has sessions on other devices, those stay active. Documented as a Non-Goal; the spec's scenario only covers the current session.
- **[Button position collides with title on very narrow screens]** → The flex row wraps by default, so on <640px the button drops below the title. Verified acceptable in the design.
- **[`signOut()` may throw]** → If it does, the Server Action surfaces the error to the client (useTransition goes back to idle but no redirect happens). For this change we accept that — a "Cerrar sesión" failure is recoverable (admin can clear cookies manually), and we don't want to mask it with a generic error toast.
