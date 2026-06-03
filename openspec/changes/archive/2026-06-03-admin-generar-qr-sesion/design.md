## Context

The platform's end-to-end flow (PROJECT.md) starts with the admin generating a QR that the cambiador will scan. Today only the receiving end exists: `admin-sesiones` lets the admin see and accept/reject incoming requests, but no request can ever be created because there is no public-facing entry point and no way to mint the token that one would use. The two open questions from the proposal phase — "where does the token live?" and "what is its lifecycle?" — are answered below in a way that keeps the next change (the `/cambio/[token]` cambiador-facing page) a small, additive step.

This change introduces the QR origination side: a single button on `/admin` that mints a token, shows the QR, and lets the admin copy the resulting URL. We deliberately stop short of building the public side so this change stays focused and shippable in one sitting; the JSON-file repository keeps the migration to Prisma mechanical (see the "Future migration to Prisma" section at the end of this document).

## Goals / Non-Goals

**Goals:**
- One "Generar QR" button on `/admin` that mints a unique token every click.
- Token has prefix `qr_` + 32 random chars, generated via `crypto.randomBytes(16).toString("hex")`.
- Only one active (non-revoked) token per admin at a time. Generating a new one revokes the previous.
- QR shown in a `Dialog` as a 256px PNG (via the `qrcode` library on the server) plus the full URL.
- "Copiar URL" via `navigator.clipboard.writeText`, with a `document.execCommand("copy")` fallback for non-secure contexts.
- Each open sesi\u00f3n with a stored `token` shows a "Ver QR" button that re-displays the original QR in the same Dialog.
- Persistence: `data/qr-tokens.json` + swappable repository, auto-seeded from `data/qr-tokens.seed.json` (`[]`).
- `Session` schema gains `token: string` so the sesi\u00f3n can be linked back to its QR.
- Both seed files ship empty; no legacy data.
- `NEXT_PUBLIC_APP_URL` in `.env.example` with a `http://localhost:3000` fallback so the generated URL works in dev without configuration.

**Non-Goals:**
- Public `/cambio/[token]` page — explicit follow-up change.
- Scanned-by-side state, one-shot enforcement, or expiry. Tokens are revocable by regenerating; no automatic TTL.
- Rate-limiting the "Generar QR" button. Acceptable for the current single-admin demo.
- Per-session QRs (one QR per sesi\u00f3n on demand). The model is "one active QR per admin" — sesi\u00f3nes are *created* when that QR is scanned, not the other way around.
- Album / repetidos / faltantes. The QR encodes a URL only; the cambiador side (when built) will decide what to show based on the admin's album.

## Decisions

### 1. JSON-file repository, mirroring the existing `sessions-store.ts`
- **Choice**: `src/lib/qr-store.ts` exposes async `getActiveToken(email)`, `generateToken(email)`, `getToken(token)`, `revokeToken(token)`. Backed by `data/qr-tokens.json`, auto-seeded from `data/qr-tokens.seed.json`.
- **Why**: Zero new infra, exact same shape as `sessions-store.ts` so the team is already familiar with the pattern. Repository boundary keeps the swap to Prisma mechanical.
- **Alternatives considered**:
  - Reuse `sessions-store.ts` (single store for both sesi\u00f3nes and tokens): couples two unrelated concepts; the sesi\u00f3n lifecycle (open/closed) is fundamentally different from the token lifecycle (active/revoked). Better as separate stores.
  - SQLite: heavier setup, doesn't bring us closer to the eventual Prisma + Postgres stack.

### 2. Server-side QR rendering via the `qrcode` library
- **Choice**: The Server Action `generateQr` returns `{ token, dataUrl, url }` where `dataUrl` is a `data:image/png;base64,...` produced by `QRCode.toDataURL(url)`. The client renders `<img src={dataUrl} alt="QR" />` inside the Dialog.
- **Why**: SSR-friendly, no client-side QR library, single ~50 KB dep with no transitive React baggage. The image is small enough (≈2-4 KB) that embedding it in the action's return value is fine.
- **Alternatives considered**:
  - `qrcode.react` (renders SVG on the client): needs the URL to already be known on the client, which would mean another round-trip after the action returns. Slightly heavier total bundle.
  - `<canvas>` on the client with `qrcode` lib: same end result, more code.

### 3. Token format: `qr_` + 32 hex chars
- **Choice**: `qr_${crypto.randomBytes(16).toString("hex")}` (16 bytes = 128 bits of entropy).
- **Why**: 128 bits is the conventional sweet spot for unguessable, URL-safe tokens. The `qr_` prefix is a namespace marker that makes logs and debugging easier and lets future code quickly distinguish QR tokens from sesi\u00f3n ids (which use `ses_`).
- **Alternatives considered**:
  - UUID v4: also 122 bits of entropy, but no namespace prefix. We'd add a `qr_` prefix anyway, making the UUID redundant.
  - `nanoid`: nice defaults, but adds a dep for a single use site.

### 4. Revoke on regenerate, not on dialog close
- **Choice**: `generateQr` revokes the previous active token (sets `revokedAt` to the current ISO timestamp) and inserts the new one. Closing the Dialog does *not* revoke anything — the token stays valid until the admin regenerates.
- **Why**: The user's mental model is "I generated a QR, I might show it to someone, I might regenerate later". Closing the dialog is not an intent to invalidate. This matches the answer to the "¿qué significa 'se desecha'?" clarification: the old token is discarded only when a new one replaces it.
- **Alternative considered**: Revoke on dialog close — rejected because it makes the flow feel fragile (admin closes the dialog by accident and breaks their own QR).

### 5. "Generar QR" lives in the `/admin` header, not a dedicated subroute
- **Choice**: A button in the same flex row as the title, badge, and SignOutButton. No new route, no navigation.
- **Why**: The user explicitly chose "un único botón en el home del admin" and "start fresh, 0 sesiones" — the home should be the single surface for both minting and triaging. Adding a subroute would force an extra click for a single-step action.

### 6. "Ver QR" appears only on open sesi\u00f3nes with a stored token
- **Choice**: `SessionRow` renders a third icon button (eye icon) when `status === "open" && token.length > 0`. Closed sesi\u00f3nes and sesi\u00f3nes without a token (legacy seed) skip it.
- **Why**: Matches the "por si se necesita reanudar la sesi\u00f3n" intent. Closed sesi\u00f3nes don't need a re-share path; sesi\u00f3nes without a token can't show one.

### 7. One reusable `QrDialog` for both flows
- **Choice**: `qr-dialog.tsx` accepts a `token`, an `email`, and a `trigger` slot. The `generate-qr-button.tsx` calls `generateQr()` and then opens the Dialog; the `view-session-qr-button.tsx` opens it with the sesi\u00f3n's stored token directly (no action needed, just look up).
- **Why**: One Dialog component, one QR rendering path, one copy-to-clipboard handler. Keeps the two call sites consistent and easy to evolve together.

### 8. URL composition with explicit fallback
- **Choice**: `const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"`. Used in both `generateQr` and the "Ver QR" path so the URL is always scannable in dev.
- **Why**: Forgetting to set the env var should not produce a broken QR. In Vercel / prod, the env is set during deploy.

## Risks / Trade-offs

- **[No automatic QR expiry]** → A token stays valid until the admin regenerates. Acceptable for the demo; in a hostile environment a TTL (e.g. 24h) would be a sensible follow-up.
- **[Token revocation is soft, not destructive]** → Revoked tokens are kept on disk with `revokedAt` set. The file grows linearly with regenerations. For a single-admin demo this is fine; in prod we'd want either deletion-on-revoke or a separate `revokedTokens.json` to keep the active list hot.
- **[`generateQr` not rate-limited]** → A determined admin could spam tokens. Mitigated by the fact that each new token revokes the old one, so the *active* set never grows. A follow-up could add a debounce or a per-minute cap.
- **[Seed ships empty]** → First-time visit shows an empty sesi\u00f3n list and no active token. The empty state is already handled by `SessionList`; the new button is always visible regardless. Documented in the spec.
- **[Sesi\u00f3n "view QR" doesn't show scan status]** → The Dialog shows the static QR; the admin can't tell from it whether the cambiador already scanned. Acceptable because scan status requires a real cambiador flow (next change).
- **[JSON file is not safe under concurrent admins]** → Same single-admin constraint as `sessions-store.ts`. The follow-up Prisma migration removes the risk.

## Future migration to Prisma

The repository boundary in `src/lib/qr-store.ts` and `src/lib/sessions-store.ts` is designed so the JSON store can be replaced without touching any UI, Server Action, or route. The migration steps (for the team to keep in mind; **not implemented in this change**):

1. **Schema** (Prisma):
   ```prisma
   model User {
     id        String   @id @default(cuid())
     email     String   @unique
     createdAt DateTime @default(now())
     tokens    QrToken[]
     sessions  Session[]
   }

   model QrToken {
     token      String    @id
     owner      User      @relation(fields: [ownerId], references: [id])
     ownerId    String
     createdAt  DateTime  @default(now())
     revokedAt  DateTime?
     sessions   Session[]
     @@index([ownerId, revokedAt])
   }

   model Session {
     id              String   @id @default(cuid())
     cambiadorName   String
     offeredCount    Int
     requestedCount  Int
     createdAt       DateTime @default(now())
     status          SessionStatus
     token           String
     tokenRef        QrToken  @relation(fields: [token], references: [token])
     @@index([status, createdAt])
   }

   enum SessionStatus { open closed }
   ```

2. **Repository swap**: replace the `fs/promises` body of each store function with a `prisma.*` call. Signatures stay identical. UI / Server Actions unchanged.

3. **Seed**: convert `data/*.seed.json` to `prisma/seed.ts` with the same content; run via `pnpm prisma db seed`.

4. **Owner identification**: replace `ownerEmail` lookups with `userId` foreign keys. The lookup helper in `qr-store.ts` becomes `prisma.user.findUnique({ where: { email } })` then `prisma.qrToken.findFirst({ where: { ownerId: user.id, revokedAt: null } })`.

5. **Delete**: `data/sessions.json`, `data/qr-tokens.json`, the auto-seed logic, and the `data/*.seed.json` files (the JSON-file stores are now redundant).

6. **Lock down**: remove the `data/` directory entirely once the Prisma migration lands; the `.gitignore` lines for `data/*.json` become unnecessary.

The clean repository abstraction means a junior engineer can do the migration with one PR without touching components.
