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
