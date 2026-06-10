# Unit 1: Foundation — NFR Design Patterns

## Pattern 1: Session Refresh with Toast-on-Expiry (Resilience)

**NFR addressed**: Session refresh failure behavior (Q2 → Toast + redirect).

**Design**:

```
Request arrives
    │
    ▼
Next.js Middleware (src/middleware.ts)
    │── calls updateSession(request) via @supabase/ssr
    │── on success: attach refreshed cookies to response, continue
    │── on failure (token expired / revoked):
    │       set response cookie: session_expired=1 (max-age=10s)
    │       redirect to /auth/sign-in
    │
    ▼
Client-side AuthProvider (src/components/providers/auth-provider.tsx)
    │── listens to supabase.auth.onAuthStateChange
    │── on event SIGNED_OUT or TOKEN_REFRESHED error:
    │       read session_expired cookie
    │       if present: show toast("Your session has expired")
    │       wait 2 seconds
    │       router.push("/auth/sign-in")
```

**Key constraint**: The session_expired cookie has a 10-second max-age to avoid stale banners on browser back/forward navigation.

---

## Pattern 2: "Remember Me" Cookie Expiry Branching (Security)

**NFR addressed**: Session duration with optional 30-day persistence.

**Design**:

```
SignInServerAction(email, password, rememberMe: boolean)
    │
    ▼
supabase.auth.signInWithPassword({ email, password })
    │── session returned
    ▼
createServerClient with custom cookieOptions:
    rememberMe=false → { httpOnly: true, secure: true, sameSite: 'lax' }
                        (no maxAge → session cookie, cleared on browser close)
    rememberMe=true  → { httpOnly: true, secure: true, sameSite: 'lax',
                          maxAge: 30 * 24 * 60 * 60 }
                        (30-day persistent cookie)
```

Both branches use `httpOnly: true, secure: true`. The only difference is the presence and value of `maxAge`.

---

## Pattern 3: Fail-Closed Route Protection (Security / Resilience)

**NFR addressed**: Auth availability, onboarding gate.

**Design**:

```
Every request to a protected route passes through src/middleware.ts:

1. Call updateSession(request)
   ├── No valid session → redirect /auth/sign-in          [fail-closed]
   └── Valid session → continue

2. Check Profile.nickname_base
   ├── null (onboarding incomplete) → redirect /onboarding/profile
   └── set → continue to requested route

Exempt routes (no auth check):
  /auth/*, /onboarding/*, /, /rules (public)
```

**Fail-closed principle**: Any error in session validation (network error, DB error) is treated as "no valid session" and redirects to sign-in. Access is never granted on ambiguous state.

---

## Pattern 4: Input Validation Gate — Shared Zod Schemas (Security)

**NFR addressed**: SECURITY-05 (input validation at every boundary).

**Design**:

```
src/features/auth/schemas.ts
src/features/profile/schemas.ts
        │
        ├── imported by Client Components
        │       → React Hook Form zodResolver (real-time feedback)
        │
        └── imported by Server Actions
                → schema.safeParse(input) at the top of every action
                → on failure: return { error: fieldErrors } immediately
                → no database call occurs on invalid input
```

**Invariant**: Client and server always validate against the same schema. A change to a rule (e.g., max nickname length) propagates to both automatically.

---

## Pattern 5: Avatar Upload — Signed URL + Atomic Replace (Resilience)

**NFR addressed**: Avatar upload failure handling, replace storage strategy.

**Design**:

```
Step 1 — Generate signed URL (Server Action: createAvatarUploadUrl)
    │── authenticate user
    │── build path: avatars/custom/{userId}/{timestamp}_{filename}
    │── call supabase.storage.createSignedUploadUrl(path)
    │── return { signedUrl, path } to client

Step 2 — Client uploads directly to Supabase Storage
    │── PUT file to signedUrl with progress tracking
    │── on failure: show error, no profile change (old avatar intact)
    │── on success: call setAvatarFromUpload(newPath)

Step 3 — Atomic update (Server Action: setAvatarFromUpload)
    │── read Profile.avatar_source and Profile.avatar_url
    │── if avatar_source === CUSTOM_UPLOAD:
    │       delete old file from Supabase Storage (fire-and-forget, non-blocking)
    │── update Profile: avatar_url = newPath, avatar_source = CUSTOM_UPLOAD
    │── return { success: true }
```

**Failure modes**:
- Upload fails → no Server Action called → profile unchanged ✓
- Server Action fails after upload → orphaned file in storage (cleaned up by future uploads to same user path, acceptable at this scale) ✓

---

## Pattern 6: Debounced Availability Check (Performance)

**NFR addressed**: Nickname availability feedback < 200 ms server response, debounce 500 ms.

**Design**:

```
NicknameInput (Client Component)
    │── useDebounce(value, 500ms)
    │── on debounced value change: call checkNicknameAvailability(base)
    │── states: idle | checking | available | unavailable | error
    │
    ▼
checkNicknameAvailability (Server Action)
    │── validate format with NicknameBaseSchema (return error if invalid)
    │── SELECT COUNT(*) FROM profiles WHERE nickname_base = $1
    │        AND deleted_at IS NULL
    │── return { available: boolean }
    │
    ▼
NicknameInput renders:
    checking   → spinner icon
    available  → green checkmark + "Available"
    unavailable → amber icon + "Taken — a new number will be assigned"
    error      → red icon + "Could not check availability"

Submit button is disabled while state = 'checking'
```

**Note**: "Taken" is informational, not blocking — the server still assigns a random discriminator at submission time. The check only indicates whether the base has any existing users.

---

## Pattern 7: Content Security Policy — Report-Only Mode (Security)

**NFR addressed**: CSP covering Google OAuth + Supabase Storage, moderate mode (Q1 → B).

**Design**:

CSP is configured in `next.config.ts` via the `headers()` function:

```
Content-Security-Policy-Report-Only:
  default-src 'self';
  script-src  'self' 'unsafe-inline' 'unsafe-eval'
              https://accounts.google.com;
  style-src   'self' 'unsafe-inline';
  img-src     'self' data: blob:
              https://{SUPABASE_PROJECT_REF}.supabase.co
              https://lh3.googleusercontent.com;
  connect-src 'self'
              https://{SUPABASE_PROJECT_REF}.supabase.co
              https://accounts.google.com;
  frame-src   https://accounts.google.com;
  font-src    'self';
  report-uri  /api/csp-report;
```

**Transition plan**: After the first 2 weeks of production traffic with no unintended violations, switch the header from `Content-Security-Policy-Report-Only` to `Content-Security-Policy` (enforcement mode).

`/api/csp-report` is a minimal Next.js route handler that logs the violation payload to structured logs.

---

## Pattern 8: WCAG AA Accessibility Pattern (Usability)

**NFR addressed**: WCAG 2.1 Level AA for all Unit 1 UI surfaces.

**Design**:

```
Shared components enforce AA by convention:

<FormField>       wraps <label htmlFor> + <Input id> + <FormError>
<FormError>       role="alert" aria-live="polite" — announced on change
<Modal>           Radix UI Dialog — focus trapped, Escape closes,
                  focus returns to trigger on close
<AvatarGrid>      role="listbox", items role="option" aria-selected
                  arrow key navigation via keyboard handler
<OnboardingStep>  aria-label="Step {n} of {total}: {title}"
                  progress bar aria-valuenow aria-valuemax
```

Color contrast targets enforced via CSS variables in `globals.css`:
- `--foreground` on `--background`: ≥ 4.5:1
- `--muted-foreground` on `--background`: ≥ 4.5:1
- Focus ring: 2px solid `--ring` color, ≥ 3:1 against adjacent background

---

## Pattern 9: Default Avatar Set Cache (Performance)

**NFR addressed**: Avatar set loaded once per 24 hours, not on every request.

**Design**:

```
src/features/profile/queries.ts

export const getDefaultAvatars = unstable_cache(
  async () => {
    return prisma.avatarAsset.findMany({
      orderBy: { display_order: 'asc' },
    })
  },
  ['default-avatars'],
  { revalidate: 86400 }   // 24 hours
)
```

- First request after deployment: cold hit — fetches from DB (~50 ms)
- Subsequent requests: warm cache — returns in-memory result (~1 ms)
- Seed changes: visible within 24 hours without redeploy

---

## Pattern 10: Minimal Auth Event Logging (Observability)

**NFR addressed**: Log failed sign-in attempts and account deletions (Q4 → A).

**Design**:

Structured log entries use a consistent JSON schema written to `console.error` (picked up by Vercel log drain):

```json
{
  "event": "auth.sign_in_failed" | "auth.account_deleted",
  "userId": "<uuid or null>",
  "email": "<redacted — first 3 chars + domain only>",
  "timestamp": "<ISO 8601>",
  "reason": "<string>"
}
```

**Email redaction**: Full email is never logged. Only the first 3 characters + domain are retained (e.g., `jon***@gmail.com`) to enable investigation without storing PII in logs.

**Logged events**:
- `auth.sign_in_failed` — logged in the sign-in Server Action on Supabase Auth error
- `auth.account_deleted` — logged in the deleteAccount Server Action after soft-delete completes

**Not logged** (minimal policy): successful sign-ins, sign-outs, OAuth completions, MFA events, passkey events.
