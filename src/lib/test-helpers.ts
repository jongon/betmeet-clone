import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { prisma, sanitizeConnectionString } from "@/lib/prisma";

export async function cleanDatabase(): Promise<void> {
  await prisma.proposalBlock.deleteMany();
  await prisma.requestedRepeated.deleteMany();
  await prisma.sessionProposal.deleteMany();
  await prisma.session.deleteMany();
  await prisma.qrToken.deleteMany();
  await prisma.repeatedInventory.deleteMany();
  await prisma.missingInventory.deleteMany();
  await prisma.exchangeSettings.deleteMany();
}

describe("sanitizeConnectionString", () => {
  test("leaves valid postgres URLs without password special characters intact", () => {
    const original = "postgresql://postgres:Linkjoew666@db.supabase.co:5432/postgres";
    assert.equal(sanitizeConnectionString(original), original);
  });

  test("escapes unescaped # in password", () => {
    const original = "postgresql://postgres:Linkjoew666#@db.supabase.co:5432/postgres";
    const expected = "postgresql://postgres:Linkjoew666%23@db.supabase.co:5432/postgres";
    assert.equal(sanitizeConnectionString(original), expected);
  });

  test("does not double-encode already escaped %23", () => {
    const original = "postgresql://postgres:Linkjoew666%23@db.supabase.co:5432/postgres";
    assert.equal(sanitizeConnectionString(original), original);
  });

  test("escapes other special characters like @ in password", () => {
    const original = "postgresql://postgres:p@ss#word@db.supabase.co:5432/postgres";
    const expected = "postgresql://postgres:p%40ss%23word@db.supabase.co:5432/postgres";
    assert.equal(sanitizeConnectionString(original), expected);
  });

  test("leaves non-postgres connection strings alone", () => {
    const original = "sqlite://file.db";
    assert.equal(sanitizeConnectionString(original), original);
  });
});
