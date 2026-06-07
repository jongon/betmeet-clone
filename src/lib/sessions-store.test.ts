import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { buildEmptyProposal, syncProposalBlocks } from "@/lib/cambio-proposal";
import { cloneDefaultExchangeSettings } from "@/lib/exchange-settings";
import { toMissingRecord } from "@/lib/missing";
import { getMissingInventory, replaceMissingInventory } from "@/lib/missing-store";
import { prisma } from "@/lib/prisma";
import { getInventory, saveGroupRepeateds } from "@/lib/repeateds-store";
import {
  acceptPendingSessionForAdmin,
  archiveSession,
  createSession,
  getAllSessions,
  getSessionById,
  rejectSession,
  saveSessionProposal,
} from "@/lib/sessions-store";
import { cleanDatabase } from "@/lib/test-helpers";

beforeEach(async () => {
  await cleanDatabase();
});

afterEach(() => {});

describe("sessions store archiving", () => {
  test("normalizes sessions without archivedAt", async () => {
    await prisma.session.create({
      data: {
        id: "ses_legacy",
        cambiadorName: "Carlos",
        offeredCount: 1,
        requestedCount: 1,
        createdAt: new Date("2026-06-05T10:00:00.000Z"),
        status: "closed",
        token: "qr_1234567890abcdef1234567890abcdef",
        archivedAt: null,
      },
    });

    const sessions = await getAllSessions();
    assert.equal(sessions[0]?.archivedAt, null);
  });

  test("archives a closed session", async () => {
    const session = await createSession({
      token: "qr_1234567890abcdef1234567890abcdef",
      cambiadorId: "device-1",
      cambiadorName: "Marta",
    });

    await rejectSession(session.id);
    await archiveSession(session.id);

    const saved = await getSessionById(session.id);
    assert.equal(saved?.status, "closed");
    assert.ok(saved?.archivedAt);
  });

  test("does not archive an open session", async () => {
    const session = await createSession({
      token: "qr_1234567890abcdef1234567890abcdef",
      cambiadorId: "device-1",
      cambiadorName: "Luis",
    });

    await archiveSession(session.id);

    const saved = await getSessionById(session.id);
    assert.equal(saved?.status, "open");
    assert.equal(saved?.archivedAt, null);
  });

  test("accepts a pending session and consumes missing and repeated inventories", async () => {
    const ownerEmail = "admin@example.com";
    const settings = cloneDefaultExchangeSettings();
    const session = await createSession({
      token: "qr_1234567890abcdef1234567890abcdef",
      cambiadorId: "device-1",
      cambiadorName: "Marta",
    });

    const proposal = buildEmptyProposal();
    proposal.status = "pending";
    proposal.selectedStickerCodes = ["ARG-7"];
    proposal.blocks = syncProposalBlocks(proposal.selectedStickerCodes, [], settings, {});
    proposal.requestedRepeateds = [{ stickerCode: "POR-15", quantity: 2 }];

    await saveSessionProposal(session.id, proposal);
    await replaceMissingInventory(ownerEmail, toMissingRecord(["ARG-7", "ARG-8"]));
    await saveGroupRepeateds(ownerEmail, "POR", { "POR-15": 3 }, new Set(["POR-15"]));

    await acceptPendingSessionForAdmin(session.id, ownerEmail);

    const savedSession = await getSessionById(session.id);
    const missingInventory = await getMissingInventory(ownerEmail);
    const repeatedInventory = await getInventory(ownerEmail);

    assert.equal(savedSession?.status, "closed");
    assert.deepEqual(missingInventory.items, { "ARG-8": true });
    assert.deepEqual(repeatedInventory.items, { "POR-15": 1 });
  });

  test("closes the session without consuming inventory when missing stickers are outdated", async () => {
    const ownerEmail = "admin@example.com";
    const settings = cloneDefaultExchangeSettings();
    const session = await createSession({
      token: "qr_1234567890abcdef1234567890abcdef",
      cambiadorId: "device-2",
      cambiadorName: "Luis",
    });

    const proposal = buildEmptyProposal();
    proposal.status = "pending";
    proposal.selectedStickerCodes = ["ARG-7"];
    proposal.blocks = syncProposalBlocks(proposal.selectedStickerCodes, [], settings, {});
    proposal.requestedRepeateds = [{ stickerCode: "POR-15", quantity: 1 }];

    await saveSessionProposal(session.id, proposal);
    await replaceMissingInventory(ownerEmail, toMissingRecord(["ARG-8"]));
    await saveGroupRepeateds(ownerEmail, "POR", { "POR-15": 3 }, new Set(["POR-15"]));

    await acceptPendingSessionForAdmin(session.id, ownerEmail);

    const savedSession = await getSessionById(session.id);
    const missingInventory = await getMissingInventory(ownerEmail);
    const repeatedInventory = await getInventory(ownerEmail);

    assert.equal(savedSession?.status, "closed");
    assert.deepEqual(missingInventory.items, { "ARG-8": true });
    assert.deepEqual(repeatedInventory.items, { "POR-15": 3 });
  });

  test("closes the session without consuming inventory when repeated stock is insufficient", async () => {
    const ownerEmail = "admin@example.com";
    const settings = cloneDefaultExchangeSettings();
    const session = await createSession({
      token: "qr_1234567890abcdef1234567890abcdef",
      cambiadorId: "device-3",
      cambiadorName: "Ana",
    });

    const proposal = buildEmptyProposal();
    proposal.status = "pending";
    proposal.selectedStickerCodes = ["ARG-7"];
    proposal.blocks = syncProposalBlocks(proposal.selectedStickerCodes, [], settings, {});
    proposal.requestedRepeateds = [{ stickerCode: "POR-15", quantity: 2 }];

    await saveSessionProposal(session.id, proposal);
    await replaceMissingInventory(ownerEmail, toMissingRecord(["ARG-7"]));
    await saveGroupRepeateds(ownerEmail, "POR", { "POR-15": 1 }, new Set(["POR-15"]));

    await acceptPendingSessionForAdmin(session.id, ownerEmail);

    const savedSession = await getSessionById(session.id);
    const missingInventory = await getMissingInventory(ownerEmail);
    const repeatedInventory = await getInventory(ownerEmail);

    assert.equal(savedSession?.status, "closed");
    assert.deepEqual(missingInventory.items, { "ARG-7": true });
    assert.deepEqual(repeatedInventory.items, { "POR-15": 1 });
  });

  test("does not consume inventory twice for a closed session", async () => {
    const ownerEmail = "admin@example.com";
    const settings = cloneDefaultExchangeSettings();
    const session = await createSession({
      token: "qr_1234567890abcdef1234567890abcdef",
      cambiadorId: "device-4",
      cambiadorName: "Carlos",
    });

    const proposal = buildEmptyProposal();
    proposal.status = "pending";
    proposal.selectedStickerCodes = ["ARG-7"];
    proposal.blocks = syncProposalBlocks(proposal.selectedStickerCodes, [], settings, {});
    proposal.requestedRepeateds = [{ stickerCode: "POR-15", quantity: 1 }];

    await saveSessionProposal(session.id, proposal);
    await replaceMissingInventory(ownerEmail, toMissingRecord(["ARG-7"]));
    await saveGroupRepeateds(ownerEmail, "POR", { "POR-15": 2 }, new Set(["POR-15"]));

    await acceptPendingSessionForAdmin(session.id, ownerEmail);
    await acceptPendingSessionForAdmin(session.id, ownerEmail);

    const missingInventory = await getMissingInventory(ownerEmail);
    const repeatedInventory = await getInventory(ownerEmail);

    assert.deepEqual(missingInventory.items, {});
    assert.deepEqual(repeatedInventory.items, { "POR-15": 1 });
  });
});
