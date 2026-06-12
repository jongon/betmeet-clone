/**
 * Seed default avatar assets into the database.
 * Usage: pnpm tsx scripts/seed-avatars.ts
 *
 * Reads avatar files from a local directory and uploads them to Supabase Storage,
 * then inserts records into the avatar_assets table via Prisma.
 */

import "dotenv/config";

import * as fs from "node:fs";
import * as path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "../src/generated/prisma/client";

const AVATARS_DIR = path.join(process.cwd(), "scripts/avatars");
const BUCKET = "avatars";

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

type StorageClient = ReturnType<typeof createClient>["storage"];

/** Create the avatars Storage bucket (public, no size/MIME limits) if it does not already exist. */
async function ensureBucket(storage: StorageClient) {
  const { data: existing } = await storage.getBucket(BUCKET);
  if (existing) return;

  const { error } = await storage.createBucket(BUCKET, {
    public: true,
  });

  // Tolerate a race where the bucket was created between getBucket and createBucket.
  if (error && !/already exists/i.test(error.message)) {
    throw new Error(`Failed to create bucket "${BUCKET}": ${error.message}`);
  }

  console.log(`Created storage bucket "${BUCKET}".`);
}

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

  await ensureBucket(supabase.storage);

  if (!fs.existsSync(AVATARS_DIR)) {
    console.warn(`Avatars directory not found: ${AVATARS_DIR}`);
    console.warn("Nothing to seed. Add image files to scripts/avatars/ to seed default avatars.");
    await prisma.$disconnect();
    return;
  }

  const files = fs
    .readdirSync(AVATARS_DIR)
    .filter((f) => /\.(png|jpg|jpeg|webp|svg)$/i.test(f))
    .sort();

  if (files.length === 0) {
    console.warn("No image files found in scripts/avatars/; nothing to seed.");
    await prisma.$disconnect();
    return;
  }

  console.log(`Seeding ${files.length} avatars…`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const name = path.basename(file, path.extname(file));
    const storagePath = `defaults/${file}`;
    const filePath = path.join(AVATARS_DIR, file);
    const buffer = fs.readFileSync(filePath);
    const mimeType = MIME_BY_EXT[path.extname(file).toLowerCase()] ?? "application/octet-stream";

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: mimeType, upsert: true });

    if (uploadError) {
      console.error(`Failed to upload ${file}:`, uploadError.message);
      continue;
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    const existing = await prisma.avatarAsset.findFirst({ where: { name } });
    if (existing) {
      await prisma.avatarAsset.update({
        where: { id: existing.id },
        data: { storagePath, storageUrl: urlData.publicUrl, displayOrder: i },
      });
    } else {
      await prisma.avatarAsset.create({
        data: { name, storagePath, storageUrl: urlData.publicUrl, displayOrder: i },
      });
    }

    console.log(`  ✓ ${name}`);
  }

  console.log("Done.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
