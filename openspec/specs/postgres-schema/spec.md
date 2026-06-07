## ADDED Requirements

### Requirement: Session model exists
The system SHALL have a `Session` table with columns: `id` (text PK), `cambiadorName` (text), `cambiadorId` (text, optional), `offeredCount` (integer, default 0), `requestedCount` (integer, default 0), `createdAt` (timestamp with default now), `status` (text, default "open"), `token` (text, references QrToken.token), `archivedAt` (timestamp, optional).

#### Scenario: Create a new session
- **WHEN** a session is created with cambiadorName, cambiadorId, and a valid QR token
- **THEN** the session row is persisted with status "open", counts at 0, and createdAt set to current time

#### Scenario: Session references an existing QR token
- **WHEN** a session is created with a token that exists in QrToken table
- **THEN** the foreign key constraint allows the operation

### Requirement: SessionProposal model exists
The system SHALL have a `SessionProposal` table with a one-to-one relationship to `Session` via `sessionId` (unique). Columns: `id` (serial PK), `sessionId` (text, unique FK to Session), `status` (text, default "draft"), `currentStep` (integer, 1-3), `flowVersion` (integer, optional), `selectedStickerCodes` (JSONB, array of strings), `updatedAt` (timestamp), `submittedAt` (timestamp, optional).

#### Scenario: Create a proposal for a session
- **WHEN** a proposal is created with status "draft", currentStep 1, and an empty selectedStickerCodes array
- **THEN** the proposal row is persisted linked to the session

#### Scenario: Proposal cascades on session delete
- **WHEN** a session is deleted
- **THEN** the associated SessionProposal is also deleted

### Requirement: ProposalBlock model exists
The system SHALL have a `ProposalBlock` table with a many-to-one relationship to `SessionProposal` via `proposalId`. Columns: `id` (serial PK), `proposalId` (integer, FK to SessionProposal), `requestedStickerCode` (text), `requestedStickerLabel` (text), `requestedStickerType` (text, enum: PLAYER|BADGE|TEAM_PHOTO|SPECIAL), `mode` (text, enum: fulfill|counteroffer), `modeLabel` (text), `rule` (JSONB), `fulfillRequirements` (JSONB, array of {offerType, quantity}), `counteroffer` (JSONB, optional).

#### Scenario: Create proposal blocks for a proposal
- **WHEN** blocks are created for a proposalId with their rule, fulfillRequirements, and optional counteroffer
- **THEN** all blocks are persisted and linked to the proposal

#### Scenario: Blocks cascade on proposal delete
- **WHEN** a SessionProposal is deleted
- **THEN** all associated ProposalBlocks are also deleted

### Requirement: RequestedRepeated model exists
The system SHALL have a `RequestedRepeated` table with a many-to-one relationship to `SessionProposal` via `proposalId`. Columns: `id` (serial PK), `proposalId` (integer, FK to SessionProposal), `stickerCode` (text), `quantity` (integer, min 1).

#### Scenario: Add requested repeateds to a proposal
- **WHEN** requested repeated items [{stickerCode, quantity}] are added to a proposal
- **THEN** rows are persisted in the RequestedRepeated table

#### Scenario: RequestedRepeateds cascade on proposal delete
- **WHEN** a SessionProposal is deleted
- **THEN** all associated RequestedRepeateds are also deleted

### Requirement: QrToken model exists
The system SHALL have a `QrToken` table with columns: `token` (text PK, format `qr_[0-9a-f]{32}`), `ownerEmail` (text), `createdAt` (timestamp with default now), `revokedAt` (timestamp, optional). Only one active token (revokedAt IS NULL) SHALL exist per ownerEmail.

#### Scenario: Generate a new token for an owner
- **WHEN** a new token is generated for ownerEmail "a@b.com"
- **THEN** the new row is inserted and any existing active token for that owner has revokedAt set to current time

#### Scenario: Look up active token by owner
- **WHEN** querying QrToken where ownerEmail = "a@b.com" AND revokedAt IS NULL
- **THEN** at most one row is returned

### Requirement: RepeatedInventory model exists
The system SHALL have a `RepeatedInventory` table with columns: `id` (serial PK), `ownerEmail` (text, unique), `updatedAt` (timestamp), `items` (JSONB, Record<string, number>).

#### Scenario: Get inventory for an owner
- **WHEN** querying RepeatedInventory for ownerEmail "a@b.com"
- **THEN** the row with its items JSONB is returned, or empty/default if no row exists

#### Scenario: Update inventory items
- **WHEN** saving new items for ownerEmail "a@b.com"
- **THEN** the items JSONB is replaced and updatedAt is set to current time

### Requirement: MissingInventory model exists
The system SHALL have a `MissingInventory` table with columns: `id` (serial PK), `ownerEmail` (text, unique), `updatedAt` (timestamp), `items` (JSONB, Record<string, true>).

#### Scenario: Get missing inventory for an owner
- **WHEN** querying MissingInventory for ownerEmail "a@b.com"
- **THEN** the row with its items JSONB is returned, or empty/default if no row exists

#### Scenario: Replace missing inventory
- **WHEN** saving a new set of missing stickers for an owner
- **THEN** the items JSONB is replaced and updatedAt is set to current time

### Requirement: ExchangeSettings model exists
The system SHALL have an `ExchangeSettings` table with columns: `id` (serial PK), `ownerEmail` (text, unique), `updatedAt` (timestamp), `global` (JSONB, ExchangeSettings with PLAYER/BADGE/TEAM_PHOTO/SPECIAL rules), `overrides` (JSONB, Record<string, StickerOverride>).

#### Scenario: Get exchange settings for an owner
- **WHEN** querying ExchangeSettings for ownerEmail "a@b.com"
- **THEN** the row with its global and overrides JSONB is returned, or default settings if no row exists

#### Scenario: Save global exchange settings
- **WHEN** saving new global rules for an owner
- **THEN** the global JSONB is replaced and updatedAt is set to current time

#### Scenario: Save a sticker override
- **WHEN** adding or updating an override for stickerCode "ARG-10"
- **THEN** the overrides JSONB record is updated with the new StickerOverride

### Requirement: Schema uses UUID primary keys where appropriate
The system SHALL use `uuid` for Session.id and QrToken.token (text PKs for application-generated IDs) and `serial` (auto-increment integer) for all other primary keys.

#### Scenario: Session ID is UUID
- **WHEN** creating a session with a UUID id
- **THEN** the text primary key accepts the UUID format
