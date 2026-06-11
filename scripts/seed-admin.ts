/**
 * Promote a user to ADMIN verification status.
 * Usage: pnpm tsx scripts/seed-admin.ts <email>
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: pnpm tsx scripts/seed-admin.ts <email>");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const databaseUrl = process.env.DATABASE_URL;

  if (!supabaseUrl || !serviceRoleKey || !databaseUrl) {
    throw new Error(
      "Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL",
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;

  const user = users.users.find((u) => u.email === email);
  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  const defaultAvatar = await prisma.avatarAsset.findFirst({
    orderBy: { displayOrder: "asc" },
    select: { storageUrl: true },
  });

  await prisma.profile.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      avatarUrl: defaultAvatar?.storageUrl ?? "",
      avatarSource: "DEFAULT_SET",
      verificationStatus: "ADMIN",
    },
    update: { verificationStatus: "ADMIN" },
  });

  console.log(`✓ ${email} promoted to ADMIN`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
