import "dotenv/config";
import { seedMatchesFromFootballData } from "../src/features/competition/services/seed-matches";
import { seedCompetitionStructure } from "../src/features/competition/services/upsert-competition-data";

async function main() {
  await seedCompetitionStructure();
  console.log("Seeded World Cup 2026 competition structure (competition, phases, teams)");
  await seedMatchesFromFootballData();
  console.log("Seeded World Cup 2026 pending matches from football-data.org");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
