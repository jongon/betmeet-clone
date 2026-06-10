// Seed is handled via scripts/seed-avatars.ts and scripts/seed-admin.ts
// Run: pnpm tsx scripts/seed-avatars.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { sanitizeConnectionString } from "../src/lib/prisma";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");
const sanitized = sanitizeConnectionString(connectionString);
const adapter = new PrismaPg({ connectionString: sanitized });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("No default seed data. Use scripts/seed-avatars.ts to seed avatars.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
