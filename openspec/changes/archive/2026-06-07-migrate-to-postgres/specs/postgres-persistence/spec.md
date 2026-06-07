## ADDED Requirements

### Requirement: Prisma client singleton
The system SHALL export a singleton PrismaClient instance from `src/lib/prisma.ts` that reuses the same connection across hot reloads in development.

#### Scenario: Prisma client reused in dev
- **WHEN** the Next.js dev server hot-reloads a module that imports prisma
- **THEN** the same PrismaClient instance is reused without creating new connections

### Requirement: Session store uses Prisma
The system SHALL provide the same public API as `src/lib/sessions-store.ts` but using Prisma queries instead of file reads/writes. Functions SHALL be async (returning Promises).

#### Scenario: Get all sessions
- **WHEN** `getAllSessions()` is called
- **THEN** all Session rows with their nested Proposal, Blocks, and RequestedRepeateds are returned

#### Scenario: Get session by ID
- **WHEN** `getSessionById("ses_xxx")` is called
- **THEN** the Session with nested proposal data is returned, or undefined if not found

#### Scenario: Create a new session
- **WHEN** `createSession({ cambiadorName, cambiadorId, token })` is called
- **THEN** a new Session row is inserted with status "open" and the row is returned

#### Scenario: Save proposal to session
- **WHEN** `saveSessionProposal(sessionId, proposal)` is called
- **THEN** the SessionProposal is upserted with its blocks and requestedRepeateds matching the proposal object

#### Scenario: Archive a session
- **WHEN** `archiveSession(sessionId)` is called
- **THEN** the session's archivedAt is set to current time

### Requirement: QR token store uses Prisma
The system SHALL provide the same public API as `src/lib/qr-store.ts` but using Prisma queries instead of file reads/writes. Functions SHALL be async.

#### Scenario: Generate a new QR token
- **WHEN** `generateToken("a@b.com")` is called
- **THEN** any existing active token for that owner is revoked, and a new hex token is inserted and returned

#### Scenario: Get active token
- **WHEN** `getActiveToken("a@b.com")` is called
- **THEN** the token with revokedAt IS NULL for that owner is returned, or undefined

#### Scenario: Revoke a token
- **WHEN** `revokeToken("qr_xxx")` is called
- **THEN** the token's revokedAt is set to current time

### Requirement: Repeateds store uses Prisma
The system SHALL provide the same public API as `src/lib/repeateds-store.ts` but using Prisma queries instead of file reads/writes. Functions SHALL be async.

#### Scenario: Get inventory for owner
- **WHEN** `getInventory("a@b.com")` is called
- **THEN** the RepeatedInventory row with its items is returned, or a default empty inventory

#### Scenario: Save group repeateds
- **WHEN** `saveGroupRepeateds(ownerEmail, groupCode, groupItems, allowedCodes)` is called
- **THEN** only stickers matching allowedCodes are updated; others in the owner's inventory are preserved

#### Scenario: Decrement repeated inventory
- **WHEN** `decrementRepeatedInventory(ownerEmail, [{ stickerCode: "ARG-10", quantity: 2 }])` is called
- **THEN** the quantity for that sticker is decremented; if insufficient, returns { ok: false, stickerCode }

### Requirement: Missing store uses Prisma
The system SHALL provide the same public API as `src/lib/missing-store.ts` but using Prisma queries instead of file reads/writes. Functions SHALL be async.

#### Scenario: Get missing inventory
- **WHEN** `getMissingInventory("a@b.com")` is called
- **THEN** the MissingInventory row with its items is returned, or a new empty inventory is created and returned

#### Scenario: Replace missing inventory
- **WHEN** `replaceMissingInventory("a@b.com", { "ARG-10": true })` is called
- **THEN** the items JSONB is replaced and updatedAt is refreshed

### Requirement: Exchange settings store uses Prisma
The system SHALL provide the same public API as `src/lib/exchange-settings-store.ts` but using Prisma queries instead of file reads/writes. Functions SHALL be async.

#### Scenario: Get exchange settings
- **WHEN** `getExchangeSettings("a@b.com")` is called
- **THEN** the ExchangeSettings row with global and overrides is returned, or default settings if none exist

#### Scenario: Save global settings
- **WHEN** `saveGlobalExchangeSettings("a@b.com", newGlobal)` is called
- **THEN** the global JSONB column is updated with the new ExchangeSettings

#### Scenario: Save sticker override
- **WHEN** `saveStickerOverride("a@b.com", "ARG-10", override)` is called
- **THEN** the overrides JSONB record is updated with the new StickerOverride for that key

### Requirement: Store functions are async
All store module public functions SHALL return Promises. Callers (Server Actions, Server Components) SHALL use `await`.

#### Scenario: Server Action calls store
- **WHEN** a Server Action calls `await getActiveToken(email)`
- **THEN** the query executes against PostgreSQL and returns the result

### Requirement: Seed script populates default data
The system SHALL provide `prisma/seed.ts` that inserts default ExchangeSettings using `DEFAULT_EXCHANGE_SETTINGS` for a configurable owner email, matching the behavior of `exchange-settings.seed.json`.

#### Scenario: Run seed script
- **WHEN** `prisma db seed` is executed
- **THEN** default exchange settings are inserted for a predefined owner email without errors

### Requirement: Tests work with PostgreSQL
The system SHALL support running tests against a PostgreSQL database. Test files SHALL use the same store modules but against a database configured via environment.

#### Scenario: Sessions store test
- **WHEN** `pnpm test src/lib/sessions-store.test.ts` runs
- **THEN** tests create sessions, save proposals, archive, and verify results against PostgreSQL
