# Shared Infrastructure

Infrastructure shared across all units of the application.

## Cloud Providers

| Service | Provider | Plan | Purpose |
|---|---|---|---|
| App hosting | Vercel | Hobby/Pro | Next.js deployment, Edge CDN, Image Optimization |
| Auth | Supabase Auth | Free tier | Email/password, Google OAuth, Passkeys, MFA |
| Database | Supabase PostgreSQL | Free tier (500 MB) | All application data |
| File storage | Supabase Storage | Free tier (1 GB) | Avatars, future assets |
| Transactional email | Resend | Free tier (3k/month) | Auth emails (verification, reset, change) |
| Local email trap | Mailpit | Self-hosted (Docker) | Catches auth emails in local development |

---

## Supabase Projects

| Environment | Usage | Migrations |
|---|---|---|
| Local (`supabase start`) | Developer workstation | Applied via `supabase db reset` |
| Dev / Preview | Vercel Preview deployments (PRs) | Applied via `supabase db push` on merge to `develop` |
| Production | Vercel Production deployment | Applied via `supabase db push` on merge to `main` |

---

## Vercel Environments

| Environment | Branch | URL pattern |
|---|---|---|
| Preview | Any non-main branch | `<branch>-<project>.vercel.app` |
| Production | `main` | `<project>.vercel.app` (or custom domain when configured) |

---

## Shared Environment Variables

All units share these variables. Each environment has its own values set in the Vercel dashboard.

| Variable | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (browser + server) | Supabase project API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (browser + server) | Supabase anon key for RLS-protected operations |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only (never exposed) | Supabase admin key for privileged server operations |
| `RESEND_API_KEY` | Server only | Resend API key (used by Supabase Auth SMTP config) |

---

## Supabase CLI Workflow

```
# Start local environment
supabase start

# Create a new migration
supabase migration new <name>

# Apply migrations to local
supabase db reset

# Push migrations to remote project
supabase db push --db-url <connection-string>

# Regenerate TypeScript types from DB schema
supabase gen types typescript --local > src/types/supabase.ts
```

---

## Docker Compose Services

| Service | Port | Purpose |
|---|---|---|
| Mailpit (web) | 8025 | View captured emails at http://localhost:8025 |
| Mailpit (smtp) | 1025 | SMTP trap for Supabase Auth local emails |
| (Supabase services managed by Supabase CLI, not docker-compose) | 54321 | Local Supabase API |

---

## Image Optimization

All units that display images use Next.js `<Image>` component. Vercel Image Optimization automatically resizes, converts to WebP, and caches images at the CDN edge.

External domains allowed in `next.config.ts`:

```typescript
images: {
  remotePatterns: [
    { hostname: 'lh3.googleusercontent.com' },  // Google profile photos
    { hostname: '*.supabase.co' },              // Supabase Storage
  ],
}
```

---

## Monitoring

| Tool | Access | What to watch |
|---|---|---|
| Vercel Dashboard | vercel.com/dashboard | Deployments, function logs, error rates |
| Supabase Dashboard | app.supabase.com | Auth logs, DB metrics, Storage usage |

No external error tracking tool in v1.

---

## Seed Scripts

Seed scripts are located in `scripts/` and run with `pnpm tsx scripts/<name>.ts`.

| Script | Purpose | When to run |
|---|---|---|
| `scripts/seed-avatars.ts` | Upload default avatar images to Supabase Storage and populate `avatar_assets` | After first deploy / `supabase db reset` |
| `scripts/seed-admin.ts` | Set `verification_status = 'ADMIN'` for a configured email | After the admin user registers |

Both scripts use `SUPABASE_SERVICE_ROLE_KEY` and require it to be set in the environment.
