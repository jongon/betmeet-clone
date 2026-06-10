# Unit 1: Foundation — Infrastructure Design

## Supabase Project Configuration

### Plan
**Free tier** for v1. Relevant limits for Unit 1:

| Resource | Free limit | Unit 1 usage estimate |
|---|---|---|
| Database | 500 MB | ~5 MB (500 profiles + avatar_assets) |
| Storage | 1 GB | ~500 MB (500 custom avatars × ~1 MB avg) |
| File upload per request | 50 MB | 5 MB max (avatar constraint) |
| Image transforms API | Not available | N/A — replaced by `next/image` |
| Auth users | Unlimited | ~500 |
| Edge Function invocations | 500k/month | <500/month (profile trigger) |

**Thumbnail strategy adjustment**: Because the Free tier does not include Supabase Storage image transforms, avatars are served via Next.js `<Image>` component. Vercel Image Optimization (included in all Vercel plans) resizes images on the fly and caches the result at the CDN edge.

---

### Supabase Auth Settings

| Setting | Value |
|---|---|
| Email confirmation | Required (traditional sign-up) |
| Email verification expiry | 3600 seconds (1 hour) |
| Password reset expiry | 3600 seconds (1 hour) |
| Email change confirmation | Required (sent to new address) |
| Google OAuth | Enabled — Client ID + Secret from Google Cloud Console |
| Passkeys (WebAuthn) | Enabled |
| MFA (TOTP) | Enabled |
| SMTP provider | Custom (Resend) — see Email Provider section |
| Auto-confirm users | Disabled (email verification is mandatory for email accounts) |

---

### Supabase Auth Email Templates

Three templates must be customized with the app name and branding:
- **Confirm signup** — sent on email/password registration
- **Reset password** — sent on forgot-password request
- **Change email** — sent to the new email address when changed

Template placeholders to use: `{{ .ConfirmationURL }}`, `{{ .SiteURL }}`.

---

### Database: Tables and RLS

#### Table: `profiles`

```sql
CREATE TABLE public.profiles (
  id                     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname_base          VARCHAR(20),
  nickname_discriminator CHAR(4),
  avatar_url             TEXT NOT NULL DEFAULT '',
  avatar_source          TEXT NOT NULL DEFAULT 'DEFAULT_SET'
                           CHECK (avatar_source IN ('GOOGLE_PHOTO','DEFAULT_SET','CUSTOM_UPLOAD')),
  verification_status    TEXT NOT NULL DEFAULT 'UNVERIFIED'
                           CHECK (verification_status IN ('UNVERIFIED','VERIFIED','ADMIN')),
  mfa_enabled            BOOLEAN NOT NULL DEFAULT false,
  deleted_at             TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (nickname_base, nickname_discriminator)
);
```

**RLS policies**:

| Operation | Policy |
|---|---|
| SELECT own row | `auth.uid() = id` |
| SELECT other users' public fields | `deleted_at IS NULL` (for leaderboards — all non-deleted profiles are readable) |
| INSERT | Disabled — row is created by the `on_auth_user_created` trigger only |
| UPDATE | `auth.uid() = id AND deleted_at IS NULL` |
| DELETE | Disabled — soft delete only via UPDATE |

#### Table: `avatar_assets`

```sql
CREATE TABLE public.avatar_assets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(80) NOT NULL,
  storage_path  TEXT NOT NULL,
  storage_url   TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**RLS policies**:

| Operation | Policy |
|---|---|
| SELECT | Public — no auth required |
| INSERT / UPDATE / DELETE | Disabled at row level — service role only (seed script) |

---

### Database: Profile Creation Trigger

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_avatar_url TEXT;
BEGIN
  -- Pick a random default avatar
  SELECT storage_url INTO default_avatar_url
  FROM public.avatar_assets
  ORDER BY RANDOM()
  LIMIT 1;

  INSERT INTO public.profiles (id, avatar_url, avatar_source, verification_status)
  VALUES (
    NEW.id,
    COALESCE(default_avatar_url, ''),
    'DEFAULT_SET',
    'UNVERIFIED'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Note**: The trigger always sets `UNVERIFIED`. The Google OAuth callback Server Action updates the row to `VERIFIED` immediately after sign-in when the provider is Google.

---

### Supabase Storage: Bucket Configuration

**Bucket name**: `avatars`

| Path prefix | Access | RLS rule |
|---|---|---|
| `avatars/defaults/*` | Public read | No auth required |
| `avatars/custom/{user_id}/*` | Authenticated owner only | `auth.uid()::text = (storage.foldername(name))[1]` |

**Storage RLS policies** (applied in Supabase dashboard or migration):

```sql
-- Public read for default avatars
CREATE POLICY "Default avatars are public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars' AND name LIKE 'avatars/defaults/%');

-- Owner read for custom avatars
CREATE POLICY "Users can read own avatars"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'avatars'
    AND name LIKE 'avatars/custom/%'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owner insert for custom avatars
CREATE POLICY "Users can upload own avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND name LIKE 'avatars/custom/%'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owner delete for custom avatars
CREATE POLICY "Users can delete own avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND name LIKE 'avatars/custom/%'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## Email Provider: Resend

**Production**: Resend is configured as the custom SMTP provider in Supabase Auth.

| Setting | Value |
|---|---|
| SMTP host | `smtp.resend.com` |
| SMTP port | 465 (SSL) |
| SMTP user | `resend` |
| SMTP password | Resend API key (stored as Supabase Auth secret) |
| From address | `noreply@<configured-domain>` |
| Resend free tier | 3,000 emails/month — sufficient for ~500 users |

**Local development**: Mailpit is added to `docker-compose.yml` as a local SMTP trap. All auth emails sent in local development are caught by Mailpit and visible at `http://localhost:8025`. No real emails are sent locally.

Mailpit docker-compose service:
```yaml
mailpit:
  image: axllent/mailpit:latest
  ports:
    - "8025:8025"   # Web UI
    - "1025:1025"   # SMTP
  environment:
    MP_SMTP_AUTH_ACCEPT_ANY: "1"
    MP_SMTP_AUTH_ALLOW_INSECURE: "1"
```

Local Supabase Auth SMTP override (`.env.local`):
```
SUPABASE_AUTH_SMTP_HOST=localhost
SUPABASE_AUTH_SMTP_PORT=1025
SUPABASE_AUTH_SMTP_USER=any
SUPABASE_AUTH_SMTP_PASS=any
```

---

## Vercel Project Configuration

### Environments

| Environment | Trigger | Supabase project |
|---|---|---|
| Preview | Every pull request / push to non-main branch | Same dev Supabase project (separate schema or same) |
| Production | Push / merge to `main` branch | Production Supabase project |

### Environment Variables

All variables are set in the Vercel dashboard under Project Settings → Environment Variables.

| Variable | Preview | Production | Description |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | dev project URL | prod project URL | Supabase project API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | dev anon key | prod anon key | Public anon key for browser client |
| `SUPABASE_SERVICE_ROLE_KEY` | dev service role key | prod service role key | Server-only admin key (never exposed to browser) |
| `RESEND_API_KEY` | Resend test key | Resend production key | For future use if email is sent from Server Actions directly |

### Local Development (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<local-supabase-service-role-key>
```

Local Supabase is started with `supabase start` (Supabase CLI). This spins up a local Postgres, Auth, and Storage instance.

### Image Optimization

Vercel Image Optimization is enabled by default. Avatar images served via Next.js `<Image>` component are automatically resized, compressed, and cached at the Vercel CDN edge. No additional configuration needed.

For external image domains (Google profile photos), add to `next.config.ts`:
```typescript
images: {
  remotePatterns: [
    { hostname: 'lh3.googleusercontent.com' },   // Google profile photos
    { hostname: '<project-ref>.supabase.co' },    // Supabase Storage
  ],
}
```

---

## Monitoring

**Minimal setup** (Q5 → A):

| Tool | What it covers |
|---|---|
| Vercel dashboard | Deployment status, function logs, error rates, build logs |
| Supabase dashboard | Auth logs, DB query performance, Storage usage, Edge Function logs |

No external error tracker in v1. Structured auth event logs (sign-in failures, account deletions) are captured in Vercel function logs via `console.error`.

---

## Seed Script Requirements

The following must be executed after first deployment (or locally after `supabase start`):

1. **Default avatar set**: Upload default avatar images to Supabase Storage `avatars/defaults/` and insert rows into `avatar_assets`.
2. **Admin user**: After the admin user registers, run the seed script to set `profiles.verification_status = 'ADMIN'` for the configured email.

Seed script location: `scripts/seed.ts` (run with `pnpm tsx scripts/seed.ts`).
