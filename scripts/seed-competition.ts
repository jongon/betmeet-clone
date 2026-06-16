import "dotenv/config";
import { seedCompetitionStructure } from "../src/features/competition/services/upsert-competition-data";

async function main() {
  await seedCompetitionStructure();
  console.log("Seeded World Cup 2026 competition structure (competition, phases, teams)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
