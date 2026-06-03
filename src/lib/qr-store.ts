import { randomBytes } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { TOKEN_PREFIX, type Token, TokensArraySchema } from "@/lib/qr";

const DATA_DIR = path.join(process.cwd(), "data");
const RUNTIME_FILE = path.join(DATA_DIR, "qr-tokens.json");
const SEED_FILE = path.join(DATA_DIR, "qr-tokens.seed.json");

async function ensureRuntimeFile(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(RUNTIME_FILE, "utf8");
  } catch {
    await copyFile(SEED_FILE, RUNTIME_FILE);
  }
}

async function readTokens(): Promise<Token[]> {
  await ensureRuntimeFile();
  const raw = await readFile(RUNTIME_FILE, "utf8");
  const parsed: unknown = JSON.parse(raw);
  return TokensArraySchema.parse(parsed);
}

async function writeTokens(tokens: Token[]): Promise<void> {
  await ensureRuntimeFile();
  await writeFile(RUNTIME_FILE, JSON.stringify(tokens, null, 2), "utf8");
}

function generateRawToken(): string {
  return `${TOKEN_PREFIX}${randomBytes(16).toString("hex")}`;
}

function generateUniqueToken(tokens: ReadonlyArray<Token>): string {
  const existing = new Set(tokens.map((t) => t.token));
  let candidate = generateRawToken();
  while (existing.has(candidate)) {
    candidate = generateRawToken();
  }
  return candidate;
}

export async function getActiveToken(ownerEmail: string): Promise<Token | null> {
  const tokens = await readTokens();
  return tokens.find((t) => t.ownerEmail === ownerEmail && t.revokedAt === null) ?? null;
}

export async function getToken(token: string): Promise<Token | null> {
  const tokens = await readTokens();
  return tokens.find((t) => t.token === token) ?? null;
}

export async function generateToken(ownerEmail: string): Promise<Token> {
  const tokens = await readTokens();
  const now = new Date().toISOString();
  const next: Token[] = tokens.map((t) =>
    t.ownerEmail === ownerEmail && t.revokedAt === null ? { ...t, revokedAt: now } : t,
  );
  const created: Token = {
    token: generateUniqueToken(tokens),
    ownerEmail,
    createdAt: now,
    revokedAt: null,
  };
  await writeTokens([...next, created]);
  return created;
}

export async function revokeToken(token: string): Promise<void> {
  const tokens = await readTokens();
  const target = tokens.find((t) => t.token === token);
  if (!target || target.revokedAt !== null) return;
  const now = new Date().toISOString();
  const next = tokens.map((t) => (t.token === token ? { ...t, revokedAt: now } : t));
  await writeTokens(next);
}
