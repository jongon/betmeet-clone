-- CreateTable
CREATE TABLE "QrToken" (
    "token" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "QrToken_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "RepeatedInventory" (
    "id" SERIAL NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "items" JSONB NOT NULL,

    CONSTRAINT "RepeatedInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissingInventory" (
    "id" SERIAL NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "items" JSONB NOT NULL,

    CONSTRAINT "MissingInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeSettings" (
    "id" SERIAL NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "global" JSONB NOT NULL,
    "overrides" JSONB NOT NULL,

    CONSTRAINT "ExchangeSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "cambiadorName" TEXT NOT NULL,
    "cambiadorId" TEXT,
    "offeredCount" INTEGER NOT NULL DEFAULT 0,
    "requestedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'open',
    "token" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionProposal" (
    "id" SERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "flowVersion" INTEGER,
    "selectedStickerCodes" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "SessionProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalBlock" (
    "id" SERIAL NOT NULL,
    "proposalId" INTEGER NOT NULL,
    "requestedStickerCode" TEXT NOT NULL,
    "requestedStickerLabel" TEXT NOT NULL,
    "requestedStickerType" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "modeLabel" TEXT NOT NULL,
    "rule" JSONB NOT NULL,
    "fulfillRequirements" JSONB NOT NULL,
    "counteroffer" JSONB,

    CONSTRAINT "ProposalBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestedRepeated" (
    "id" SERIAL NOT NULL,
    "proposalId" INTEGER NOT NULL,
    "stickerCode" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "RequestedRepeated_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RepeatedInventory_ownerEmail_key" ON "RepeatedInventory"("ownerEmail");

-- CreateIndex
CREATE UNIQUE INDEX "MissingInventory_ownerEmail_key" ON "MissingInventory"("ownerEmail");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeSettings_ownerEmail_key" ON "ExchangeSettings"("ownerEmail");

-- CreateIndex
CREATE UNIQUE INDEX "SessionProposal_sessionId_key" ON "SessionProposal"("sessionId");

-- AddForeignKey
ALTER TABLE "SessionProposal" ADD CONSTRAINT "SessionProposal_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalBlock" ADD CONSTRAINT "ProposalBlock_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "SessionProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestedRepeated" ADD CONSTRAINT "RequestedRepeated_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "SessionProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
