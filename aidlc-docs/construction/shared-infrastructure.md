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
| Web Push | Browser Push Services + VAPID | Free baseline | Match/pool/ranking web push without OneSignal dependency |

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
| `FOOTBALL_DATA_KEY` | Server only | football-data.org provider key (`X-Auth-Token`) for competition sync; never `NEXT_PUBLIC`. (Reemplazó a `API_FOOTBALL_KEY` en Unit 25.) |
| `SYNC_TRIGGER_SECRET` | Server only (optional) | Protects system/manual sync triggers if implemented outside admin session auth |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public (browser + server) | Public VAPID key used by the browser to create Web Push subscriptions |
| `VAPID_PRIVATE_KEY` | Server only | Private VAPID key used to sign Web Push send requests; never exposed to client |
| `VAPID_SUBJECT` | Server only | Contact subject for VAPID, e.g. `mailto:admin@example.com` or app URL |
| `NEXT_PUBLIC_SITE_URL` | Public (browser + server) | App base URL used to build `emailRedirectTo` en los flujos de auth (sign-up, change-email, resend-confirmation, google-callback) |
| `WORLD_CUP_KICKOFF` | Server only (optional) | Override del kickoff del torneo para `competition-lock.ts`; fallback al valor del seed si no se define |

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

## Content Security Policy

CSP headers are configured in `proxy.ts` (introduced in Unit 1, **report-only** mode in v1).

| Unit | CSP contribution |
|---|---|
| Unit 1 | Base moderate CSP (allowlist Supabase, Google, Vercel; report-only) |
| Unit 2 | Adds `script-src 'sha256-<theme-bootstrap-script-hash>'` for the inline theme script — **hash-based, not nonce**, to keep landing/rules statically rendered (Infra Q1=A). Hash recomputed at build if the script changes. |

The CSP stays report-only in v1, ready to switch to enforce without rewrites.

---

## Monitoring

| Tool | Access | What to watch |
|---|---|---|
| Vercel Dashboard | vercel.com/dashboard | Deployments, function logs, error rates |
| Supabase Dashboard | app.supabase.com | Auth logs, DB metrics, Storage usage |
| `provider_sync_runs` table | Supabase SQL / future Unit 7 dashboard | Competition sync status, failures, rate limits, last successful sync |

No external error tracking tool in v1. No RUM/Speed Insights in v1 (Unit 2 Infra Q3=B); performance targets validated pre-deploy via Lighthouse.

---

## Seed Scripts

Seed scripts are located in `scripts/` and run with `pnpm tsx scripts/<name>.ts` (also exposed as `pnpm prisma:seed:*`; `pnpm prisma:db:setup` chains migrate + generate + seeds).

| Script | Purpose | When to run |
|---|---|---|
| `scripts/seed-avatars.ts` | Upload the committed default avatar set (`scripts/avatars/*.svg`, 10 World-Cup-themed icons) to Supabase Storage under `avatars/defaults/` and upsert `avatar_assets` (idempotent; UUID `id` generated by DB, keyed by `name`; clean skip when the dir is empty) | After first deploy / `supabase db reset` |
| `scripts/seed-admin.ts` | Set `verification_status = 'ADMIN'` for a configured email | After the admin user registers |
| `scripts/seed-competition.ts` | Upsert World Cup 2026 competition, teams, phases, known fixtures and flag paths | After Unit 4 migrations / before enabling predictions |
| `scripts/sync-flags.ts` / `scripts/check-flags.ts` | Download/validate required SVG flags into `public/flags/` | Before deploy when team seed changes |

Supabase seed scripts that call Admin APIs use `SUPABASE_SERVICE_ROLE_KEY`; `seed-competition`, `sync-flags`, and `check-flags` do not require it.

---

## Scheduled Jobs

| Job | Runtime | Purpose |
|---|---|---|
| `competition-sync` | **Unit 50: Supabase pg_cron + pg_net** → `POST /api/cron/sync?scope=…` (guard `x-sync-secret`) → `runScheduledSync` → `runCompetitionSync`. Cadencia tiered (UTC): LIVE_STATUS `*/2`, RESULTS `*/5`, FIXTURES `0 6`. El sync manual del admin (`trigger-sync.ts`) se conserva como fallback. | Sync football-data.org teams, fixtures, live status and results; write `provider_sync_runs` |
| `competition-sync cleanup` | **Unit 50**: pg_cron `sync-cleanup 0 4 * * *` → `/api/cron/sync?scope=CLEANUP` → `cleanupOldSyncRuns` | Remove sync runs older than 90 days |
| `notification-dispatch` | `POST /api/notifications/dispatch` (guard `x-sync-secret`); también disparado tras cada sync vía `dispatchPendingNotifications` dentro de `runScheduledSync` | Drain pending notification events/outbox and send Web Push with retries/deduplication |

Preview deployments use seed/mock competition data by default and only call football-data.org when `FOOTBALL_DATA_KEY` is explicitly configured for that environment.

---

## Web Push Provider Decision

The Unit 10 baseline is **standard Web Push with VAPID**, not OneSignal.

| Option | Cost fit | Tradeoff | Decision |
|---|---|---|---|
| Standard Web Push + VAPID | Free at MVP scale; uses browser push services | Requires owning subscription storage, retries, preferences and service worker | **Chosen for Unit 10** |
| OneSignal | Generous free/start tiers, mature dashboard | Third-party SDK, vendor lock-in, possible plan/branding/limit changes, extra data processor | Future adapter if marketing/analytics needs justify it |
| Firebase Cloud Messaging Web | Free, mature Google infra | Adds Firebase project/vendor and is unnecessary for basic cross-browser Web Push | Future adapter only if Firebase is already adopted |
| Novu / ntfy self-hosted | Can be low-cost/self-hosted | More infrastructure to operate than the current Vercel + Supabase stack | Not v1 baseline |

Push payloads must stay minimal: title/body/url/event id only. Private details are loaded after the user opens the authenticated route.
