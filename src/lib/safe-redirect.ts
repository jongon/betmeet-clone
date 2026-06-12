/**
 * Sanitizes a `next` / redirect destination to an internal application path.
 *
 * Prevents open redirects (FR-REFINE-13.1): only same-origin absolute paths are
 * allowed. Anything else — external URLs, protocol-relative `//host`, backslash
 * tricks, or missing values — collapses to the provided fallback.
 */
export function sanitizeNext(next: string | null | undefined, fallback = "/matches"): string {
  if (!next) return fallback;
  // Must be an absolute internal path, not protocol-relative or backslash-escaped.
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
