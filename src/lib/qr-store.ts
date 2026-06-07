import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { TOKEN_PREFIX, type Token } from "@/lib/qr";

function generateRawToken(): string {
  return `${TOKEN_PREFIX}${randomBytes(16).toString("hex")}`;
}

async function generateUniqueToken(): Promise<string> {
  let candidate = generateRawToken();
  while (await prisma.qrToken.findUnique({ where: { token: candidate } })) {
    candidate = generateRawToken();
  }
  return candidate;
}

function toToken(row: {
  token: string;
  ownerEmail: string;
  createdAt: Date;
  revokedAt: Date | null;
}): Token {
  return {
    token: row.token,
    ownerEmail: row.ownerEmail,
    createdAt: row.createdAt.toISOString(),
    revokedAt: row.revokedAt?.toISOString() ?? null,
  };
}

export async function getActiveToken(ownerEmail: string): Promise<Token | null> {
  const row = await prisma.qrToken.findFirst({
    where: { ownerEmail, revokedAt: null },
  });
  return row ? toToken(row) : null;
}

export async function getToken(token: string): Promise<Token | null> {
  const row = await prisma.qrToken.findUnique({
    where: { token },
  });
  return row ? toToken(row) : null;
}

export async function generateToken(ownerEmail: string): Promise<Token> {
  const now = new Date();

  await prisma.qrToken.updateMany({
    where: { ownerEmail, revokedAt: null },
    data: { revokedAt: now },
  });

  const created = await prisma.qrToken.create({
    data: {
      token: await generateUniqueToken(),
      ownerEmail,
      createdAt: now,
      revokedAt: null,
    },
  });

  return toToken(created);
}

export async function revokeToken(token: string): Promise<void> {
  const existing = await prisma.qrToken.findUnique({ where: { token } });
  if (!existing || existing.revokedAt !== null) return;

  await prisma.qrToken.update({
    where: { token },
    data: { revokedAt: new Date().toISOString() },
  });
}
