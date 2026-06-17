# Technology Stack

## Programming Languages

- **TypeScript** - `^6.0.3` - Application, server actions, services, tests, scripts.
- **JavaScript** - Browser service worker and generated/config scripts.
- **CSS** - Tailwind v4 CSS-first tokens in `src/app/globals.css`.
- **SQL** - Prisma migrations and Supabase database functions/policies/triggers.

## Frameworks

- **Next.js** - `^16.2.7` - App Router, Server Components, route handlers, proxy middleware, caching, production build.
- **React** - `^19.2.7` - UI runtime and server/client component model.
- **Tailwind CSS** - `^4.3.0` - Utility styling and CSS-first design tokens.
- **Base UI / shadcn-style primitives** - `@base-ui/react ^1.5.0` plus local wrappers - accessible primitives for dialogs, menus, tabs, popovers.
- **Content Collections** - `@content-collections/*` - MDX rules content pipeline.

## Infrastructure

- **Supabase Auth** - Email/password, Google OAuth, TOTP MFA, native passkeys, session claims, admin user deletion.
- **Supabase PostgreSQL** - Product database, accessed through Prisma.
- **Supabase Storage** - Default/custom avatar assets.
- **Supabase Edge Functions** - `supabase/functions/competition-sync` present for competition sync integration.
- **Vercel** - Intended hosting model per project state/docs.
- **Browser Push Services** - Web Push delivery path for subscribed browsers.
- **football-data.org** - Fixture/team/result provider.

## Data And ORM

- **Prisma** - `^7.8.0` - Schema, migrations, generated client, data access.
- **@prisma/adapter-pg** - `^7.8.0` - PostgreSQL adapter.
- **PostgreSQL** - Supabase-managed database, documented target PostgreSQL 18.

## Auth And Storage Libraries

- **@supabase/ssr** - `^0.12.0` - Cookie-aware server client for Next routes/proxy.
- **@supabase/supabase-js** - `^2.108.1` - Browser/server/admin auth and storage API, native passkeys.

## Forms And Validation

- **react-hook-form** - `^7.78.0` - Client form state.
- **@hookform/resolvers** - `^5.4.0` - zod integration.
- **zod** - `^4.4.3` - Input schemas and provider payload validation.

## Notifications

- **web-push** - `^3.6.7` - VAPID-based encrypted notification delivery.
- **Service Worker API** - `public/sw.js` handles `push` and `notificationclick` events.
- **Push API / Notification API** - Browser APIs used by notification settings UI.

## UI Libraries

- **lucide-react** - `^1.17.0` - Icons.
- **sonner** - `^2.0.7` - Toast notifications.
- **class-variance-authority**, **clsx**, **tailwind-merge** - Class composition and variants.
- **next-themes** - `^0.4.6` - Theme support.

## Build Tools

- **pnpm** - `11.7.0` - Package manager.
- **Node.js** - `>=24` - Runtime requirement.
- **Biome** - `^2.4.16` - Formatting and style lint checks.
- **ESLint** - `^9.39.4` with `eslint-config-next ^16.2.7` - Static analysis.
- **Lefthook** - `^2.1.9` - Git hooks.
- **Commitlint + gitmoji** - Commit convention tooling.
- **tsx** - `^4.22.4` - TypeScript script execution.

## Testing Tools

- **Vitest** - `^4.1.8` - Unit and component tests.
- **@testing-library/react** - `^16.3.2` - React component tests.
- **@testing-library/jest-dom** - `^6.9.1` - DOM matchers.
- **jsdom** - `^29.1.1` - Browser-like test environment.
- **Playwright** - `^1.60.0` - E2E/browser automation capability.
