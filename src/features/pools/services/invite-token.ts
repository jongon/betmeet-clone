import { randomInt } from "node:crypto";

// Unambiguous alphabet — no 0/O/1/I/L to keep codes easy to read and share (Q1).
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const TOKEN_LENGTH = 8;

/** Generates a random invite token used as both code and link (BR-3.4). */
export function generateInviteToken(length = TOKEN_LENGTH): string {
  let token = "";
  for (let i = 0; i < length; i++) {
    token += ALPHABET[randomInt(ALPHABET.length)];
  }
  return token;
}

/**
 * Generates a token guaranteed unique against `exists`. Retries a bounded number
 * of times; the DB unique constraint on invite_token is the final safety net.
 */
export async function generateUniqueInviteToken(
  exists: (token: string) => Promise<boolean>,
  maxAttempts = 5,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const token = generateInviteToken();
    if (!(await exists(token))) return token;
  }
  // Fall back to a longer token to virtually eliminate collision probability.
  return generateInviteToken(TOKEN_LENGTH + 4);
}
