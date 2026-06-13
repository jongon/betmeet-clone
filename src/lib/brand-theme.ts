/**
 * Brand theming axis (Unit 8, FR-DS-01.2/01.4) — shared, framework-agnostic
 * helpers usable from both Server Components (root layout) and Client Components
 * (brand provider). No "use client": importing these from the server is safe.
 *
 * The active brand is persisted in a cookie so the server can render
 * `<html data-theme>` with the correct value before paint (FR-REFINE-16.6),
 * replacing the previous inline anti-FOUC bootstrap script (see CF-8).
 */

export const BRANDS = ["deportivo", "moderno", "premium"] as const;
export type Brand = (typeof BRANDS)[number];

export const DEFAULT_BRAND: Brand = "deportivo";

/** Cookie that carries the chosen brand (read server-side, written client-side). */
export const BRAND_COOKIE = "brand-theme";

export function isBrand(value: string | null | undefined): value is Brand {
  return value === "deportivo" || value === "moderno" || value === "premium";
}

/** Validates an arbitrary value against the whitelist, falling back to the default. */
export function coerceBrand(value: string | null | undefined): Brand {
  return isBrand(value) ? value : DEFAULT_BRAND;
}
