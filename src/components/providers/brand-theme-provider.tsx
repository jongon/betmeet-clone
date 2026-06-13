"use client";

import type * as React from "react";
import { useSyncExternalStore } from "react";
import { BRAND_COOKIE, type Brand, DEFAULT_BRAND, isBrand } from "@/lib/brand-theme";

/**
 * Brand theming axis (Unit 8, FR-DS-01.2/01.4) — orthogonal to next-themes'
 * light/dark. Reflects the chosen brand on `<html data-theme>`, which drives the
 * `[data-theme="…"]` token blocks in globals.css.
 *
 * The pre-paint value is now rendered **server-side** from the `brand-theme`
 * cookie (root layout), so there is no inline bootstrap script (FR-REFINE-16.6,
 * CF-8). This store reads the current value from the DOM and, on change, writes
 * the cookie (for the next SSR) and localStorage (for cross-tab sync).
 *
 * Implemented with useSyncExternalStore (not useState+useEffect) to stay free of
 * hydration mismatches and the react-hooks/set-state-in-effect lint, matching
 * the ThemeToggle pattern.
 */

export { BRANDS } from "@/lib/brand-theme";
export type { Brand };

const STORAGE_KEY = "brand-theme";
const EVENT = "brand-theme-change";

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getSnapshot(): Brand {
  const current = document.documentElement.getAttribute("data-theme");
  return isBrand(current) ? current : DEFAULT_BRAND;
}

function getServerSnapshot(): Brand {
  return DEFAULT_BRAND;
}

export function setBrand(brand: Brand): void {
  document.documentElement.setAttribute("data-theme", brand);
  // Persist to a cookie so the next server render can set <html data-theme>
  // before paint (anti-FOUC) without an inline script. 1 year, Lax.
  // biome-ignore lint/suspicious/noDocumentCookie: synchronous write needed; CookieStore API is async and not universally supported
  document.cookie = `${BRAND_COOKIE}=${brand}; path=/; max-age=31536000; SameSite=Lax`;
  try {
    localStorage.setItem(STORAGE_KEY, brand);
  } catch {
    // ignore storage failures (private mode, etc.)
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Reactive access to the active brand and a setter. */
export function useBrandTheme(): { brand: Brand; setBrand: (brand: Brand) => void } {
  const brand = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { brand, setBrand };
}

/**
 * Wrapper kept in the provider tree for symmetry with ThemeProvider and to give
 * a single place to extend brand behavior later. The brand value itself is read
 * via useBrandTheme(), so this is a passthrough today.
 */
export function BrandThemeProvider({ children }: { children: React.ReactNode }) {
  return children;
}
