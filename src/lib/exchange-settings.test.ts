import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { resolveStickerOverride } from "@/lib/exchange-resolver";
import {
  AdminExchangeRuleSchema,
  buildAnyBelowSpecificRuleReason,
  cloneDefaultExchangeSettings,
  formatExchangeRuleOptions,
  normalizeStickerOverride,
} from "@/lib/exchange-settings";
import {
  getExchangeSettings,
  resetStickerOverride,
  saveStickerOverride,
} from "@/lib/exchange-settings-store";
import { prisma } from "@/lib/prisma";
import { cleanDatabase } from "@/lib/test-helpers";

const OWNER_EMAIL = "admin@example.com";

beforeEach(async () => {
  await cleanDatabase();
});

afterEach(() => {});

describe("exchange settings compatibility", () => {
  test("reads legacy overrides as abstract-only overrides", async () => {
    await prisma.exchangeSettings.create({
      data: {
        ownerEmail: OWNER_EMAIL,
        updatedAt: new Date("2026-06-04T00:00:00.000Z"),
        global: cloneDefaultExchangeSettings(),
        overrides: {
          "ARG-14": { PLAYER: 2, BADGE: 1, TEAM_PHOTO: 1, SPECIAL: 1, ANY: 2 },
        },
      },
    });

    const settings = await getExchangeSettings(OWNER_EMAIL);
    assert.deepEqual(settings.overrides["ARG-14"], {
      abstract: { PLAYER: 2, BADGE: 1, TEAM_PHOTO: 1, SPECIAL: 1, ANY: 2 },
      exact: null,
    });
  });

  test("writes overrides in the new format", async () => {
    await saveStickerOverride(OWNER_EMAIL, "ARG-14", {
      abstract: { PLAYER: 2, BADGE: 0, TEAM_PHOTO: 0, SPECIAL: 0, ANY: 2 },
      exact: { stickerCode: "POR-15" },
    });

    const settings = await getExchangeSettings(OWNER_EMAIL);
    assert.deepEqual(settings.overrides["ARG-14"], {
      abstract: { PLAYER: 2, BADGE: 0, TEAM_PHOTO: 0, SPECIAL: 0, ANY: 2 },
      exact: { stickerCode: "POR-15" },
    });
  });

  test("resets an override when toggling back to global", async () => {
    await saveStickerOverride(OWNER_EMAIL, "ARG-14", {
      abstract: { PLAYER: 2, BADGE: 0, TEAM_PHOTO: 0, SPECIAL: 0, ANY: 2 },
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
      abstract: { PLAYER: 2, BADGE: 0, TEAM_PHOTO: 0, SPECIAL: 0, ANY: 2 },
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

  test("formats abstract rules as OR options", () => {
    const options = formatExchangeRuleOptions({
      PLAYER: 2,
      BADGE: 1,
      TEAM_PHOTO: 1,
      SPECIAL: 0,
      ANY: 2,
    });

    assert.deepEqual(options, [
      "1 badge",
      "1 foto de equipo",
      "2 jugadores",
      "2 cromos cualquiera",
    ]);
  });

  test("rejects abstract rules when ANY is below the max specific quantity", () => {
    const parsed = AdminExchangeRuleSchema.safeParse({
      PLAYER: 3,
      BADGE: 1,
      TEAM_PHOTO: 0,
      SPECIAL: 0,
      ANY: 2,
    });

    assert.equal(parsed.success, false);
    assert.equal(parsed.error?.issues[0]?.message, buildAnyBelowSpecificRuleReason(3));
  });
});
