## 1. Prisma Setup

- [x] 1.1 Install prisma (devDependency) and @prisma/client (dependency) via pnpm
- [x] 1.2 Run `prisma init --datasource-provider postgresql` to create prisma/schema.prisma
- [x] 1.3 Configure DATABASE_URL in prisma/schema.prisma to use env variable (defaults to docker-compose credentials)
- [x] 1.4 Create `src/lib/prisma.ts` singleton exporting PrismaClient

## 2. Prisma Schema — Models

- [x] 2.1 Define QrToken model (token PK text, ownerEmail, createdAt default now, revokedAt optional)
- [x] 2.2 Define RepeatedInventory model (id serial PK, ownerEmail unique, updatedAt, items JSONB)
- [x] 2.3 Define MissingInventory model (id serial PK, ownerEmail unique, updatedAt, items JSONB)
- [x] 2.4 Define ExchangeSettings model (id serial PK, ownerEmail unique, updatedAt, global JSONB, overrides JSONB)
- [x] 2.5 Define Session model (id text PK, cambiadorName, cambiadorId optional, offeredCount, requestedCount, createdAt, status, token FK->QrToken, archivedAt optional)
- [x] 2.6 Define SessionProposal model (id serial PK, sessionId unique FK->Session onDelete Cascade, status, currentStep, flowVersion optional, selectedStickerCodes JSONB, updatedAt, submittedAt optional)
- [x] 2.7 Define ProposalBlock model (id serial PK, proposalId FK->SessionProposal onDelete Cascade, requestedStickerCode, requestedStickerLabel, requestedStickerType, mode, modeLabel, rule JSONB, fulfillRequirements JSONB, counteroffer JSONB optional)
- [x] 2.8 Define RequestedRepeated model (id serial PK, proposalId FK->SessionProposal onDelete Cascade, stickerCode, quantity)
- [x] 2.9 Verify prisma/schema.prisma builds cleanly with `prisma validate`

## 3. Migration

- [x] 3.1 Ensure PostgreSQL container is running (`docker compose up -d postgres`)
- [x] 3.2 Run `prisma migrate dev --name init` to generate initial migration
- [x] 3.3 Verify migration applies successfully and tables exist in database

## 4. QR Token Store Refactor

- [x] 4.1 Rewrite `src/lib/qr-store.ts`: remove fs imports, replace read/writeFile with prisma queries
- [x] 4.2 `generateToken(ownerEmail)`: use prisma.qrToken.updateMany to set revokedAt on active tokens, then prisma.qrToken.create for new token
- [x] 4.3 `getActiveToken(ownerEmail)`: use prisma.qrToken.findFirst where revokedAt is null
- [x] 4.4 `getToken(token)`: use prisma.qrToken.findUnique
- [x] 4.5 `revokeToken(token)`: use prisma.qrToken.update to set revokedAt
- [x] 4.6 Remove env-var-based file path overrides (SESSION_FILE, etc. no longer applies)
- [x] 4.7 Mark all exported functions as async with Promise return types

## 5. Repeateds Store Refactor

- [x] 5.1 Rewrite `src/lib/repeateds-store.ts`: remove fs imports, replace file ops with prisma queries
- [x] 5.2 `getInventory(ownerEmail)`: use prisma.repeatedInventory.findUnique, return default empty inventory if null
- [x] 5.3 `saveGroupRepeateds(ownerEmail, groupCode, groupItems, allowedCodes)`: read existing, merge items filtered by allowedCodes, upsert row
- [x] 5.4 `decrementRepeatedInventory(ownerEmail, requestedRepeateds)`: read inventory, validate sufficient quantities, update items JSONB
- [x] 5.5 Keep Zod validation of read data (same as before)
- [x] 5.6 Mark all exported functions as async

## 6. Missing Store Refactor

- [x] 6.1 Rewrite `src/lib/missing-store.ts`: remove fs imports, replace file ops with prisma queries
- [x] 6.2 `getMissingInventory(ownerEmail)`: use prisma.missingInventory.findUnique, create empty inventory if null
- [x] 6.3 `replaceMissingInventory(ownerEmail, items)`: validate sticker codes via catalog, upsert items JSONB
- [x] 6.4 `clearStoredMissingInventory(ownerEmail)`: update items to empty object {}
- [x] 6.5 Keep Zod validation of read data
- [x] 6.6 Mark all exported functions as async

## 7. Exchange Settings Store Refactor

- [x] 7.1 Rewrite `src/lib/exchange-settings-store.ts`: remove fs imports, replace file ops with prisma queries
- [x] 7.2 `getExchangeSettings(ownerEmail)`: query prisma.exchangeSettings.findUnique, return DEFAULT_EXCHANGE_SETTINGS if null
- [x] 7.3 `saveGlobalExchangeSettings(ownerEmail, global)`: upsert row with new global JSONB
- [x] 7.4 `saveStickerOverride(ownerEmail, stickerCode, override)`: read existing overrides, update the record, upsert
- [x] 7.5 `resetStickerOverride(ownerEmail, stickerCode)`: remove the key from overrides JSONB record
- [x] 7.6 Keep existing normalization logic (legacy overrides migration)
- [x] 7.7 Mark all exported functions as async

## 8. Sessions Store Refactor

- [x] 8.1 Rewrite `src/lib/sessions-store.ts`: remove fs imports, replace file ops with prisma queries
- [x] 8.2 `getAllSessions()`: use prisma.session.findMany with include for proposal, blocks, requestedRepeateds
- [x] 8.3 `getSessionById(id)`: use prisma.session.findUnique with nested include
- [x] 8.4 `createSession(input)`: use prisma.session.create
- [x] 8.5 `saveSessionProposal(id, proposal)`: upsert SessionProposal via prisma.session.update with proposal.create/update; delete existing blocks/requestedRepeateds and recreate
- [x] 8.6 `archiveSession(id)`: update archivedAt field
- [x] 8.7 `acceptSession(id)` / `rejectSession(id)`: update status field
- [x] 8.8 `acceptPendingSessionForAdmin(id, ownerEmail)`: validate and consume inventories atomically in a prisma.$transaction
- [x] 8.9 `findLatestSessionByTokenAndCambiadorId()` / `resolveByTokenAndCambiadorId()`: use prisma findFirst with ordering
- [x] 8.10 Keep existing Zod validation and normalization of read data
- [x] 8.11 Mark all exported functions as async

## 9. Update Callers for Async

- [x] 9.1 Find all callers of store functions (Server Actions, Server Components, page.tsx files) and add `await`
- [x] 9.2 Update any synchronous call chains that assumed store functions returned values directly
- [x] 9.3 Verify no `fs` imports remain in store modules

## 10. Seed Script

- [x] 10.1 Create `prisma/seed.ts` that inserts DEFAULT_EXCHANGE_SETTINGS for a seed owner email
- [x] 10.2 Add `"prisma": { "seed": "tsx prisma/seed.ts" }` to package.json
- [x] 10.3 Test with `prisma db seed`

## 11. Docker & Environment

- [x] 11.1 Ensure DATABASE_URL is set in docker-compose.yml for both app and devcontainer services
- [x] 11.2 Add `prisma migrate deploy` to app service entrypoint (optional but recommended)
- [x] 11.3 Create `.env.example` entry for DATABASE_URL (references docker-compose default)
- [x] 11.4 Create `prisma/migrations/` directory is committed to git (migrations are source of truth)

## 12. Tests

- [x] 12.1 Set up test database: create `nextjs_test` database in PostgreSQL, ensure DATABASE_URL for tests points to it
- [x] 12.2 Update `src/lib/sessions-store.test.ts`: remove file-path env vars, set up Prisma-based test data
- [x] 12.3 Update `src/lib/cambio-proposal.test.ts`: use Prisma-backed stores
- [x] 12.4 Update `src/lib/repeateds-store.test.ts`: use Prisma-backed inventory
- [x] 12.5 Update `src/lib/missing.test.ts`: use Prisma-backed inventory
- [x] 12.6 Update `src/lib/exchange-settings.test.ts`: use Prisma-backed settings
- [x] 12.7 Update `src/lib/admin-session-detail.test.ts`: use Prisma-backed sessions
- [x] 12.8 Run all tests with `pnpm test` and ensure they pass

## 13. Verification

- [x] 13.1 Run `pnpm lint` and fix any lint errors
- [x] 13.2 Run `pnpm build` and fix any TypeScript/build errors
- [x] 13.3 Run `pnpm test` and verify all tests pass
- [x] 13.4 Manual smoke test: start app, log in as admin, verify QR token generation, session flow, repeateds/missing CRUD
