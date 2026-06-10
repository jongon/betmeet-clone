import { prisma } from "@/lib/prisma";

const ADJECTIVES = [
  "Swift",
  "Bold",
  "Brave",
  "Fierce",
  "Calm",
  "Sharp",
  "Lucky",
  "Wild",
  "Mighty",
  "Clever",
  "Rapid",
  "Silent",
  "Bright",
  "Daring",
  "Noble",
];

const NOUNS = [
  "Eagle",
  "Tiger",
  "Wolf",
  "Fox",
  "Bear",
  "Falcon",
  "Hawk",
  "Lion",
  "Panther",
  "Jaguar",
  "Cobra",
  "Viper",
  "Shark",
  "Manta",
  "Storm",
];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDigits(count: number): string {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 10)).join("");
}

export function generateNicknameSuggestions(count = 5): string[] {
  const suggestions = new Set<string>();
  while (suggestions.size < count) {
    const adj = randomElement(ADJECTIVES);
    const noun = randomElement(NOUNS);
    const digits = randomDigits(2);
    suggestions.add(`${adj}${noun}${digits}`);
  }
  return Array.from(suggestions);
}

export async function assignDiscriminator(nicknameBase: string): Promise<string | null> {
  const MAX_RETRIES = 10;

  for (let i = 0; i < MAX_RETRIES; i++) {
    const discriminator = String(Math.floor(Math.random() * 10000)).padStart(4, "0");

    const existing = await prisma.profile.findUnique({
      where: {
        nicknameBase_nicknameDiscriminator: { nicknameBase, nicknameDiscriminator: discriminator },
      },
      select: { id: true },
    });

    if (!existing) return discriminator;
  }

  return null; // All 10 retries exhausted — extremely rare
}
