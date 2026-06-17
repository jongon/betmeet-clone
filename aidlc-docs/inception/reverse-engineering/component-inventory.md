# Component Inventory

## Application Packages

- `src/app` - Next.js route tree, layouts, pages, route handlers, and protected/public route composition.
- `src/features/auth` - Account access, email flows, MFA, passkeys, and account deletion.
- `src/features/profile` - Onboarding, profile identity, nicknames, avatars, locale.
- `src/features/competition` - Fixture, teams, provider sync, competition components.
- `src/features/predictions` - Prediction forms, eligibility, lock/validation, per-user fixture views.
- `src/features/pools` - Pool CRUD, memberships, invitations, directory, pool detail.
- `src/features/scoring` - Pure deterministic scoring rules.
- `src/features/scoring-rankings` - Score persistence, sweeper, global and pool leaderboards.
- `src/features/notifications` - Web Push preferences, subscriptions, event outbox, dispatcher.
- `src/features/admin` - Admin dashboard, sync controls, result overrides, operational views.
- `src/features/education` - Rules center UI, landing education, scoring calculator.
- `src/i18n` - Locale configuration and typed dictionaries.

## Infrastructure Packages

- `prisma` - Prisma schema, generated-client configuration, migrations, seed entrypoint.
- `src/lib/prisma.ts` - Runtime Prisma client singleton and connection configuration.
- `src/lib/supabase` - Supabase browser/server/admin client factories and current-user helper.
- `public/sw.js` - Web Push service worker asset served from app origin.
- `supabase` - Supabase local/config artifacts and competition sync function location.
- `scripts` - Operational scripts for seeds, flags, MCP generation, and admin promotion.

## Shared Packages

- `src/components/ui` - Shared UI primitives: button, card, dialog, dropdown, tabs, switch, badge, etc.
- `src/components/layout` - App shell components: app header, primary nav, user menu, onboarding header.
- `src/components/theme` - Theme and brand toggles.
- `src/components/providers` - React providers for auth, theme, and brand theme.
- `src/lib` - Safe redirects, date formatting, rules content loading, locale helpers, brand theme, auth logging.
- `content/rules`, `public/flags`, `public/avatars` - MDX and static visual assets.

## Test Packages

- `src/features/**/__tests__` - Unit/component tests for feature services, actions, and UI.
- `src/components/layout/__tests__` - App shell component tests.
- `src/lib/**/__tests__` - Shared helper tests.
- `vitest.config.ts` - Vitest configuration with React/jsdom support where needed.

## Total Count

- **Total Logical Packages**: 25
- **Application**: 12
- **Infrastructure**: 6
- **Shared**: 6
- **Test**: 1 grouped test layer

## Notable Component Relationships

- `admin` depends on `competition`, `scoring-rankings`, `notifications`, and shared revalidation helpers.
- `predictions` depends on `competition` fixture data and `scoring-rankings` score resolution.
- `pools` depends on `profile` onboarding/session checks and emits notification events for directed invites.
- `notifications` depends on domain event producers in `competition`, `pools`, and `scoring-rankings`.
- `profile` and `auth` both depend on Supabase user/session state but persist product identity in Prisma `Profile`.
