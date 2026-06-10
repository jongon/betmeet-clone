"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type * as React from "react";

/**
 * App-wide theme provider (Unit 2, CF-1).
 *
 * Uses next-themes with `attribute="class"` to match the `.dark` selector
 * already defined in globals.css. `defaultTheme="system"` follows
 * `prefers-color-scheme`; next-themes injects a small inline bootstrap script
 * to set the theme before paint, preventing a flash of incorrect theme (FOUC,
 * NFR-Design Pattern 1). The preference is persisted in localStorage (Q9=B).
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
