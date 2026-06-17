# Unit 38 — Code Generation Plan · Gestión de passkeys desde Seguridad

> Plan creado 2026-06-17. Functional Design aprobado. NFR/Infra SKIP formal.
> API nativa `supabase.auth.passkey.*` verificada disponible en runtime (2.108.1).

## Application code locations (workspace root)

| Archivo | Acción |
|---------|--------|
| `src/features/auth/components/passkey-management-card.tsx` | **NUEVO** |
| `src/features/auth/components/__tests__/passkey-management-card.test.tsx` | **NUEVO** |
| `src/app/(app)/settings/security/page.tsx` | Modificar |
| `src/app/(app)/settings/security/security-client.tsx` | Modificar |
| `src/i18n/dictionaries/es.ts` | Modificar |
| `src/i18n/dictionaries/en.ts` | Modificar |

## Code Generation Part 1 — Plan (checklist)

- [x] Plan documented with file paths and step details
- [ ] Waiting for approval to proceed to Part 2 (Generation)

## Code Generation Part 2 — Generation (checklist)

### Step 1: Add i18n keys (`es.ts` + `en.ts`)
- [ ] Add `settings.passkeyTitle`, `settings.passkeyDescription`, `settings.passkeyDefaultName`, `settings.passkeyEmpty`, `settings.passkeyCount`, `settings.passkeyRegister`, `settings.passkeyRegistering`, `settings.passkeyRegistered`, `settings.passkeyDelete`, `settings.passkeyDeleteConfirm`, `settings.passkeyDeleteTitle`, `settings.passkeyDeleteDescription`, `settings.passkeyDeleted` (13 keys) to both dictionaries under `settings`.

### Step 2: Create `passkey-management-card.tsx`
- [ ] Client component (`"use client"`) accepting `passkeys: PasskeyInfo[]` prop.
- [ ] `PasskeyInfo` type: `{ id: string; friendlyName: string; createdAt: string }`.
- [ ] State: `useState(passkeys)` for local add/remove without refetch.
- [ ] Register flow: `createClient().auth.registerPasskey()` (same as `passkey-step.tsx`), `useState` for pending/error, toast on success/failure, append new passkey on success.
- [ ] Delete flow: `useState` for delete dialog open + target passkey id, confirm via `Dialog` (reuse pattern from `confirm-delete-modal.tsx` — simple dialog with title/description/buttons, no text confirmation needed), `createClient().auth.passkey.delete(id)`, toast on success/failure, filter from local state.
- [ ] Render: Card with `CardHeader` (title + description + register button) + `CardContent` (list of passkeys as bordered rows with friendlyName + delete button, or empty state with "No tienes passkeys registrados." + register button).
- [ ] `createClient()` imported from `@/lib/supabase/client` (already has `experimental.passkey: true`).

### Step 3: Update `page.tsx` (Server Component)
- [ ] Add `supabase.auth.passkey.list()` to the existing `Promise.all(...)`.
- [ ] Serialize passkeys to `PasskeyInfo[]`: `passkey.id`, `passkey.friendly_name ?? dictionary.settings.passkeyDefaultName`, `passkey.created_at`.
- [ ] Pass `passkeys` prop to `<SecuritySettingsClient>`.

### Step 4: Update `security-client.tsx` (Client Component)
- [ ] Add `passkeys` prop to `SecuritySettingsClientProps`.
- [ ] Import and render `<PasskeyManagementCard passkeys={passkeys} />` between the TOTP Card and the `<Separator />`.

### Step 5: Add tests
- [ ] `passkey-management-card.test.tsx`:
  - Renders empty state when passkeys array is empty.
  - Renders list of passkeys with friendly names.
  - Shows register button always.
  - Delete button opens confirmation dialog.
  - Confirm delete calls `passkey.delete(id)` and removes from list.
  - Cancel delete closes dialog without calls.
  - Register button calls `registerPasskey()`.

### Step 6: Verification
- [ ] `pnpm exec tsc --noEmit` — 0 errors.
- [ ] `pnpm exec biome check src/features/auth/components/passkey-management-card.tsx src/features/auth/components/__tests__/passkey-management-card.test.tsx src/app/\(app\)/settings/security/page.tsx src/app/\(app\)/settings/security/security-client.tsx src/i18n/dictionaries/es.ts src/i18n/dictionaries/en.ts` — clean.
- [ ] `pnpm exec eslint` on touched `src/` files — 0 warnings/errors.
- [ ] `pnpm test` — full suite green (new passkey tests + existing tests intact).
- [ ] `pnpm build` — all routes OK.

## Security Baseline compliance

| Rule | Applicable? | Status |
|------|------------|--------|
| SECURITY-12 (auth management) | Sí — gestión de passkeys | Compliant — operaciones usan sesión activa; Supabase Auth autoriza WebAuthn |
| Resto de reglas | N/A — cambio UI/auth sin schema/infra/rutas | N/A |

## Generation summary destination

`aidlc-docs/construction/unit-38-passkey-security-management/code/generation-summary.md`
