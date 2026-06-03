## Why

The `admin-sesiones` spec delivers the list of incoming trade requests but the system has no way to originate one. The PRODUCT.md flow is "admin generates a QR with a unique token → cambiador scans it → sesi\u00f3n de cambio is created → admin sees it in the list", and the first step of that loop is the only piece missing. Without it, sesi\u00f3nes cannot exist outside the seed file, so the whole accept/reject loop is effectively read-only.

## What Changes

- Add a single "Generar QR" button on the `/admin` home that creates a new unique token every time it is clicked. The previous active token for the same admin is automatically revoked.
- The generated QR is shown in a `Dialog` with: a 256px QR image, the full URL (`{NEXT_PUBLIC_APP_URL}/cambio/{token}`), a "Copiar URL" button, and the token creation timestamp. Closing the dialog does not delete the token.
- Add a "Ver QR" button on every **open** sesi\u00f3n row that re-displays the QR originally used to create that sesi\u00f3n (so the admin can re-share it if the trade needs to be resumed). Closed sesi\u00f3nes do not show the button. Sesi\u00f3nes without a stored token (legacy seed) also do not show it.
- Persist tokens in a JSON file (`data/qr-tokens.json`) accessed through a swappable repository (`src/lib/qr-store.ts`), so the next change can swap the implementation to Prisma without touching the UI or Server Actions.
- Add a `token: string` field to the `Session` schema so each sesi\u00f3n remembers the QR it originated from.
- Both seed files (`sessions.seed.json` and `qr-tokens.seed.json`) ship as `[]` — start fresh, no legacy data.
- A new env var `NEXT_PUBLIC_APP_URL` is added to `.env.example` with a fallback to `http://localhost:3000` so the generated URL is scannable in dev and configurable in prod.

## Capabilities

### New Capabilities
- `admin-qr`: Admin-side generation, persistence, and display of unique QR tokens for sesi\u00f3n origination. One active token per admin at a time, revocable by regenerating.

### Modified Capabilities
- `admin-sesiones`: Sesi\u00f3n rows gain a "Ver QR" affordance (open only) that links the sesi\u00f3n to its origin token. Also adds the `token: string` field to the data model.

## Impact

- **New files**:
  - `src/lib/qr.ts` (types + Zod schema)
  - `src/lib/qr-store.ts` (JSON-file repository, swappable for Prisma)
  - `data/qr-tokens.seed.json` (committed `[]` seed)
  - `src/app/admin/qr-actions.ts` (`'use server'` Server Actions: `generateQr`, `revokeQr`)
  - `src/components/admin/generate-qr-button.tsx` (client, opens the QR Dialog)
  - `src/components/admin/qr-dialog.tsx` (reusable Dialog: QR + URL + copy + close)
  - `src/components/admin/view-session-qr-button.tsx` (client, opens the same Dialog for a sesi\u00f3n's stored token)
- **Modified files**:
  - `src/lib/sessions.ts` — add `token: z.string().min(1)` to `SessionSchema`
  - `src/lib/sessions-store.ts` — no functional change; new field is read-through
  - `data/sessions.seed.json` — replaced with `[]` (start fresh)
  - `src/app/admin/page.tsx` — add "Generar QR" button to the header
  - `src/components/admin/session-row.tsx` — add conditional "Ver QR" button (open + has token)
  - `.env.example` — add `NEXT_PUBLIC_APP_URL`
  - `.gitignore` — `data/qr-tokens.json` joins the gitignored runtime files
  - `package.json` + `pnpm-lock.yaml` — add `qrcode` + `@types/qrcode`
- **shadcn components used**: `button`, `dialog`, `input` — all already installed
- **No DB / Prisma changes** in this change (deferred to a follow-up; the repository boundary keeps the swap mechanical — see `design.md` "Future migration to Prisma" section)
- **No breaking changes** to existing routes; the new button is additive
- **No public view** (`/cambio/[token]`) in this change — explicit Non-Goal
