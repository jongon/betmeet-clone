/**
 * Seed default avatar assets into the database.
 * Usage: pnpm tsx scripts/seed-avatars.ts
 *
 * Reads avatar files from a local directory and uploads them to Supabase Storage,
 * then inserts records into the avatar_assets table via Prisma.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "../src/generated/prisma/client";

const AVATARS_DIR = path.join(process.cwd(), "scripts/avatars");
const BUCKET = "avatars";

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const databaseUrl = process.env.DATABASE_URL;

  if (!supabaseUrl || !serviceRoleKey || !databaseUrl) {
    throw new Error(
      "Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL",
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });

  if (!fs.existsSync(AVATARS_DIR)) {
    console.error(`Avatars directory not found: ${AVATARS_DIR}`);
    console.error("Create scripts/avatars/ and add PNG/JPEG avatar files there.");
    process.exit(1);
  }

  const files = fs
    .readdirSync(AVATARS_DIR)
    .filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f))
    .sort();

  if (files.length === 0) {
    console.error("No image files found in scripts/avatars/");
    process.exit(1);
  }

  console.log(`Seeding ${files.length} avatars…`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const name = path.basename(file, path.extname(file));
    const storagePath = `defaults/${file}`;
    const filePath = path.join(AVATARS_DIR, file);
    const buffer = fs.readFileSync(filePath);
    const mimeType = file.endsWith(".png") ? "image/png" : "image/jpeg";

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: mimeType, upsert: true });

    if (uploadError) {
      console.error(`Failed to upload ${file}:`, uploadError.message);
      continue;
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    await prisma.avatarAsset.upsert({
      where: { id: name },
      create: {
        id: name,
        name,
        storagePath,
        storageUrl: urlData.publicUrl,
        displayOrder: i,
      },
      update: {
        storageUrl: urlData.publicUrl,
        displayOrder: i,
      },
    });

    console.log(`  ✓ ${name}`);
  }

  console.log("Done.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
