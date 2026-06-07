import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import {
  decrementRepeatedInventory,
  getInventory,
  saveGroupRepeateds,
} from "@/lib/repeateds-store";
import { cleanDatabase } from "@/lib/test-helpers";

beforeEach(async () => {
  await cleanDatabase();
});

afterEach(() => {});

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

  test("decrements repeated inventory across multiple groups", async () => {
    await saveGroupRepeateds("owner@example.com", "ARG", { "ARG-4": 2 }, new Set(["ARG-4"]));
    await saveGroupRepeateds("owner@example.com", "POR", { "POR-15": 3 }, new Set(["POR-15"]));

    const result = await decrementRepeatedInventory("owner@example.com", [
      { stickerCode: "ARG-4", quantity: 1 },
      { stickerCode: "POR-15", quantity: 2 },
    ]);

    assert.equal(result.ok, true);
    const inventory = await getInventory("owner@example.com");
    assert.deepEqual(inventory.items, { "ARG-4": 1, "POR-15": 1 });
  });

  test("does not persist changes when repeated stock is insufficient", async () => {
    await saveGroupRepeateds("owner@example.com", "ARG", { "ARG-4": 1 }, new Set(["ARG-4"]));

    const result = await decrementRepeatedInventory("owner@example.com", [
      { stickerCode: "ARG-4", quantity: 2 },
    ]);

    assert.deepEqual(result, { ok: false, stickerCode: "ARG-4" });
    const inventory = await getInventory("owner@example.com");
    assert.deepEqual(inventory.items, { "ARG-4": 1 });
  });
});
