# Unit 1: Foundation — Code Generation Plan

## Unit Context

**Unit**: Foundation — Auth, Profile, Nickname, Avatar  
**Workspace root**: `/var/www/html`  
**Code location**: `/var/www/html/src/` (monolith, hybrid structure)  
**Project type**: Greenfield (Next.js 16, TypeScript, Tailwind v4, shadcn/ui, Prisma, Supabase)

## Stories Implemented by This Unit
- US-1.1: Registro y login tradicional
- US-1.2: Autenticación con Google
- US-1.3: Inicio de sesión con Passkeys
- US-1.4: Account Linking
- US-1.5: Configuración de Seguridad y MFA
- US-1.6: Gestión de Avatar
- US-1.7: Nickname Único (Estilo Discord)

## Dependencies
- None (Unit 1 is the foundation; all other units depend on it)

## Expected Interfaces for Other Units
- `Profile` type exported from `src/features/profile/types.ts`
- `getSessionUser()` utility from `src/lib/supabase/server.ts`
- `verification_status` enum values for RLS and authorization checks

---

## Generation Steps

### Step 1 — Project Structure Setup
- [ ] Create directory tree:
  - `src/features/auth/actions/`
  - `src/features/auth/components/`
  - `src/features/auth/schemas.ts` (placeholder)
  - `src/features/profile/actions/`
  - `src/features/profile/components/`
  - `src/features/profile/services/`
  - `src/lib/supabase/`
  - `src/lib/auth-logger.ts` (placeholder)
  - `supabase/migrations/`
  - `scripts/`

### Step 2 — Supabase Migrations
- [ ] `supabase/migrations/20260610000001_create_profiles.sql`
- [ ] `supabase/migrations/20260610000002_create_avatar_assets.sql`
- [ ] `supabase/migrations/20260610000003_create_profile_trigger.sql`
- [ ] `supabase/migrations/20260610000004_storage_rls_policies.sql`
- [ ] `supabase/seed.sql` — insert placeholder avatar_assets rows (paths filled by seed script)
- [ ] `supabase/config.toml` — update `[auth.external.smtp]` section for Mailpit in local dev

### Step 3 — Prisma Schema
- [ ] Update `prisma/schema.prisma` — add `Profile` and `AvatarAsset` models

### Step 4 — Docker Compose
- [ ] Update `docker-compose.yml` — add `mailpit` service (port 8025/1025)

### Step 5 — Next.js Config
- [ ] Update `next.config.ts` — add `images.remotePatterns` (Google, Supabase)
- [ ] Update `next.config.ts` — add `headers()` with `Content-Security-Policy-Report-Only`

### Step 6 — Supabase Client Factory
- [ ] `src/lib/supabase/server.ts` — `createClient()` for Server Components / Server Actions
- [ ] `src/lib/supabase/client.ts` — `createClient()` for Client Components
- [ ] `src/lib/supabase/middleware.ts` — `updateSession()` helper

### Step 7 — Auth Middleware
- [ ] `src/middleware.ts` — session refresh, onboarding gate, route protection

### Step 8 — Auth Logger
- [ ] `src/lib/auth-logger.ts` — `logAuthEvent()` with `redactEmail()`, structured JSON to `console.error`

### Step 9 — CSP Report Route
- [ ] `src/app/api/csp-report/route.ts` — receives CSP violation reports, logs them

### Step 10 — Zod Validation Schemas
- [ ] `src/features/auth/schemas.ts` — `SignUpSchema`, `SignInSchema`, `ResetPasswordSchema`, `ChangePasswordSchema`, `EmailChangeSchema`
- [ ] `src/features/profile/schemas.ts` — `NicknameBaseSchema`, `AvatarUploadMetaSchema`

### Step 11 — Auth Server Actions
- [ ] `src/features/auth/actions/sign-up.ts` — US-1.1
- [ ] `src/features/auth/actions/sign-in.ts` — US-1.1, US-1.5 (MFA flow)
- [ ] `src/features/auth/actions/sign-out.ts`
- [ ] `src/features/auth/actions/forgot-password.ts` — US-1.1
- [ ] `src/features/auth/actions/reset-password.ts` — US-1.1
- [ ] `src/features/auth/actions/change-password.ts` — US-1.1
- [ ] `src/features/auth/actions/change-email.ts` — US-1.1
- [ ] `src/features/auth/actions/delete-account.ts` — US-1.1
- [ ] `src/features/auth/actions/google-callback.ts` — US-1.2, US-1.4 (sets VERIFIED on Google sign-in)
- [ ] `src/features/auth/actions/mfa-enroll.ts` — US-1.5
- [ ] `src/features/auth/actions/mfa-verify.ts` — US-1.5
- [ ] `src/features/auth/actions/mfa-disable.ts` — US-1.5
- [ ] `src/features/auth/actions/passkey-register.ts` — US-1.3
- [ ] `src/features/auth/actions/passkey-sign-in.ts` — US-1.3

### Step 12 — Auth Server Actions Unit Tests
- [ ] `src/features/auth/actions/__tests__/sign-up.test.ts`
- [ ] `src/features/auth/actions/__tests__/sign-in.test.ts`
- [ ] `src/features/auth/actions/__tests__/forgot-password.test.ts`
- [ ] `src/features/auth/actions/__tests__/change-password.test.ts`
- [ ] `src/features/auth/actions/__tests__/change-email.test.ts`
- [ ] `src/features/auth/actions/__tests__/delete-account.test.ts`

### Step 13 — Profile Services
- [ ] `src/features/profile/services/nickname.ts` — `generateNicknameSuggestions()`, `assignDiscriminator()` (random 4-digit, up to 10 retries)

### Step 14 — Profile Server Actions
- [ ] `src/features/profile/actions/check-nickname-availability.ts` — US-1.7 (debounce endpoint)
- [ ] `src/features/profile/actions/set-nickname.ts` — US-1.7 (onboarding + settings)
- [ ] `src/features/profile/actions/set-avatar-from-default-set.ts` — US-1.6
- [ ] `src/features/profile/actions/set-avatar-from-google.ts` — US-1.6
- [ ] `src/features/profile/actions/create-avatar-upload-url.ts` — US-1.6 (signed URL)
- [ ] `src/features/profile/actions/set-avatar-from-upload.ts` — US-1.6 (save + delete old)

### Step 15 — Profile Queries
- [ ] `src/features/profile/queries.ts` — `getDefaultAvatars()` with `unstable_cache` (TTL 24h), `getProfile(userId)`

### Step 16 — Profile Types
- [ ] `src/features/profile/types.ts` — `Profile`, `AvatarAsset`, `VerificationStatus`, `AvatarSource` types

### Step 17 — Profile Services Unit Tests
- [ ] `src/features/profile/services/__tests__/nickname.test.ts` — discriminator generation, suggestions, collision retry

### Step 18 — Profile Server Actions Unit Tests
- [ ] `src/features/profile/actions/__tests__/set-nickname.test.ts`
- [ ] `src/features/profile/actions/__tests__/check-nickname-availability.test.ts`
- [ ] `src/features/profile/actions/__tests__/set-avatar-from-upload.test.ts`

### Step 19 — Shared UI Components
- [ ] `src/components/ui/form-field.tsx` — `<label>` + input slot + `<FormError>` wrapper
- [ ] `src/components/ui/form-error.tsx` — `role="alert"` + `aria-live="polite"`
- [ ] `src/components/providers/auth-provider.tsx` — `onAuthStateChange` listener → toast + redirect on session expiry

### Step 20 — Auth UI Components
- [ ] `src/features/auth/components/sign-in-form.tsx` — US-1.1, US-1.5
- [ ] `src/features/auth/components/sign-up-form.tsx` — US-1.1
- [ ] `src/features/auth/components/forgot-password-form.tsx` — US-1.1
- [ ] `src/features/auth/components/reset-password-form.tsx` — US-1.1
- [ ] `src/features/auth/components/google-sign-in-button.tsx` — US-1.2
- [ ] `src/features/auth/components/passkey-sign-in-button.tsx` — US-1.3
- [ ] `src/features/auth/components/mfa-prompt-modal.tsx` — US-1.5
- [ ] `src/features/auth/components/mfa-enrollment-modal.tsx` — US-1.5
- [ ] `src/features/auth/components/confirm-delete-modal.tsx` — US-1.1

### Step 21 — Profile / Onboarding UI Components
- [ ] `src/features/profile/components/nickname-step.tsx` — US-1.7 (suggestions + input + preview + debounce check)
- [ ] `src/features/profile/components/avatar-step.tsx` — US-1.6 (tabs: Google / default grid / upload)
- [ ] `src/features/profile/components/passkey-step.tsx` — US-1.3
- [ ] `src/features/profile/components/onboarding-progress-indicator.tsx`
- [ ] `src/features/profile/components/avatar-source-tabs.tsx` — reusable (onboarding + settings)
- [ ] `src/features/profile/components/avatar-grid.tsx` — keyboard-navigable grid (WCAG AA)

### Step 22 — App Routes: Auth
- [ ] `src/app/(auth)/layout.tsx`
- [ ] `src/app/(auth)/sign-in/page.tsx` — US-1.1, US-1.2, US-1.3
- [ ] `src/app/(auth)/sign-up/page.tsx` — US-1.1, US-1.2
- [ ] `src/app/(auth)/forgot-password/page.tsx` — US-1.1
- [ ] `src/app/(auth)/reset-password/page.tsx` — US-1.1
- [ ] `src/app/(auth)/verify-email/page.tsx` — US-1.1
- [ ] `src/app/auth/callback/route.ts` — US-1.2, US-1.4 (OAuth + account linking handler)

### Step 23 — App Routes: Onboarding
- [ ] `src/app/onboarding/profile/page.tsx` — US-1.6, US-1.7 (wizard: NicknameStep → AvatarStep → PasskeyStep)

### Step 24 — App Routes: Settings
- [ ] `src/app/settings/layout.tsx`
- [ ] `src/app/settings/profile/page.tsx` — US-1.6, US-1.7
- [ ] `src/app/settings/security/page.tsx` — US-1.3, US-1.5 (MFA, passkeys, password, email, delete)

### Step 25 — Seed Scripts
- [ ] `scripts/seed-avatars.ts` — uploads default avatar images to Supabase Storage, inserts `avatar_assets` rows
- [ ] `scripts/seed-admin.ts` — sets `verification_status = 'ADMIN'` for configured email

### Step 26 — Code Documentation Summary
- [ ] `aidlc-docs/construction/unit-1-foundation/code/code-summary.md` — list of all created files with descriptions

---

## Story Traceability

| Story | Steps |
|---|---|
| US-1.1 | 11, 12, 20, 22 |
| US-1.2 | 11, 20, 22 |
| US-1.3 | 11, 21, 22, 24 |
| US-1.4 | 11, 22 |
| US-1.5 | 11, 20, 24 |
| US-1.6 | 14, 15, 21, 23, 24 |
| US-1.7 | 13, 14, 17, 18, 21, 23, 24 |

## Total Steps: 26
