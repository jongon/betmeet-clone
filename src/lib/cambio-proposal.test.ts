import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
  buildAvailableRepeatedStickers,
  buildEmptyProposal,
  buildProposalBlock,
  buildRequestedStickers,
  countRequestedRepeateds,
  filterRequestedStickers,
  isCounterofferValid,
  normalizeRequestedRepeateds,
  parseExactStickerCodes,
  summarizeRule,
  syncProposalBlocks,
} from "@/lib/cambio-proposal";
import { cloneDefaultExchangeSettings } from "@/lib/exchange-settings";
import { createSession, getSessionById, saveSessionProposal } from "@/lib/sessions-store";

let tmpDir = "";
let sessionsFile = "";
let sessionsSeedFile = "";

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), "cambio-proposal-"));
  sessionsFile = path.join(tmpDir, "sessions.json");
  sessionsSeedFile = path.join(tmpDir, "sessions.seed.json");

  process.env.SESSIONS_FILE = sessionsFile;
  process.env.SESSIONS_SEED_FILE = sessionsSeedFile;

  await writeFile(sessionsSeedFile, "[]\n", "utf8");
});

afterEach(() => {
  delete process.env.SESSIONS_FILE;
  delete process.env.SESSIONS_SEED_FILE;
});

describe("cambio proposal persistence", () => {
  test("rehydrates an existing draft for an open session", async () => {
    const settings = cloneDefaultExchangeSettings();
    const session = await createSession({
      token: "qr_1234567890abcdef1234567890abcdef",
      cambiadorId: "device-1",
      cambiadorName: "Carlos",
    });

    const proposal = buildEmptyProposal();
    proposal.selectedStickerCodes = ["ARG-7"];
    proposal.blocks = syncProposalBlocks(proposal.selectedStickerCodes, [], settings, {});

    await saveSessionProposal(session.id, proposal);

    const saved = await getSessionById(session.id);
    assert.equal(saved?.proposal?.selectedStickerCodes[0], "ARG-7");
    assert.equal(saved?.requestedCount, 0);
  });

  test("persists a mixed proposal as pending with offered counts", async () => {
    const settings = cloneDefaultExchangeSettings();
    const session = await createSession({
      token: "qr_1234567890abcdef1234567890abcdef",
      cambiadorId: "device-1",
      cambiadorName: "Carlos",
    });

    const blocks = syncProposalBlocks(["ARG-7", "MEX-1"], [], settings, {});
    const nextBlocks = blocks.map((block) =>
      block.requestedStickerCode === "MEX-1"
        ? {
            ...block,
            mode: "counteroffer" as const,
            modeLabel: "Propone otra opcion" as const,
            counteroffer: {
              quantity: 1,
              offerType: "BADGE" as const,
              exactStickerCodes: ["POR-15"],
              note: "Solo tengo este badge.",
            },
          }
        : block,
    );

    await saveSessionProposal(session.id, {
      status: "pending",
      currentStep: 5,
      selectedStickerCodes: ["ARG-7", "MEX-1"],
      blocks: nextBlocks,
      requestedRepeateds: [{ stickerCode: "ARG-3", quantity: 2 }],
      updatedAt: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
    });

    const saved = await getSessionById(session.id);
    assert.equal(saved?.proposal?.status, "pending");
    assert.equal(saved?.requestedCount, 2);
    assert.equal(saved?.offeredCount, 2);
  });
});

describe("cambio proposal helpers", () => {
  test("filters requested stickers by team, type and flexible code", () => {
    const stickers = buildRequestedStickers(["ARG-7", "ARG-1", "MEX-14", "FWC-0"]);

    const filtered = filterRequestedStickers(stickers, {
      group: "Argentina",
      type: "PLAYER",
      search: "ARG 7",
    });

    assert.deepEqual(
      filtered.map((sticker) => sticker.code),
      ["ARG-7"],
    );
  });

  test("marks override blocks as special and general blocks as general", () => {
    const settings = cloneDefaultExchangeSettings();
    const blocks = syncProposalBlocks(["ARG-7", "MEX-1"], [], settings, {
      "ARG-7": {
        abstract: { PLAYER: 2, BADGE: 0, TEAM_PHOTO: 0, SPECIAL: 0, ANY: 0 },
        exact: { stickerCode: "POR-15" },
      },
    });

    assert.equal(blocks[0]?.rule.label, "Intercambio especial");
    assert.equal(blocks[0]?.rule.exactStickerCode, "POR-15");
    assert.equal(blocks[1]?.rule.label, "Intercambio general");
  });

  test("keeps fulfill abstract and validates explicit counteroffers", () => {
    const settings = cloneDefaultExchangeSettings();
    const [block] = syncProposalBlocks(["ARG-7"], [], settings, {});

    assert.equal(block.mode, "fulfill");
    assert.ok(block.fulfillRequirements.length > 0);

    const counterofferBlock = {
      ...block,
      mode: "counteroffer" as const,
      modeLabel: "Propone otra opcion" as const,
      counteroffer: {
        quantity: 0,
        offerType: "PLAYER" as const,
        exactStickerCodes: parseExactStickerCodes("POR 15 ARG-1"),
        note: "Cambio exacto",
      },
    };

    assert.equal(isCounterofferValid(counterofferBlock), true);
    assert.deepEqual(counterofferBlock.counteroffer.exactStickerCodes, ["POR-15", "ARG-1"]);
  });

  test("summarizes abstract and exact rules as OR options", () => {
    const settings = cloneDefaultExchangeSettings();
    const block = buildProposalBlock("ARG-7", settings, {
      "ARG-7": {
        abstract: { PLAYER: 2, BADGE: 1, TEAM_PHOTO: 0, SPECIAL: 0, ANY: 0 },
        exact: { stickerCode: "POR-15" },
      },
    });

    assert.equal(
      summarizeRule(block),
      "Puedes cambiarmelo por una de estas opciones: 1 badge, 2 jugadores o POR-15.",
    );
  });

  test("builds repeated stickers from real inventory and clamps requested quantities", () => {
    const repeateds = buildAvailableRepeatedStickers({ "ARG-7": 3, "POR-15": 1, "ARG-1": 0 });

    assert.deepEqual(
      repeateds.map((item) => [item.code, item.availableQuantity]),
      [
        ["ARG-7", 3],
        ["POR-15", 1],
      ],
    );

    const normalized = normalizeRequestedRepeateds(
      [
        { stickerCode: "ARG-7", quantity: 5 },
        { stickerCode: "POR-15", quantity: 1 },
      ],
      { "ARG-7": 3, "POR-15": 1 },
    );

    assert.deepEqual(normalized, [
      { stickerCode: "ARG-7", quantity: 3 },
      { stickerCode: "POR-15", quantity: 1 },
    ]);
    assert.equal(countRequestedRepeateds(normalized), 4);
  });
});
