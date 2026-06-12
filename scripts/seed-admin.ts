/**
 * Promote a user to ADMIN verification status.
 * Usage: pnpm tsx scripts/seed-admin.ts [email]
 * Falls back to ADMIN_EMAIL from .env when no argument is provided.
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import { NicknameBaseSchema } from "../src/features/profile/schemas";
import { PrismaClient } from "../src/generated/prisma/client";

/** Derive a schema-valid nickname base (3–20 chars, [a-zA-Z0-9_-]) from an email. */
function deriveNicknameBase(email: string): string {
  const local = (email.split("@")[0] ?? "").replace(/[^a-zA-Z0-9_-]/g, "");
  const base = local.length >= 3 ? local : `Admin${local}`;
  return base.slice(0, 20);
}

/** Find a free 0000–9999 discriminator for the given base (respects @@unique). */
async function assignFreeDiscriminator(
  prisma: PrismaClient,
  nicknameBase: string,
): Promise<string | null> {
  for (let i = 0; i < 20; i++) {
    const discriminator = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    const existing = await prisma.profile.findUnique({
      where: {
        nicknameBase_nicknameDiscriminator: { nicknameBase, nicknameDiscriminator: discriminator },
      },
      select: { id: true },
    });
    if (!existing) return discriminator;
  }
  return null;
}

async function main() {
  const email = process.argv[2] ?? process.env.ADMIN_EMAIL;
  if (!email) {
    console.error("Usage: pnpm tsx scripts/seed-admin.ts [email] or set ADMIN_EMAIL in .env");
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

  const existing = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { nicknameBase: true },
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

  // Ensure the admin has a nickname. Without it the onboarding gate in
  // src/proxy.ts redirects every authenticated request (including /admin) to
  // /onboarding/profile. Only assign when missing, so an admin who already
  // completed onboarding keeps their chosen nickname. Override with ADMIN_NICKNAME.
  if (!existing?.nicknameBase) {
    const envNick = process.env.ADMIN_NICKNAME?.trim();
    const parsed = envNick ? NicknameBaseSchema.safeParse(envNick) : null;
    if (envNick && parsed && !parsed.success) {
      console.warn(
        `⚠ ADMIN_NICKNAME inválido ("${envNick}"): ${parsed.error.issues[0]?.message}. Derivando del email.`,
      );
    }
    const base = parsed?.success ? parsed.data : deriveNicknameBase(email);
    const discriminator = await assignFreeDiscriminator(prisma, base);
    if (discriminator) {
      await prisma.profile.update({
        where: { id: user.id },
        data: { nicknameBase: base, nicknameDiscriminator: discriminator },
      });
      console.log(`✓ nickname asignado: ${base}#${discriminator}`);
    } else {
      console.warn(
        `⚠ no se pudo asignar discriminador para "${base}"; el admin elegirá nickname en onboarding`,
      );
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
