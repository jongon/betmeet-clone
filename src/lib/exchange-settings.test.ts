import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";
import { resolveStickerOverride } from "@/lib/exchange-resolver";
import { cloneDefaultExchangeSettings, normalizeStickerOverride } from "@/lib/exchange-settings";
import {
  getExchangeSettings,
  resetStickerOverride,
  saveStickerOverride,
} from "@/lib/exchange-settings-store";

const OWNER_EMAIL = "admin@example.com";

let tmpDir = "";
let exchangeSettingsFile = "";
let exchangeSettingsSeedFile = "";
let missingFile = "";

beforeEach(async () => {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), "exchange-settings-"));
  exchangeSettingsFile = path.join(tmpDir, "exchange-settings.json");
  exchangeSettingsSeedFile = path.join(tmpDir, "exchange-settings.seed.json");
  missingFile = path.join(tmpDir, "missing.json");

  process.env.EXCHANGE_SETTINGS_FILE = exchangeSettingsFile;
  process.env.EXCHANGE_SETTINGS_SEED_FILE = exchangeSettingsSeedFile;
  process.env.MISSINGS_FILE = missingFile;

  await writeFile(exchangeSettingsSeedFile, "[]\n", "utf8");
});

afterEach(() => {
  delete process.env.EXCHANGE_SETTINGS_FILE;
  delete process.env.EXCHANGE_SETTINGS_SEED_FILE;
  delete process.env.MISSINGS_FILE;
});

describe("exchange settings compatibility", () => {
  test("reads legacy overrides as abstract-only overrides", async () => {
    await writeFile(
      exchangeSettingsFile,
      JSON.stringify([
        {
          ownerEmail: OWNER_EMAIL,
          updatedAt: "2026-06-04T00:00:00.000Z",
          global: cloneDefaultExchangeSettings(),
          overrides: {
            "ARG-14": { PLAYER: 2, BADGE: 1, TEAM_PHOTO: 1, SPECIAL: 1, ANY: 2 },
          },
        },
      ]),
      "utf8",
    );

    const settings = await getExchangeSettings(OWNER_EMAIL);
    assert.deepEqual(settings.overrides["ARG-14"], {
      abstract: { PLAYER: 2, BADGE: 1, TEAM_PHOTO: 1, SPECIAL: 1, ANY: 2 },
      exact: null,
    });
  });

  test("writes overrides in the new format", async () => {
    await saveStickerOverride(OWNER_EMAIL, "ARG-14", {
      abstract: { PLAYER: 2, BADGE: 0, TEAM_PHOTO: 0, SPECIAL: 0, ANY: 1 },
      exact: { stickerCode: "POR-15" },
    });

    const raw = JSON.parse(await readFile(exchangeSettingsFile, "utf8"));
    assert.deepEqual(raw[0].overrides["ARG-14"], {
      abstract: { PLAYER: 2, BADGE: 0, TEAM_PHOTO: 0, SPECIAL: 0, ANY: 1 },
      exact: { stickerCode: "POR-15" },
    });
  });

  test("resets an override when toggling back to global", async () => {
    await saveStickerOverride(OWNER_EMAIL, "ARG-14", {
      abstract: { PLAYER: 2, BADGE: 0, TEAM_PHOTO: 0, SPECIAL: 0, ANY: 1 },
      exact: { stickerCode: "POR-15" },
    });

    await resetStickerOverride(OWNER_EMAIL, "ARG-14");

    const settings = await getExchangeSettings(OWNER_EMAIL);
    assert.equal(settings.overrides["ARG-14"], undefined);
  });
});

describe("override normalization and resolver", () => {
  test("treats a zeroed abstract override as disabled", () => {
    assert.equal(
      normalizeStickerOverride({
        abstract: { PLAYER: 0, BADGE: 0, TEAM_PHOTO: 0, SPECIAL: 0, ANY: 0 },
        exact: null,
      }),
      null,
    );
  });

  test("returns abstract before exact", () => {
    const resolved = resolveStickerOverride({
      abstract: { PLAYER: 2, BADGE: 0, TEAM_PHOTO: 0, SPECIAL: 0, ANY: 1 },
      exact: { stickerCode: "POR-15" },
    });

    assert.equal(resolved.source, "override");
    assert.deepEqual(
      resolved.components.map((component) => component.kind),
      ["abstract", "exact"],
    );
  });

  test("returns global when the override has no active components", () => {
    const resolved = resolveStickerOverride(null);
    assert.deepEqual(resolved, { source: "global", components: [] });
  });
});
