import { existsSync } from "node:fs";
import { join } from "node:path";
import { WORLD_CUP_2026_TEAMS } from "../src/features/competition/seed/world-cup-2026";

const missing = WORLD_CUP_2026_TEAMS.filter(
  (team) => !existsSync(join(process.cwd(), "public", "flags", `${team.flagKey}.svg`)),
);

if (missing.length > 0) {
  throw new Error(`Missing flag assets: ${missing.map((team) => team.flagKey).join(", ")}`);
}

console.log(`Validated ${WORLD_CUP_2026_TEAMS.length} flag assets`);
