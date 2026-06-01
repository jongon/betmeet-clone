## Why

El aplicativo de intercambio de cromos del Mundial 2026 aún no tiene una base visual: shadcn/ui está configurado en `components.json` pero no instalado, y `globals.css` solo trae los tokens por defecto de Next.js. Sin un design system con identidad propia, cada pantalla futura (álbum, intercambios, perfil) reinventaría estilos y divergiría. Establecer ahora el theme, el soporte de light/dark y una página de revisión visual da una base coherente y temática antes de construir features.

## What Changes

- Instalar e inicializar **shadcn/ui** (CLI `init`) sobre Tailwind v4, generando `src/lib/utils.ts` (`cn`) y el set base de componentes (button, card, input, label, badge, tabs, dialog, dropdown-menu, switch, separator, avatar, tooltip, sonner).
- Reescribir `src/app/globals.css` con los **tokens del Mundial 2026** mapeados a las variables semánticas de shadcn (`--primary`, `--secondary`, `--accent`, `--background`, etc.) en formato oklch, con bloques `:root` (light) y `.dark` (dark):
  - Azul FIFA `#1A3C5E` (primary), Rojo de marca `#E63946` (accent), Crema `#F5F5F0` (background light), y un rojo de error `#DC2626` (destructive) separado del acento de marca.
- Añadir **soporte completo de light/dark mode** con `next-themes`: `ThemeProvider` en el layout (`attribute="class"`, `suppressHydrationWarning`) y un componente `ThemeToggle`.
- Definir la **identidad tipográfica** (dirección geométrica moderna): **Sora** para titulares + **Inter** para cuerpo, cargadas con `next/font/google` y expuestas como variables de tema. Reglas de espaciado y escala temáticas de fútbol.
- Crear la página **`/design-system`** que renderiza todos los componentes base, la paleta, la tipografía y los estados (light/dark vía toggle) para revisión visual.
- Documentar las decisiones del design system y consultar **Context7** para shadcn/ui, Tailwind v4 y next-themes antes de implementar (convención de AGENTS.md).

## Capabilities

### New Capabilities
- `design-system`: Tokens de tema con identidad del Mundial (paleta, tipografía, radios, espaciado), soporte light/dark con toggle, librería de componentes base shadcn/ui, y la página `/design-system` de revisión visual.

### Modified Capabilities
<!-- Ninguna: no existen specs previas en openspec/specs/. -->

## Impact

- **Dependencias nuevas** (pnpm): `next-themes`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `tw-animate-css`, y los `@radix-ui/*` que instale el CLI de shadcn.
- **Archivos modificados**: `src/app/globals.css` (tokens), `src/app/layout.tsx` (fuentes + `ThemeProvider`).
- **Archivos nuevos**: `src/lib/utils.ts`, `src/components/ui/*`, `src/components/theme-provider.tsx`, `src/components/theme-toggle.tsx`, `src/app/design-system/page.tsx`.
- **Sin impacto** en backend, Prisma, Supabase ni Docker. Solo capa de presentación.
- La página `/design-system` es de uso interno de revisión; no forma parte del flujo de usuario final.
