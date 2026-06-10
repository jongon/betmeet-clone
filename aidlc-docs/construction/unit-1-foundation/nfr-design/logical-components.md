# Unit 1: Foundation — Logical Components

## Component Map

```
┌─────────────────────────────────────────────────────────┐
│                   Next.js on Vercel                      │
│                                                          │
│  ┌──────────────────┐    ┌──────────────────────────┐   │
│  │  Auth Middleware  │    │   Server Actions Layer    │   │
│  │  (middleware.ts)  │    │  (auth / profile / avatar)│   │
│  └────────┬─────────┘    └───────────┬──────────────┘   │
│           │                          │                   │
│  ┌────────▼──────────────────────────▼──────────────┐   │
│  │           Supabase SSR Client Factory             │   │
│  │   createServerClient / createBrowserClient        │   │
│  └────────┬──────────────────────────┬──────────────┘   │
│           │                          │                   │
│  ┌────────▼─────────┐    ┌───────────▼────────────┐     │
│  │   Session Store   │    │   Validation Layer     │     │
│  │  (httpOnly cookies│    │   (Zod Schemas)        │     │
│  │   via @supabase/  │    │                        │     │
│  │   ssr)           │    └────────────────────────┘     │
│  └──────────────────┘                                   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Default Avatar Cache                    │   │
│  │     (Next.js unstable_cache, TTL 24h)            │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
          │                        │
          ▼                        ▼
┌─────────────────┐    ┌──────────────────────┐
│  Supabase Auth  │    │  Supabase PostgreSQL  │
│  (auth.users,   │    │  (profiles,           │
│   identities,   │    │   avatar_assets)      │
│   MFA, passkeys)│    │                       │
└─────────────────┘    │  ┌─────────────────┐ │
                       │  │  Profile Trigger │ │
                       │  │  (on auth insert)│ │
                       │  └─────────────────┘ │
                       └──────────────────────┘
                                │
                       ┌────────▼─────────┐
                       │ Supabase Storage  │
                       │  avatars/defaults/│
                       │  avatars/custom/  │
                       │  {user_id}/       │
                       └──────────────────┘
```

---

## Component 1: Auth Middleware

**File**: `src/middleware.ts`

**Responsibility**: Intercepts every HTTP request to a protected route, validates and refreshes the Supabase Auth session, enforces the onboarding gate, and redirects unauthenticated or incomplete users.

**Inputs**:
- Incoming `NextRequest` (includes session cookies)

**Outputs**:
- `NextResponse` with refreshed session cookies attached (on valid session)
- Redirect to `/auth/sign-in` (on missing or expired session)
- Redirect to `/onboarding/profile` (on valid session but `nickname_base IS NULL`)

**Routing logic**:

| Route pattern | Auth required | Gate checked |
|---|---|---|
| `/`, `/auth/*` | No | No |
| `/onboarding/*` | Yes (session only) | No |
| All other routes | Yes | Yes |

**Failure behavior**: Any error during session validation is treated as "no valid session" — redirect to `/auth/sign-in` (fail-closed).

---

## Component 2: Supabase SSR Client Factory

**Files**: `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`

**Responsibility**: Creates correctly configured Supabase clients for server and browser contexts. Server client reads/writes httpOnly cookies; browser client manages the local session for real-time subscriptions and client-side auth state.

**Server client** (`createServerClient` from `@supabase/ssr`):
- Used in: middleware, Server Components, Server Actions
- Reads session from request cookies; writes refreshed tokens to response cookies
- Accepts optional `cookieOptions` for "Remember me" max-age configuration

**Browser client** (`createBrowserClient` from `@supabase/ssr`):
- Used in: Client Components that need `onAuthStateChange` (e.g., `AuthProvider`)
- Reads session from cookies (not localStorage)
- Used to trigger session-expiry toast via `onAuthStateChange` listener

---

## Component 3: Session Store (Cookie-based)

**Technology**: HTTP cookies managed by `@supabase/ssr`

**Cookie properties**:

| Property | Value |
|---|---|
| `httpOnly` | `true` — not accessible from JavaScript |
| `secure` | `true` — HTTPS only |
| `sameSite` | `Lax` — protects against CSRF while allowing OAuth redirects |
| `maxAge` | Not set (session cookie) OR 30 × 24 × 3600 ("Remember me") |
| `path` | `/` |

**Contents**: Supabase access token (JWT) + refresh token. The access token is a signed JWT with a 1-hour expiry. The refresh token is a long-lived opaque token. Both are managed and rotated by Supabase Auth.

---

## Component 4: Profile Creation Trigger

**Technology**: PostgreSQL function + trigger on `auth.users`

**Location**: `supabase/migrations/{timestamp}_create_profile_trigger.sql`

**Behavior**: Fires `AFTER INSERT ON auth.users`. Creates a `profiles` row using:
- `id` = `NEW.id`
- `verification_status` = `'UNVERIFIED'` (overridden to `'VERIFIED'` by app code if provider is Google)
- `nickname_base` = `NULL`
- `avatar_url` = URL of a randomly selected default avatar from `avatar_assets`
- `avatar_source` = `'DEFAULT_SET'`
- `mfa_enabled` = `false`

**Why a trigger**: Guarantees the Profile row always exists when a session is valid, even if the OAuth callback Server Action fails or the user closes the browser immediately after authentication.

**Verification status correction**: Because the trigger always sets `UNVERIFIED`, the Google OAuth callback Server Action immediately updates the row to `VERIFIED` after sign-in when `provider = 'google'`.

---

## Component 5: Validation Layer (Zod Schemas)

**Files**: `src/features/auth/schemas.ts`, `src/features/profile/schemas.ts`

**Responsibility**: Single source of truth for all input validation rules used by both client forms and Server Actions.

**Key schemas**:

| Schema | Used by | Rules |
|---|---|---|
| `SignUpSchema` | SignUpForm + signUp action | email format, password ≥ 8 chars, confirmPassword match |
| `SignInSchema` | SignInForm + signIn action | email format, password not empty |
| `ResetPasswordSchema` | ResetPasswordForm + resetPassword action | password ≥ 8 chars, confirmPassword match |
| `NicknameBaseSchema` | NicknameInput + setNickname action | 3–20 chars, `^[a-zA-Z0-9_-]+$` |
| `AvatarUploadMetaSchema` | Server Action only | mimeType in allowed set, size ≤ 5 MB |
| `ChangePasswordSchema` | ChangePasswordForm + changePassword action | currentPassword not empty, newPassword ≥ 8 chars, confirm match |
| `EmailChangeSchema` | EmailChangeForm + changeEmail action | valid email format |

---

## Component 6: Signed URL Generator

**File**: `src/features/profile/actions/create-avatar-upload-url.ts`

**Responsibility**: Generates a short-lived Supabase Storage signed upload URL scoped to the authenticated user's storage path. Returns the URL and target path to the client. The client uploads directly to Supabase Storage using this URL.

**Security properties**:
- URL is scoped to `avatars/custom/{userId}/` — a user cannot upload to another user's path
- Signed URL expires in 60 seconds
- File type and size are validated server-side via `AvatarUploadMetaSchema` before the URL is issued

---

## Component 7: Default Avatar Cache

**File**: `src/features/profile/queries.ts`

**Technology**: Next.js `unstable_cache`

**Responsibility**: Caches the list of `AvatarAsset` rows (default avatar set) for 24 hours. Eliminates repeated Supabase DB queries for the avatar picker grid.

**Interface**:
```
getDefaultAvatars() → Promise<AvatarAsset[]>
```

**Cache behavior**:
- TTL: 86,400 seconds (24 hours)
- Cache key: `['default-avatars']`
- Invalidation: automatic after TTL; manual via `revalidateTag('default-avatars')` in the seed script

---

## Component 8: Avatar Storage Layout

**Technology**: Supabase Storage (bucket: `avatars`)

**Directory structure**:

```
avatars/
├── defaults/          ← public read, admin write only
│   ├── blue-fox.png
│   ├── red-eagle.png
│   └── ...
└── custom/            ← private, user-scoped RLS
    └── {user_id}/
        ├── {ts}_{filename}.jpg     ← current custom upload
        └── (previous files deleted on replace)
```

**Access rules**:
- `avatars/defaults/*` — public read (no auth required for display)
- `avatars/custom/{user_id}/*` — read/write only by the owner (`auth.uid() = user_id`), enforced by Supabase Storage RLS policy

---

## Component 9: CSP Violation Reporter

**File**: `src/app/api/csp-report/route.ts`

**Responsibility**: Receives CSP violation reports from browsers during report-only mode and writes them to structured logs (Vercel log drain).

**Input**: POST body with `application/csp-report` content type (browser-sent violation JSON)

**Output**: Structured log entry to `console.warn`:
```json
{ "event": "csp.violation", "blockedUri": "...", "violatedDirective": "...", "timestamp": "..." }
```

**Lifecycle**: Removed or converted to no-op when CSP transitions from report-only to enforcement mode.

---

## Component 10: Auth Event Logger

**File**: `src/lib/auth-logger.ts`

**Responsibility**: Writes structured auth security events to `console.error` (captured by Vercel log drain).

**Logged events** (minimal policy):
- `auth.sign_in_failed`
- `auth.account_deleted`

**Log entry schema**:
```typescript
{
  event: string
  userId: string | null
  email: string        // redacted: "jon***@gmail.com"
  timestamp: string    // ISO 8601
  reason?: string
}
```

**Email redaction utility**: `redactEmail(email)` keeps the first 3 characters before `@` and the full domain. Prevents PII storage in log systems.
