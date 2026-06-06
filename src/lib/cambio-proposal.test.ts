import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
  buildAvailableRepeatedStickers,
  buildDuplicateExactStickerCodeReason,
  buildEmptyProposal,
  buildProposalBlock,
  buildRequestedStickers,
  countRequestedRepeateds,
  filterRequestedStickers,
  isCounterofferValid,
  normalizeProposalDraft,
  normalizeRequestedRepeateds,
  parseExactStickerCodes,
  resolveExactStickerInput,
  summarizeRule,
  syncProposalBlocks,
  syncRequestedRepeatedsWithExactStickerCodes,
  validateExactStickerCodesAgainstAvailableItems,
  validateUniqueCounterofferExactStickerCodes,
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
              offers: {
                PLAYER: 0,
                BADGE: 1,
                TEAM_PHOTO: 0,
                SPECIAL: 0,
                ANY: 0,
              },
              exactStickerCodes: ["POR-15"],
              note: "Solo tengo este badge.",
            },
          }
        : block,
    );

    await saveSessionProposal(session.id, {
      status: "pending",
      currentStep: 3,
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

  test("migrates old 5-step drafts to the 3-step flow", () => {
    const settings = cloneDefaultExchangeSettings();
    const migrated = normalizeProposalDraft(
      {
        ...buildEmptyProposal(),
        flowVersion: 1,
        currentStep: 3,
      },
      settings,
      {},
    );

    assert.equal(migrated.currentStep, 2);
    assert.equal(migrated.flowVersion, 3);
  });

  test("migrates old 4-step review drafts to the 3-step flow", () => {
    const settings = cloneDefaultExchangeSettings();
    const migrated = normalizeProposalDraft(
      {
        ...buildEmptyProposal(),
        flowVersion: 2,
        currentStep: 4,
      },
      settings,
      {},
    );

    assert.equal(migrated.currentStep, 3);
    assert.equal(migrated.flowVersion, 3);
  });
});

describe("cambio proposal helpers", () => {
  test("filters requested stickers by team, type and flexible code", () => {
    const stickers = buildRequestedStickers(["ARG-7", "ARG-1", "MEX-14", "FWC-0"]);

    assert.deepEqual(
      stickers.map((sticker) => sticker.code),
      ["FWC-0", "MEX-14", "ARG-1", "ARG-7"],
    );

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

  test("allows exact-only counteroffers with quantity 0", () => {
    const settings = cloneDefaultExchangeSettings();
    const [block] = syncProposalBlocks(["ARG-7"], [], settings, {});

    assert.equal(block.mode, "fulfill");
    assert.ok(block.fulfillRequirements.length > 0);

    const counterofferBlock = {
      ...block,
      mode: "counteroffer" as const,
      modeLabel: "Propone otra opcion" as const,
      counteroffer: {
        offers: { PLAYER: 0, BADGE: 0, TEAM_PHOTO: 0, SPECIAL: 0, ANY: 0 },
        exactStickerCodes: parseExactStickerCodes("POR 15 ARG-1 "),
        note: "Cambio exacto",
      },
    };

    assert.equal(isCounterofferValid(counterofferBlock), true);
    assert.deepEqual(counterofferBlock.counteroffer.exactStickerCodes, ["POR-15", "ARG-1"]);
  });

  test("normalizes flexible exact sticker formats without confusing similar codes", () => {
    assert.deepEqual(parseExactStickerCodes("mex01 MEX-1 mex1 MEX10 MEX-11 por 15"), [
      "MEX-1",
      "MEX-10",
      "MEX-11",
      "POR-15",
    ]);
  });

  test("treats unfinished compact exact codes as incomplete until finalized", () => {
    assert.deepEqual(resolveExactStickerInput("MEX0"), {
      exactStickerCodes: [],
      issue: {
        token: "MEX0",
        kind: "incomplete",
        reason: "Completa MEX0 para confirmar el cromo exacto.",
      },
    });

    assert.deepEqual(resolveExactStickerInput("MEX1"), {
      exactStickerCodes: [],
      issue: {
        token: "MEX1",
        kind: "incomplete",
        reason: "Completa MEX1 para confirmar el cromo exacto.",
      },
    });
  });

  test("accepts finalized flexible exact codes after a separator", () => {
    assert.deepEqual(resolveExactStickerInput("MEX1, "), {
      exactStickerCodes: ["MEX-1"],
      issue: null,
    });

    assert.deepEqual(resolveExactStickerInput("MEX 01 "), {
      exactStickerCodes: ["MEX-1"],
      issue: null,
    });
  });

  test("blocks empty counteroffers without quantity or exact stickers", () => {
    const settings = cloneDefaultExchangeSettings();
    const [block] = syncProposalBlocks(["ARG-7"], [], settings, {});

    const counterofferBlock = {
      ...block,
      mode: "counteroffer" as const,
      modeLabel: "Propone otra opcion" as const,
      counteroffer: {
        offers: { PLAYER: 0, BADGE: 0, TEAM_PHOTO: 0, SPECIAL: 0, ANY: 0 },
        exactStickerCodes: [],
        note: null,
      },
    };

    assert.equal(isCounterofferValid(counterofferBlock), false);
  });

  test("allows multiple quantities across offer types in counteroffers", () => {
    const settings = cloneDefaultExchangeSettings();
    const [block] = syncProposalBlocks(["ARG-7"], [], settings, {});

    const counterofferBlock = {
      ...block,
      mode: "counteroffer" as const,
      modeLabel: "Propone otra opcion" as const,
      counteroffer: {
        offers: { PLAYER: 5, BADGE: 3, TEAM_PHOTO: 0, SPECIAL: 0, ANY: 0 },
        exactStickerCodes: [],
        note: null,
      },
    };

    assert.equal(isCounterofferValid(counterofferBlock), true);
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
      "Se cambia por 1 badge o por 2 cromos de jugador o por POR-15.",
    );
  });

  test("collapses equivalent abstract types into any-type copy", () => {
    const settings = cloneDefaultExchangeSettings();
    const block = buildProposalBlock("ARG-7", settings, {
      "ARG-7": {
        abstract: { PLAYER: 1, BADGE: 1, TEAM_PHOTO: 1, SPECIAL: 1, ANY: 0 },
        exact: null,
      },
    });

    assert.equal(summarizeRule(block), "Se cambia por cualquier tipo de cromo.");
  });

  test("keeps any-type collapse when there is also an exact option", () => {
    const settings = cloneDefaultExchangeSettings();
    const block = buildProposalBlock("ARG-7", settings, {
      "ARG-7": {
        abstract: { PLAYER: 2, BADGE: 2, TEAM_PHOTO: 2, SPECIAL: 2, ANY: 0 },
        exact: { stickerCode: "POR-15" },
      },
    });

    assert.equal(summarizeRule(block), "Se cambia por 2 cromos de cualquier tipo o por POR-15.");
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

  test("syncs exact counteroffer stickers into requested repeateds with quantity 1", () => {
    const settings = cloneDefaultExchangeSettings();
    const blocks = syncProposalBlocks(["ARG-7", "MEX-1"], [], settings, {}).map((block) =>
      block.requestedStickerCode === "MEX-1"
        ? {
            ...block,
            mode: "counteroffer" as const,
            modeLabel: "Propone otra opcion" as const,
            counteroffer: {
              offers: { PLAYER: 0, BADGE: 0, TEAM_PHOTO: 0, SPECIAL: 0, ANY: 0 },
              exactStickerCodes: ["POR-15"],
              note: null,
            },
          }
        : block,
    );

    const requestedRepeateds = syncRequestedRepeatedsWithExactStickerCodes(
      [
        { stickerCode: "ARG-7", quantity: 3 },
        { stickerCode: "POR-15", quantity: 2 },
      ],
      blocks,
      { "ARG-7": 3, "POR-15": 4 },
    );

    assert.deepEqual(requestedRepeateds, [
      { stickerCode: "ARG-7", quantity: 3 },
      { stickerCode: "POR-15", quantity: 1 },
    ]);
  });

  test("drops synced exact stickers when they are no longer repeated", () => {
    const settings = cloneDefaultExchangeSettings();
    const [block] = syncProposalBlocks(["ARG-7"], [], settings, {});

    const requestedRepeateds = syncRequestedRepeatedsWithExactStickerCodes(
      [{ stickerCode: "ARG-7", quantity: 1 }],
      [
        {
          ...block,
          mode: "counteroffer" as const,
          modeLabel: "Propone otra opcion" as const,
          counteroffer: {
            offers: { PLAYER: 0, BADGE: 0, TEAM_PHOTO: 0, SPECIAL: 0, ANY: 0 },
            exactStickerCodes: ["POR-15"],
            note: null,
          },
        },
      ],
      { "ARG-7": 1, "POR-15": 0 },
    );

    assert.deepEqual(requestedRepeateds, [{ stickerCode: "ARG-7", quantity: 1 }]);
  });

  test("rejects duplicate exact sticker codes across counteroffers", () => {
    const settings = cloneDefaultExchangeSettings();
    const blocks = syncProposalBlocks(["ARG-7", "MEX-1"], [], settings, {}).map((block) => ({
      ...block,
      mode: "counteroffer" as const,
      modeLabel: "Propone otra opcion" as const,
      counteroffer: {
        offers: { PLAYER: 0, BADGE: 0, TEAM_PHOTO: 0, SPECIAL: 0, ANY: 0 },
        exactStickerCodes: ["POR-15"],
        note: null,
      },
    }));

    assert.deepEqual(validateUniqueCounterofferExactStickerCodes(blocks), {
      ok: false,
      stickerCode: "POR-15",
      reason: buildDuplicateExactStickerCodeReason("POR-15"),
    });
  });

  test("rejects exact sticker codes that are not available in repeated inventory", () => {
    assert.deepEqual(validateExactStickerCodesAgainstAvailableItems(["MEX-10"], { "MEX-1": 1 }), {
      ok: false,
      stickerCode: "MEX-10",
      reason:
        "No puedes continuar porque MEX-10 no está entre los cromos repetidos del coleccionista.",
    });
  });
});
