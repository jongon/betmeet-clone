"use client";

import * as React from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "theme";
const DEFAULT_THEME: Theme = "system";
const VALID_THEMES: ReadonlySet<Theme> = new Set(["light", "dark", "system"]);

const ThemeContext = React.createContext<{
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
} | null>(null);

/**
 * Inline script that runs BEFORE hydration to set the initial `dark` class
 * on <html> based on the persisted choice or the system preference.
 *
 * Rendered via `dangerouslySetInnerHTML` directly in the layout's <head>
 * (not inside a React component) so React 19's "scripts inside React
 * components are never executed" warning does not fire.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'&&t!=='system'){t='system';localStorage.setItem('theme',t)}var s=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';var r=t==='system'?s:t;var d=document.documentElement;d.classList.toggle('dark',r==='dark');d.style.colorScheme=r}catch(e){}})();`;

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return VALID_THEMES.has(stored as Theme) ? (stored as Theme) : DEFAULT_THEME;
}

function subscribeSystemTheme(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getSystemThemeSnapshot(): ResolvedTheme {
  return getSystemTheme();
}

function getServerSystemTheme(): ResolvedTheme {
  return "light";
}

function subscribeStorage(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getStoredThemeSnapshot(): Theme {
  return readStoredTheme();
}

function getServerTheme(): Theme {
  return DEFAULT_THEME;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = React.useSyncExternalStore(
    subscribeStorage,
    getStoredThemeSnapshot,
    getServerTheme,
  );
  const systemTheme = React.useSyncExternalStore(
    subscribeSystemTheme,
    getSystemThemeSnapshot,
    getServerSystemTheme,
  );
  const resolvedTheme = theme === "system" ? systemTheme : theme;

  React.useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = React.useCallback((next: Theme) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    // Manually notify subscribers since localStorage writes from the
    // same window don't fire a 'storage' event.
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: next }));
  }, []);

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  return (
    ctx ?? { theme: DEFAULT_THEME, resolvedTheme: "light" as ResolvedTheme, setTheme: () => {} }
  );
}
