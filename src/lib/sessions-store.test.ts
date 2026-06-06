import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { buildEmptyProposal, syncProposalBlocks } from "@/lib/cambio-proposal";
import { cloneDefaultExchangeSettings } from "@/lib/exchange-settings";
import { toMissingRecord } from "@/lib/missing";
import { getMissingInventory, replaceMissingInventory } from "@/lib/missing-store";
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

let tmpDir = "";
let sessionsFile = "";
let sessionsSeedFile = "";
let missingFile = "";
let repeatedsFile = "";
let repeatedsSeedFile = "";

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), "sessions-store-"));
  sessionsFile = path.join(tmpDir, "sessions.json");
  sessionsSeedFile = path.join(tmpDir, "sessions.seed.json");
  missingFile = path.join(tmpDir, "missing.json");
  repeatedsFile = path.join(tmpDir, "repeateds.json");
  repeatedsSeedFile = path.join(tmpDir, "repeateds.seed.json");

  process.env.SESSIONS_FILE = sessionsFile;
  process.env.SESSIONS_SEED_FILE = sessionsSeedFile;
  process.env.MISSINGS_FILE = missingFile;
  process.env.REPEATEDS_FILE = repeatedsFile;
  process.env.REPEATEDS_SEED_FILE = repeatedsSeedFile;

  await writeFile(sessionsSeedFile, "[]\n", "utf8");
  await writeFile(repeatedsSeedFile, "[]\n", "utf8");
});

afterEach(() => {
  delete process.env.SESSIONS_FILE;
  delete process.env.SESSIONS_SEED_FILE;
  delete process.env.MISSINGS_FILE;
  delete process.env.REPEATEDS_FILE;
  delete process.env.REPEATEDS_SEED_FILE;
});

describe("sessions store archiving", () => {
  test("normalizes legacy sessions without archivedAt", async () => {
    await writeFile(
      sessionsFile,
      JSON.stringify(
        [
          {
            id: "ses_legacy",
            cambiadorName: "Carlos",
            offeredCount: 1,
            requestedCount: 1,
            createdAt: "2026-06-05T10:00:00.000Z",
            status: "closed",
            token: "qr_1234567890abcdef1234567890abcdef",
            proposal: null,
          },
        ],
        null,
        2,
      ),
      "utf8",
    );

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
