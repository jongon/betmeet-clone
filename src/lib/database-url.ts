const SUPPORTED_PROTOCOLS = new Set(["postgres:", "postgresql:"]);

function stripWrappingQuotes(value: string) {
  if (value.length >= 2) {
    const first = value[0];
    const last = value.at(-1);
    if ((first === '"' || first === "'") && first === last) {
      return value.slice(1, -1);
    }
  }

  return value;
}

export function readDatabaseUrl() {
  const rawValue =
    process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.POSTGRES_PRISMA_URL;
  if (!rawValue) {
    throw new Error("DATABASE_URL is required");
  }

  const connectionString = stripWrappingQuotes(rawValue.trim());

  let parsed: URL;
  try {
    parsed = new URL(connectionString);
  } catch {
    throw new Error(
      "DATABASE_URL is not a valid URL. In Vercel, paste it without wrapping quotes or line breaks.",
    );
  }

  if (!SUPPORTED_PROTOCOLS.has(parsed.protocol)) {
    throw new Error(
      `Unsupported DATABASE_URL protocol "${parsed.protocol}". Use a postgres/postgresql URL with @prisma/adapter-pg.`,
    );
  }

  return connectionString;
}
