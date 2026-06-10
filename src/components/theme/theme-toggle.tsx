"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { es } from "@/i18n/dictionaries/es";

const ORDER = ["light", "dark", "system"] as const;
type ThemeChoice = (typeof ORDER)[number];

const ICONS: Record<ThemeChoice, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const LABELS: Record<ThemeChoice, string> = {
  light: es.theme.light,
  dark: es.theme.dark,
  system: es.theme.system,
};

/**
 * Cycles light → dark → system. Renders a stable placeholder until mounted to
 * avoid a hydration mismatch (next-themes resolves the theme on the client).
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const current = (mounted ? (theme as ThemeChoice) : "system") ?? "system";
  const Icon = ICONS[current] ?? Monitor;

  function cycle() {
    const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
    setTheme(next);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={cycle}
      aria-label={`${es.theme.toggle}: ${LABELS[current]}`}
      title={es.theme.label}
      data-testid="theme-toggle"
      suppressHydrationWarning
    >
      <Icon className="size-4" aria-hidden="true" />
    </Button>
  );
}
