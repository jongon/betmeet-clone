import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { WORLD_CUP_2026_TEAMS } from "../world-cup-2026";

describe("World Cup seed flags", () => {
  it("has a local SVG for every seeded team", () => {
    for (const team of WORLD_CUP_2026_TEAMS) {
      expect(existsSync(join(process.cwd(), "public", "flags", `${team.flagKey}.svg`))).toBe(true);
    }
  });
});
