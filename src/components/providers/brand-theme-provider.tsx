"use client";

import type * as React from "react";
import { useSyncExternalStore } from "react";

/**
 * Brand theming axis (Unit 8, FR-DS-01.2/01.4) — orthogonal to next-themes'
 * light/dark. Persists the chosen brand in localStorage and reflects it on
 * `<html data-theme>`, which drives the `[data-theme="…"]` token blocks in
 * globals.css. The pre-paint value is set by the BRAND_BOOTSTRAP script in
 * layout.tsx (anti-FOUC), so this store only reads/updates it afterwards.
 *
 * Implemented with useSyncExternalStore (not useState+useEffect) to stay free of
 * hydration mismatches and the react-hooks/set-state-in-effect lint, matching
 * the ThemeToggle pattern.
 */

export const BRANDS = ["deportivo", "moderno", "premium"] as const;
export type Brand = (typeof BRANDS)[number];

const STORAGE_KEY = "brand-theme";
const EVENT = "brand-theme-change";
const DEFAULT_BRAND: Brand = "deportivo";

function isBrand(value: string | null): value is Brand {
  return value === "deportivo" || value === "moderno" || value === "premium";
}

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
