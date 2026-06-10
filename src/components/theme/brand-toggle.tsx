"use client";

import { Check, Palette } from "lucide-react";
import { BRANDS, type Brand, useBrandTheme } from "@/components/providers/brand-theme-provider";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { es } from "@/i18n/dictionaries/es";
import { cn } from "@/lib/utils";

const META: Record<Brand, { name: string; desc: string; swatch: string }> = {
  deportivo: {
    name: es.brand.deportivo,
    desc: es.brand.deportivoDesc,
    // green → gold gradient preview
    swatch: "linear-gradient(135deg, #0f9e58 0%, #0f9e58 50%, #f5a524 50%, #f5a524 100%)",
  },
  moderno: {
    name: es.brand.moderno,
    desc: es.brand.modernoDesc,
    swatch: "linear-gradient(135deg, #4f46e5 0%, #4f46e5 50%, #e4e4e7 50%, #e4e4e7 100%)",
  },
  premium: {
    name: es.brand.premium,
    desc: es.brand.premiumDesc,
    swatch: "linear-gradient(135deg, #7c3aed 0%, #7c3aed 50%, #d4af37 50%, #d4af37 100%)",
  },
};

/**
 * Brand/personality selector (Unit 8). Orthogonal to the light/dark ThemeToggle:
 * picks which `[data-theme]` token block in globals.css is active.
 */
export function BrandToggle() {
  const { brand, setBrand } = useBrandTheme();

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={es.brand.select}
            title={es.brand.label}
            data-testid="brand-toggle"
          >
            <Palette className="size-4" aria-hidden="true" />
          </Button>
        }
      />
      <PopoverContent align="end" className="w-60 p-2">
        <p className="px-2 pt-1 pb-2 text-xs font-medium text-muted-foreground">{es.brand.label}</p>
        <div className="flex flex-col gap-1">
          {BRANDS.map((value) => {
            const meta = META[value];
            const active = brand === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setBrand(value)}
                aria-pressed={active}
                className={cn(
                  "flex items-center gap-3 rounded-md px-2 py-2 text-left outline-none transition-colors",
                  "hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring",
                  active && "bg-accent",
                )}
              >
                <span
                  aria-hidden="true"
                  className="size-6 shrink-0 rounded-full border border-border"
                  style={{ background: meta.swatch }}
                />
                <span className="flex flex-col">
                  <span className="text-sm font-medium leading-tight">{meta.name}</span>
                  <span className="text-xs text-muted-foreground leading-tight">{meta.desc}</span>
                </span>
                {active && <Check className="ml-auto size-4 text-primary" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
