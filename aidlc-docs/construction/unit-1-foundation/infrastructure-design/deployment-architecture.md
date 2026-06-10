# Unit 1: Foundation — Deployment Architecture

## Environments Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    LOCAL DEVELOPMENT                             │
│                                                                  │
│  Browser (localhost:3000)                                        │
│      │                                                           │
│      ▼                                                           │
│  Next.js Dev Server (pnpm dev)                                  │
│      │                    │                                      │
│      ▼                    ▼                                      │
│  Supabase CLI         Mailpit SMTP Trap                          │
│  (localhost:54321)    (localhost:8025 web / 1025 smtp)          │
│  ├── Auth             All auth emails visible at               │
│  ├── PostgreSQL       http://localhost:8025                     │
│  └── Storage                                                     │
│  (via docker-compose)                                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    PREVIEW (Pull Requests)                        │
│                                                                  │
│  Browser                                                         │
│      │                                                           │
│      ▼                                                           │
│  Vercel Preview URL                                              │
│  (*.vercel.app — auto-generated per PR)                         │
│      │                          │                               │
│      ▼                          ▼                               │
│  Supabase Dev Project        Resend (test key)                  │
│  (shared across previews)    Auth emails delivered              │
│  ├── Auth                                                        │
│  ├── PostgreSQL                                                  │
│  └── Storage                                                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCTION                                     │
│                                                                  │
│  Browser                                                         │
│      │                                                           │
│      ▼                                                           │
│  Vercel Edge Network (CDN)                                      │
│  ├── Static assets cached at edge                               │
│  ├── next/image optimization cached at edge                     │
│  └── Serverless function invocations                            │
│      │                          │                               │
│      ▼                          ▼                               │
│  Supabase Production         Resend (production key)            │
│  ├── Auth                    Auth emails delivered              │
│  │   ├── Email/Password      (3,000/month free tier)           │
│  │   ├── Google OAuth                                           │
│  │   ├── Passkeys (WebAuthn)                                    │
│  │   └── MFA (TOTP)                                             │
│  ├── PostgreSQL                                                  │
│  │   ├── profiles table                                          │
│  │   ├── avatar_assets table                                     │
│  │   └── Profile creation trigger                               │
│  └── Storage (avatars bucket)                                   │
│      ├── avatars/defaults/ (public)                             │
│      └── avatars/custom/{user_id}/ (private, RLS)              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Production Request Flow

### Sign-in (Email/Password)

```
Browser
  │── POST /auth/sign-in (Server Action)
  │
  ▼
Vercel Serverless Function
  │── createServerClient(@supabase/ssr)
  │── supabase.auth.signInWithPassword(email, password)
  │
  ▼
Supabase Auth Service
  │── validates credentials
  │── returns session (access token + refresh token)
  │
  ▼
Vercel Serverless Function
  │── sets httpOnly session cookies on response
  │── if rememberMe: cookie maxAge = 30 days
  │── redirects to /home or /onboarding/profile
  │
  ▼
Browser (receives cookies, navigates)
```

### Google OAuth Sign-in

```
Browser
  │── GET /auth/callback (Supabase OAuth redirect target)
  │
  ▼
Vercel Serverless Function (route handler)
  │── supabase.auth.exchangeCodeForSession(code)
  │── if new user: trigger creates Profile row (DB trigger)
  │── if Google user: Server Action updates verification_status = VERIFIED
  │── sets session cookies
  │── redirects to /onboarding/profile (if no nickname) or /home
  │
  ▼
Browser
```

### Avatar Upload

```
Browser
  │── calls createAvatarUploadUrl() Server Action
  │
  ▼
Vercel Serverless Function
  │── authenticates user via session cookie
  │── calls supabase.storage.createSignedUploadUrl(path)
  │── returns { signedUrl, path } to browser
  │
  ▼
Browser
  │── PUT file directly to Supabase Storage (signedUrl)
  │── progress tracked client-side
  │── on success: calls setAvatarFromUpload(path) Server Action
  │
  ▼
Vercel Serverless Function
  │── if previous custom upload exists: supabase.storage.remove([oldPath])
  │── prisma.profile.update({ avatar_url, avatar_source })
  │── returns { success: true }
  │
  ▼
Browser (updates avatar display)
```

### Session Refresh (Middleware)

```
Every protected route request
  │
  ▼
src/middleware.ts (Vercel Edge Middleware)
  │── reads session cookies from request
  │── calls supabase.auth.updateSession() via @supabase/ssr
  │── on success: attaches refreshed cookies to response, continues
  │── on failure: sets session_expired cookie (10s), redirects /auth/sign-in
```

---

## Environment Variable Mapping

### Local (`.env.local`)

```bash
# Supabase local (from `supabase start` output)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<local-service-role-key>

# Mailpit (no real SMTP needed locally)
# Auth emails are configured via supabase/config.toml:
# [auth.email]
# smtp_host = "localhost"
# smtp_port = 1025
```

### Vercel Preview (set in Vercel dashboard)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<dev-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<dev-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<dev-service-role-key>
RESEND_API_KEY=<resend-test-key>
```

### Vercel Production (set in Vercel dashboard)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<prod-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<prod-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<prod-service-role-key>
RESEND_API_KEY=<resend-production-key>
```

---

## Supabase CLI Local Setup

The `supabase/` directory at the workspace root manages local Supabase configuration and migrations.

```
supabase/
├── config.toml          ← local Supabase configuration (auth, storage, SMTP)
├── migrations/
│   ├── 001_create_profiles.sql
│   ├── 002_create_avatar_assets.sql
│   ├── 003_create_profile_trigger.sql
│   └── 004_storage_rls_policies.sql
└── seed.sql             ← inserts default avatar_assets rows (for local dev)
```

**Commands**:
- `supabase start` — start local Supabase (runs Docker containers)
- `supabase db push` — apply pending migrations to the target project
- `supabase db reset` — reset local DB and re-apply migrations + seed
- `supabase gen types typescript --local > src/types/supabase.ts` — regenerate DB types

---

## Docker Compose (Local Development)

The existing `docker-compose.yml` is extended with a Mailpit service for local email capture. Supabase local services are managed by the Supabase CLI (not docker-compose directly).

```yaml
services:
  # ... existing services ...

  mailpit:
    image: axllent/mailpit:latest
    container_name: mailpit
    restart: unless-stopped
    ports:
      - "8025:8025"    # Web UI: http://localhost:8025
      - "1025:1025"    # SMTP trap
    environment:
      MP_SMTP_AUTH_ACCEPT_ANY: "1"
      MP_SMTP_AUTH_ALLOW_INSECURE: "1"
```

Supabase Auth local SMTP is pointed to Mailpit via `supabase/config.toml`:

```toml
[auth.email]
enable_confirmations = true

[auth.external.smtp]
enabled = true
host = "localhost"
port = 1025
user = "any"
pass = "any"
sender_name = "Quiniela 2026"
```

---

## Google OAuth Setup (Production)

Steps to configure before launch:

1. Create a project in Google Cloud Console.
2. Enable the **Google Identity** (OAuth 2.0) API.
3. Create OAuth credentials (Web application type).
4. Add authorized redirect URIs:
   - Production: `https://<supabase-prod-ref>.supabase.co/auth/v1/callback`
   - Preview: `https://<supabase-dev-ref>.supabase.co/auth/v1/callback`
5. Copy Client ID + Client Secret into Supabase Auth → Providers → Google.
