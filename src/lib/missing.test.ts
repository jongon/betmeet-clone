import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
  buildExactStickerNotRepeatedReason,
  buildMissingStickerAutoRejectionReason,
  clearMissingInventoryForAdmin,
  isStickerMissingForAdmin,
  markStickersAsCompletedForAdmin,
  toMissingRecord,
  validateExactStickersAgainstRepeateds,
  validateMissingStickersForProposal,
} from "@/lib/missing";
import { getMissingInventory, replaceMissingInventory } from "@/lib/missing-store";
import { getInventory, saveGroupRepeateds } from "@/lib/repeateds-store";

const OWNER_EMAIL = "admin@example.com";

let tmpDir = "";
let missingFile = "";
let repeatedsFile = "";
let repeatedsSeedFile = "";

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), "missing-store-"));
  missingFile = path.join(tmpDir, "missing.json");
  repeatedsFile = path.join(tmpDir, "repeateds.json");
  repeatedsSeedFile = path.join(tmpDir, "repeateds.seed.json");

  process.env.MISSINGS_FILE = missingFile;
  process.env.REPEATEDS_FILE = repeatedsFile;
  process.env.REPEATEDS_SEED_FILE = repeatedsSeedFile;

  await writeFile(repeatedsSeedFile, "[]\n", "utf8");
});

afterEach(() => {
  delete process.env.MISSINGS_FILE;
  delete process.env.REPEATEDS_FILE;
  delete process.env.REPEATEDS_SEED_FILE;
});

describe("missing-store", () => {
  test("auto-seeds an empty inventory on first access", async () => {
    const inventory = await getMissingInventory(OWNER_EMAIL);
    const raw = await readFile(missingFile, "utf8");

    assert.equal(inventory.ownerEmail, OWNER_EMAIL);
    assert.deepEqual(inventory.items, {});
    assert.match(raw, /admin@example.com/);
  });

  test("persists sparse items only", async () => {
    await replaceMissingInventory(OWNER_EMAIL, { "ARG-1": true, "FWC-0": true });

    const inventory = await getMissingInventory(OWNER_EMAIL);
    assert.deepEqual(inventory.items, { "ARG-1": true, "FWC-0": true });
  });

  test("rejects sticker codes outside the catalog", async () => {
    await assert.rejects(() => replaceMissingInventory(OWNER_EMAIL, { "BAD-999": true }));
    assert.equal(await isStickerMissingForAdmin(OWNER_EMAIL, "BAD-999"), false);
  });
});

describe("missing contracts", () => {
  test("isStickerMissingForAdmin reads from the store on each call", async () => {
    assert.equal(await isStickerMissingForAdmin(OWNER_EMAIL, "ARG-1"), false);

    await replaceMissingInventory(OWNER_EMAIL, { "ARG-1": true });

    assert.equal(await isStickerMissingForAdmin(OWNER_EMAIL, "ARG-1"), true);
  });

  test("markStickersAsCompletedForAdmin removes only requested missing stickers", async () => {
    await replaceMissingInventory(OWNER_EMAIL, toMissingRecord(["ARG-1", "ARG-2", "FWC-0"]));
    const before = await getMissingInventory(OWNER_EMAIL);

    const after = await markStickersAsCompletedForAdmin(OWNER_EMAIL, ["ARG-2", "ARG-3"]);

    assert.deepEqual(after.items, { "ARG-1": true, "FWC-0": true });
    assert.notEqual(after.updatedAt, before.updatedAt);
  });

  test("markStickersAsCompletedForAdmin is idempotent for empty input", async () => {
    const before = await getMissingInventory(OWNER_EMAIL);
    const after = await markStickersAsCompletedForAdmin(OWNER_EMAIL, []);

    assert.deepEqual(after.items, before.items);
    assert.equal(after.updatedAt, before.updatedAt);
  });

  test("clearMissingInventoryForAdmin empties the inventory", async () => {
    await replaceMissingInventory(OWNER_EMAIL, toMissingRecord(["ARG-1", "ARG-2"]));

    const inventory = await clearMissingInventoryForAdmin(OWNER_EMAIL);

    assert.deepEqual(inventory.items, {});
  });
});

describe("missing proposal validation", () => {
  test("returns pending when every requested sticker is still missing", async () => {
    await replaceMissingInventory(OWNER_EMAIL, toMissingRecord(["ARG-1", "ARG-2"]));

    const result = await validateMissingStickersForProposal(OWNER_EMAIL, ["ARG-2"]);

    assert.deepEqual(result, { status: "pending" });
  });

  test("returns automatic rejection when a requested sticker is no longer missing", async () => {
    await replaceMissingInventory(OWNER_EMAIL, toMissingRecord(["ARG-1"]));

    const result = await validateMissingStickersForProposal(OWNER_EMAIL, ["ARG-1", "ARG-2"]);

    assert.deepEqual(result, {
      status: "rechazada automaticamente",
      stickerCode: "ARG-2",
      reason: buildMissingStickerAutoRejectionReason("ARG-2"),
    });
  });

  test("returns pending when every exact optional sticker exists in repeated inventory", () => {
    const repeatedItems = { "POR-15": 2, "ARG-7": 1 };

    const result = validateExactStickersAgainstRepeateds(["POR-15", "ARG-7"], repeatedItems);

    assert.deepEqual(result, { status: "pending" });
  });

  test("returns automatic rejection when one exact optional sticker is not in repeated inventory", () => {
    const repeatedItems = { "ARG-7": 1 };

    const result = validateExactStickersAgainstRepeateds(["POR-15", "ARG-7"], repeatedItems);

    assert.deepEqual(result, {
      status: "rechazada automaticamente",
      stickerCode: "POR-15",
      reason: buildExactStickerNotRepeatedReason("POR-15"),
    });
  });

  test("returns automatic rejection when exact optional sticker has zero quantity in repeated inventory", () => {
    const repeatedItems = { "POR-15": 0 };

    const result = validateExactStickersAgainstRepeateds(["POR-15"], repeatedItems);

    assert.deepEqual(result, {
      status: "rechazada automaticamente",
      stickerCode: "POR-15",
      reason: buildExactStickerNotRepeatedReason("POR-15"),
    });
  });

  test("returns pending for empty exact sticker list", () => {
    const repeatedItems = {};

    const result = validateExactStickersAgainstRepeateds([], repeatedItems);

    assert.deepEqual(result, { status: "pending" });
  });
});

describe("missing and repeated inventories stay independent", () => {
  test("a sticker can be missing and repeated at the same time", async () => {
    await replaceMissingInventory(OWNER_EMAIL, toMissingRecord(["ARG-14"]));
    await saveGroupRepeateds(OWNER_EMAIL, "ARG", { "ARG-14": 2 }, new Set(["ARG-14"]));

    const missingInventory = await getMissingInventory(OWNER_EMAIL);
    const repeatedInventory = await getInventory(OWNER_EMAIL);

    assert.equal(missingInventory.items["ARG-14"], true);
    assert.equal(repeatedInventory.items["ARG-14"], 2);
  });
});
