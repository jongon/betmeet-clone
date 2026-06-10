# Unit 1 — Foundation: Code Summary

## Overview

Unit 1 implements the complete authentication and profile foundation for the Quiniela 2026 SaaS application. All 26 steps of the code generation plan are complete.

## Files Generated

### Database & Migrations

| File | Purpose |
|------|---------|
| `supabase/migrations/20260610000001_create_profiles.sql` | RLS policies for `profiles` table |
| `supabase/migrations/20260610000002_create_avatar_assets.sql` | RLS policies for `avatar_assets` table |
| `supabase/migrations/20260610000003_create_profile_trigger.sql` | Auto-create profile on `auth.users` INSERT |
| `supabase/migrations/20260610000004_storage_rls_policies.sql` | Storage RLS for `avatars` bucket |
| `prisma/schema.prisma` | `Profile` + `AvatarAsset` models with Prisma ORM |

### Infrastructure & Config

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Added Mailpit SMTP for local email capture |
| `next.config.ts` | CSP headers (report-only), `next/image` remotePatterns |
| `src/lib/supabase/server.ts` | SSR Supabase client (Server Components / Actions) |
| `src/lib/supabase/client.ts` | Browser Supabase client (Client Components) |
| `src/lib/auth-logger.ts` | Structured auth event logging (email-redacted) |
| `src/lib/prisma.ts` | Prisma singleton with `@prisma/adapter-pg` |

### Middleware & Routes

| File | Purpose |
|------|---------|
| `src/middleware.ts` | Fail-closed session refresh, onboarding gate, auth redirect |
| `src/app/api/csp-report/route.ts` | CSP violation logger (POST → 204) |
| `src/app/auth/callback/route.ts` | OAuth code exchange + Google avatar sync |

### Schemas & Types

| File | Purpose |
|------|---------|
| `src/features/auth/schemas.ts` | Zod: SignUp, SignIn (rememberMe), ForgotPassword, ResetPassword, ChangePassword, EmailChange |
| `src/features/profile/schemas.ts` | Zod: NicknameBase (3-20 chars, `^[a-zA-Z0-9_-]+$`), AvatarUploadMeta (MIME + 5MB) |
| `src/features/profile/types.ts` | TS interfaces: `Profile`, `AvatarAsset`, `getDisplayNickname()` |

### Auth Server Actions (`src/features/auth/actions/`)

| File | User Stories |
|------|-------------|
| `sign-up.ts` | US-1.1 — Email/password registration |
| `sign-in.ts` | US-1.1, US-1.5 — Sign-in with rememberMe + MFA detection |
| `sign-out.ts` | Session teardown + `remember_me` cookie cleanup |
| `forgot-password.ts` | US-1.1 — Email-enumeration-safe reset link |
| `reset-password.ts` | US-1.1 — Password update via reset token |
| `change-password.ts` | US-1.1 — Re-auth + password change |
| `change-email.ts` | US-1.1 — Email change with dual confirmation |
| `delete-account.ts` | US-1.1 — Soft-delete (sets `deleted_at`) + sign-out |
| `google-callback.ts` | US-1.2, US-1.4 — OAuth initiation + avatar sync |
| `mfa-enroll.ts` | US-1.5 — TOTP factor enrollment + confirmation |
| `mfa-verify.ts` | US-1.5 — TOTP challenge verification |
| `mfa-disable.ts` | US-1.5 — Factor unenroll + profile sync |
| `passkey-register.ts` | US-1.3 — WebAuthn factor enrollment |
| `passkey-sign-in.ts` | US-1.3 — Failure reporter (client-side flow) |

### Profile Services & Actions (`src/features/profile/`)

| File | Purpose |
|------|---------|
| `services/nickname.ts` | `generateNicknameSuggestions()`, `assignDiscriminator()` (10 retries) |
| `queries.ts` | `getProfile()`, `getDefaultAvatars()` (24h `unstable_cache`) |
| `actions/check-nickname-availability.ts` | Availability check (< 9999 discriminators used) |
| `actions/set-nickname.ts` | Assign nickname + random discriminator |
| `actions/set-avatar-from-default-set.ts` | Set avatar from `avatar_assets` table |
| `actions/set-avatar-from-google.ts` | Sync Google OAuth photo |
| `actions/create-avatar-upload-url.ts` | Signed upload URL for direct client upload |
| `actions/set-avatar-from-upload.ts` | Confirm upload, delete old custom file |

### UI Components

| File | Purpose |
|------|---------|
| `src/components/form-error.tsx` | Accessible error display (`aria-live="polite"`) |
| `src/components/providers/auth-provider.tsx` | Session expiry detection → toast + redirect |
| `src/features/auth/components/sign-up-form.tsx` | Sign-up form with field errors |
| `src/features/auth/components/sign-in-form.tsx` | Sign-in with rememberMe + MFA modal trigger |
| `src/features/auth/components/forgot-password-form.tsx` | Reset link form with success state |
| `src/features/auth/components/reset-password-form.tsx` | New password form |
| `src/features/auth/components/google-sign-in-button.tsx` | Google OAuth button |
| `src/features/auth/components/passkey-sign-in-button.tsx` | WebAuthn client-side sign-in |
| `src/features/auth/components/mfa-prompt-modal.tsx` | TOTP verification modal (post sign-in) |
| `src/features/auth/components/mfa-enrollment-modal.tsx` | 2-step TOTP enrollment (QR → verify) |
| `src/features/auth/components/confirm-delete-modal.tsx` | Typed confirmation before account deletion |
| `src/features/profile/components/onboarding-progress-indicator.tsx` | 3-step progress (nickname → avatar → passkey) |
| `src/features/profile/components/avatar-grid.tsx` | Accessible ARIA listbox grid |
| `src/features/profile/components/avatar-source-tabs.tsx` | Default / Google / Upload tabs |
| `src/features/profile/components/nickname-step.tsx` | Nickname input + suggestions |
| `src/features/profile/components/avatar-step.tsx` | Avatar selection with live preview |
| `src/features/profile/components/passkey-step.tsx` | Optional passkey registration |

### App Routes

| Route | File | Purpose |
|-------|------|---------|
| `/auth/sign-in` | `app/(auth)/sign-in/page.tsx` | Sign-in page |
| `/auth/sign-up` | `app/(auth)/sign-up/page.tsx` | Registration page |
| `/auth/forgot-password` | `app/(auth)/forgot-password/page.tsx` | Password reset request |
| `/auth/reset-password` | `app/(auth)/reset-password/page.tsx` | New password form |
| `/auth/verify-email` | `app/(auth)/verify-email/page.tsx` | Post-signup confirmation |
| `/onboarding/profile` | `app/onboarding/profile/page.tsx` | 3-step onboarding flow |
| `/settings/profile` | `app/settings/profile/page.tsx` | Avatar settings |
| `/settings/security` | `app/settings/security/page.tsx` | MFA + account deletion |

### Scripts

| File | Purpose |
|------|---------|
| `scripts/seed-avatars.ts` | Upload default avatars to Storage + insert `avatar_assets` |
| `scripts/seed-admin.ts` | Promote user to `ADMIN` verification status |

## Test Coverage

| Suite | Tests |
|-------|-------|
| Auth actions (sign-up, sign-in, forgot-password, change-password, delete-account) | 16 |
| Profile services (nickname generation, discriminator assignment) | 6 |
| Profile actions (set-nickname, set-avatar-from-upload) | 5 |
| **Total** | **27** |

## Key Design Decisions

- **Profile creation via PostgreSQL trigger** — atomically creates a `profiles` row on every `auth.users` INSERT, guaranteeing profile existence even on OAuth callback failures.
- **Discord-style discriminators** — `nickname#XXXX` with random 4-digit suffix, up to 10 retries before returning `null` (nickname exhausted).
- **Avatar replace strategy** — only one custom upload retained per user; old file deleted from Storage before new one is confirmed.
- **Fail-closed middleware** — session refresh failure → `session_expired` cookie (10s) → sign-in redirect. `AuthProvider` reads the cookie client-side and shows a toast.
- **CSP in report-only mode** — violations logged to `console.warn` via `/api/csp-report`, no requests blocked during development.
- **`next/image` for avatar thumbnails** — replaces Supabase image transforms (requires Pro plan, incompatible with Free tier).
