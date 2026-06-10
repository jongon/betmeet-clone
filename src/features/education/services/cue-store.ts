/**
 * Cue persistence (Unit 2, NFR-Design Pattern 5 / Component "Cue Store").
 *
 * Single SSR-safe wrapper around localStorage for educational cue dismissal.
 * Fail-open: if localStorage is unavailable (SSR, incognito, blocked), callouts
 * are shown and writes are silent no-ops — education never breaks the render
 * (BR-2.16, BR-2.18).
 */
const KEY_PREFIX = "cue:dismissed:";

function storageKey(cueId: string): string {
  return `${KEY_PREFIX}${cueId}`;
}

export function shouldShowCallout(cueId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(storageKey(cueId)) !== "1";
  } catch {
    return true;
  }
}

export function dismissCallout(cueId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(cueId), "1");
  } catch {
    // fail-open: ignore persistence errors
  }
}
