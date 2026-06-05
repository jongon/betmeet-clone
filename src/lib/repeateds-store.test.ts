import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { getInventory, saveGroupRepeateds } from "@/lib/repeateds-store";

let tmpDir = "";
let repeatedsFile = "";
let repeatedsSeedFile = "";

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), "repeateds-store-"));
  repeatedsFile = path.join(tmpDir, "repeateds.json");
  repeatedsSeedFile = path.join(tmpDir, "repeateds.seed.json");

  process.env.REPEATEDS_FILE = repeatedsFile;
  process.env.REPEATEDS_SEED_FILE = repeatedsSeedFile;

  await writeFile(repeatedsSeedFile, "[]\n", "utf8");
});

afterEach(() => {
  delete process.env.REPEATEDS_FILE;
  delete process.env.REPEATEDS_SEED_FILE;
});

describe("repeateds store", () => {
  test("persists and returns the saved inventory for one group", async () => {
    const saved = await saveGroupRepeateds(
      "owner@example.com",
      "ARG",
      { "ARG-4": 2, "ARG-5": 1, "MEX-1": 9 },
      new Set(["ARG-4", "ARG-5"]),
    );

    assert.deepEqual(saved.items, { "ARG-4": 2, "ARG-5": 1 });

    const inventory = await getInventory("owner@example.com");
    assert.deepEqual(inventory.items, { "ARG-4": 2, "ARG-5": 1 });
  });

  test("replaces only the selected group and preserves other groups", async () => {
    await saveGroupRepeateds("owner@example.com", "ARG", { "ARG-4": 2 }, new Set(["ARG-4"]));

    const saved = await saveGroupRepeateds(
      "owner@example.com",
      "MEX",
      { "MEX-1": 3 },
      new Set(["MEX-1"]),
    );

    assert.deepEqual(saved.items, { "ARG-4": 2, "MEX-1": 3 });

    const inventory = await getInventory("owner@example.com");
    assert.deepEqual(inventory.items, { "ARG-4": 2, "MEX-1": 3 });
  });
});
