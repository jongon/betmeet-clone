import "dotenv/config";
import { seedWorldCup2026 } from "../src/features/competition/services/upsert-competition-data";

async function main() {
  await seedWorldCup2026();
  console.log("Seeded World Cup 2026 competition data");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
