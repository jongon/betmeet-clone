import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { cloneDefaultExchangeSettings } from "../src/lib/exchange-settings";
import { sanitizeConnectionString } from "../src/lib/prisma";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");
const sanitized = sanitizeConnectionString(connectionString);
const adapter = new PrismaPg({ connectionString: sanitized });
const prisma = new PrismaClient({ adapter });

async function main() {
  const seedEmail = process.env.SEED_OWNER_EMAIL ?? "admin@example.com";

  const existing = await prisma.exchangeSettings.findUnique({
    where: { ownerEmail: seedEmail },
  });

  if (!existing) {
    await prisma.exchangeSettings.create({
      data: {
        ownerEmail: seedEmail,
        global: cloneDefaultExchangeSettings(),
        overrides: {},
        updatedAt: new Date(),
      },
    });

    console.log(`Seeded exchange settings for ${seedEmail}`);
  } else {
    console.log(`Exchange settings already exist for ${seedEmail}, skipping seed.`);
  }
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
