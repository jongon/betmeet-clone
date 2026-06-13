import { BrandToggle } from "@/components/theme/brand-toggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Separator } from "@/components/ui/separator";

/**
 * Layout for the unauthenticated auth screens (sign-in, sign-up, password reset,
 * verify-email). Exposes the theme/brand toggles in a top header constrained to a
 * centered container — matching the landing header position (FR-REFINE-16.7) — so
 * they don't hug the viewport corner. No sign-out here (no session yet).
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-end gap-1 px-4 pt-4">
        <BrandToggle />
        <ThemeToggle />
      </header>
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Liga Mundial 2026</h1>
            <p className="text-sm text-muted-foreground">Predicciones del FIFA World Cup</p>
          </div>
          <Separator />
          {children}
        </div>
      </div>
    </div>
  );
}
