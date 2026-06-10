import "dotenv/config";
import { seedWorldCup2026 } from "../src/features/competition/services/upsert-competition-data";

await seedWorldCup2026();
console.log("Seeded World Cup 2026 competition data");
