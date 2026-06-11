import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { WORLD_CUP_2026_TEAMS } from "../src/features/competition/seed/world-cup-2026";

const FLAG_SOURCE_BASE = "https://raw.githubusercontent.com/lipis/flag-icons/main/flags/4x3";
const FLAGS_DIR = join(process.cwd(), "public", "flags");

async function main() {
  await mkdir(FLAGS_DIR, { recursive: true });

  for (const team of WORLD_CUP_2026_TEAMS) {
    const response = await fetch(`${FLAG_SOURCE_BASE}/${team.flagKey}.svg`);

    if (!response.ok) {
      throw new Error(
        `Failed to download flag ${team.flagKey}: ${response.status} ${response.statusText}`,
      );
    }

    await writeFile(join(FLAGS_DIR, `${team.flagKey}.svg`), await response.text(), "utf8");
  }

  console.log(`Downloaded ${WORLD_CUP_2026_TEAMS.length} flag assets from lipis/flag-icons`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
