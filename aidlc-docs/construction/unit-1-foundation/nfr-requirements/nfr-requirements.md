# Unit 1: Foundation — NFR Requirements

## Scale Baseline

| Parameter | Target |
|---|---|
| Registered users at launch | ~500 |
| Peak concurrent auth sessions | ~100 (estimated 20% of users active during match windows) |
| Peak avatar uploads | ~50 per hour (onboarding burst at launch) |
| Nickname availability checks | ~200 per hour (burst during onboarding) |

The Supabase Free or Pro tier and the Vercel Hobby or Pro plan are both sufficient for this scale. No complex horizontal scaling is required for v1.

---

## Performance Requirements

### Auth Operations

| Operation | Target Response Time | Notes |
|---|---|---|
| Sign in (email/password) | < 2 s end-to-end | Includes Supabase Auth round-trip |
| Google OAuth redirect + callback | < 3 s end-to-end | Includes Google OAuth round-trip |
| Sign up (form submit) | < 2 s | Includes Supabase Auth + Profile row creation |
| MFA TOTP verify | < 1 s | Server-side only |
| Passkey assertion | < 2 s | Includes WebAuthn ceremony |

### Profile and Onboarding

| Operation | Target |
|---|---|
| Onboarding wizard page load (LCP) | < 1.5 s |
| Nickname step submission (server action) | < 500 ms |
| Nickname availability check (debounced) | Server response < 200 ms per check |
| Default avatar set load | < 1 s (cached server-side on startup) |
| Avatar selection save | < 500 ms |
| Custom avatar upload (5 MB) | < 10 s with visible progress indicator |

### Settings Pages

| Operation | Target |
|---|---|
| Profile settings page load | < 1.5 s |
| Security settings page load | < 1.5 s |
| Nickname change | < 500 ms |
| Email change request submit | < 1 s |
| Password change submit | < 1 s |
| Account deletion | < 2 s |

---

## Session Management Requirements

### Default Session (no "Remember me")

- **Access token duration**: 1 hour (Supabase JWT expiry)
- **Session cookie type**: Session cookie (cleared when browser is closed)
- **Auto-refresh**: Access token auto-refreshed by Supabase Auth SDK while session cookie is active
- **Inactivity expiry**: 7 days — if the user does not open the app for 7 days the session is invalidated and re-authentication is required

### "Remember me" Session

- **Trigger**: User checks "Remember me" on the sign-in form
- **Refresh token persistence**: 30 days
- **Cookie type**: Persistent cookie (not cleared on browser close), `Max-Age = 30 days`
- **Auto-refresh**: Same access token auto-refresh applies
- **Inactivity expiry**: 30 days from last activity

### Session Security Properties

- Session tokens stored in `httpOnly`, `Secure`, `SameSite=Lax` cookies (managed by Supabase SSR helpers)
- Access tokens are never exposed to `localStorage` or client-readable storage
- Sign-out invalidates the session on Supabase Auth server side and clears all session cookies

---

## Security NFR Requirements

### Rate Limiting

- **Auth endpoints**: Rely on Supabase Auth's built-in brute-force protection (no additional application-level rate limiting in v1)
- **Avatar upload**: Enforce max file size (5 MB) at the Server Action level before the upload is attempted; file type validation also server-side
- **Nickname check endpoint**: Debounce at client (500 ms) to limit server queries; no server-side rate limiting required at this scale

### Link Expiry

| Link Type | Expiry |
|---|---|
| Email verification link | 1 hour |
| Password reset link | 1 hour |
| Email change confirmation link | 1 hour |

### Storage Security

- Custom avatar files are stored under `avatars/custom/{user_id}/` — path scoped to the user's own ID
- Supabase Storage RLS policy ensures each user can only read/write their own `avatars/custom/{user_id}/` path
- Default avatar set (`avatars/defaults/`) is public read-only

### File Security

- Avatar upload file type must be validated server-side (MIME type check, not just extension) before upload is accepted
- Maximum file size enforced server-side; any upload exceeding 5 MB is rejected before writing to storage

---

## Availability Requirements

- **Auth availability**: Delegated entirely to Supabase Auth (target: 99.9% uptime per Supabase SLA on Pro plan)
- **Degraded state behavior**: If Supabase Auth is unavailable, the sign-in and sign-up forms show a clear error ("Authentication service is temporarily unavailable. Please try again shortly."). Public/static pages remain accessible.
- **No custom failover**: v1 does not implement a custom auth fallback; Supabase HA is the sole availability mechanism
- **Avatar storage**: If Supabase Storage is unavailable during upload, the upload fails gracefully with a user-facing error; the existing avatar is unaffected

---

## Accessibility Requirements

**Target level**: WCAG 2.1 Level AA

### Scope

Applies to all Unit 1 UI surfaces: auth pages, onboarding wizard, profile settings, security settings.

### Requirements

| Category | Requirement |
|---|---|
| Color contrast | Text ≥ 4.5:1 contrast ratio (normal text), ≥ 3:1 (large text, UI components) |
| Keyboard navigation | All interactive elements reachable and activatable via keyboard (Tab, Enter, Space, arrow keys) |
| Focus indicators | Visible focus ring on all focusable elements |
| Screen reader support | ARIA labels on all form inputs, error messages in `aria-live` regions, buttons with descriptive labels |
| Error identification | Form errors identified in text (not color alone) and associated to the relevant input via `aria-describedby` |
| Avatar grid | Navigable with arrow keys; selected state communicated to screen readers via `aria-selected` |
| Onboarding steps | Step indicator communicates current step to screen readers |
| Modals | Focus trapped within modal while open; `Escape` closes; returns focus to trigger on close |

---

## Reliability Requirements

### Nickname Availability Check

- Check is debounced at 500 ms client-side to avoid excessive server load while typing
- The form "Next" button is disabled while a check is in-flight
- If the check request fails (network error), show inline error and allow retry; do not block the form indefinitely

### Avatar Upload

- Show a progress bar during upload
- If upload fails partway, clean up any partial file in Supabase Storage
- On upload success, delete the previously stored custom avatar file (replace strategy)

### Email Verification

- If the verification email is not received, the user can request a resend from the `/auth/verify-email` page (throttled to once per 60 seconds per user)

### Account Deletion

- Deletion is transactional: soft-delete the Profile first, then call Supabase Admin API to delete auth.users. If the Admin API call fails, the soft-delete is rolled back to avoid a broken state where the profile is deleted but auth still works.

---

## Maintainability Requirements

- All Server Actions for auth and profile must be covered by integration tests against a real Supabase test project (not mocked)
- Zod schemas used for input validation must be shared between client-side (form feedback) and server-side (Server Action validation)
- Avatar upload logic must be encapsulated in a single service function to avoid duplication between onboarding and settings
