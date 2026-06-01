## Context

El proyecto es una app Next.js 16 (App Router) + React 19 con Tailwind **v4** (configuración basada en CSS dentro de `src/app/globals.css`, sin `tailwind.config.*`) y pnpm. `components.json` ya está configurado para shadcn/ui (style `base-nova`, `baseColor: neutral`, icon library `lucide`, `css: src/app/globals.css`, alias `@/*` → `src/*`), pero shadcn **no está instalado**: faltan dependencias, `src/lib/utils.ts` y el directorio `src/components/`. Las fuentes actuales son Geist/Geist Mono y el dark mode solo se infiere por `prefers-color-scheme`.

Convención del repo (AGENTS.md): **consultar Context7 antes de usar cualquier librería**. Aplica a shadcn/ui, Tailwind v4 y next-themes durante la implementación.

Esta es la base visual previa a cualquier feature (álbum, intercambios, perfil); no toca backend, Prisma, Supabase ni Docker.

## Goals / Non-Goals

**Goals:**
- Theme de shadcn/ui con la identidad del Mundial 2026 (azul FIFA `#1A3C5E`, rojo `#E63946`, crema `#F5F5F0`) en tokens semánticos.
- Light/dark mode completo con toggle, sin flash, basado en clase `.dark` vía `next-themes`.
- Identidad tipográfica geométrica moderna (display Poppins/Sora + cuerpo Inter).
- Página `/design-system` que renderiza paleta, tipografía y todos los componentes base para revisión visual.

**Non-Goals:**
- Implementar features de producto (álbum, intercambios, auth, perfil).
- Diseñar componentes de dominio (carta de cromo, grid de álbum) — solo la base reutilizable.
- Cambios en backend, base de datos o infraestructura Docker.
- Pixel-perfect contra un mockup externo (no existe aún); el objetivo es coherencia y temática.

## Decisions

**1. Tailwind v4 con tokens en `globals.css` (no `tailwind.config.ts`).**
Se mantiene el enfoque CSS-first de Tailwind v4: `@import "tailwindcss"`, variables en `:root`/`.dark` y mapeo en `@theme inline`. La inicialización de shadcn para v4 genera esta estructura con `tw-animate-css` en lugar de `tailwindcss-animate`. Alternativa descartada: crear `tailwind.config.ts` (innecesario en v4 y desalineado con `components.json`).

**2. Colores en oklch.**
shadcn v4 usa oklch para mejor interpolación y consistencia perceptual. Convertimos la paleta de marca (hex) a oklch y la asignamos a tokens semánticos en vez de literales, para que todo componente herede el tema. Mapeo propuesto:
- `--primary` ← azul FIFA `#1A3C5E`; `--primary-foreground` ← crema/blanco.
- `--brand` ← rojo `#E63946` (token dedicado para CTAs destacados y estados activos). **Nota de implementación:** no se mapeó al `--accent` de shadcn porque en base-nova `--accent` controla los hovers/focus de menús; `--accent` queda como superficie azulada sutil.
- `--background` ← crema `#F5F5F0` (light); `--foreground` ← azul muy oscuro derivado.
- `--destructive` ← rojo de error `#DC2626`, **separado** del acento de marca para no confundir CTA con error.
- En `.dark`: fondo azul-noche oscuro (derivado del FIFA blue), primary aclarado para contraste, acento rojo ligeramente más brillante.
Cada par superficie/`*-foreground` se valida para contraste AA.

**3. `next-themes` con `attribute="class"`.**
Toggle manual (claro/oscuro/sistema) necesario para la revisión en `/design-system`. `ThemeProvider` (client component) envuelve `children` en `layout.tsx`; `<html suppressHydrationWarning>` evita warnings de hidratación; `next-themes` inyecta un script que aplica la clase antes del paint para evitar flash. Alternativa descartada: solo `prefers-color-scheme` (no permite forzar tema en la página de revisión).

**4. Tipografía: display + cuerpo vía `next/font/google`.**
Dirección geométrica moderna: **Sora** para titulares como `--font-display`, **Inter** para cuerpo como `--font-sans`. Se cargan en `layout.tsx` con variables y se exponen en `@theme`. El carácter "de fútbol" se aporta con escala de titulares amplia, mayúsculas/tracking en etiquetas y uso del acento rojo, sin recurrir a una fuente decorativa de camiseta (descartada por legibilidad y peso).

**5. Set base de componentes shadcn.**
Instalar vía CLI: button, card, input, label, badge, tabs, dialog, dropdown-menu, switch, separator, avatar, tooltip, sonner. Cubre formularios, navegación, overlays y feedback — suficiente para construir features sin volver a tocar la base pronto. Se añaden incrementalmente si una feature lo requiere.

**6. `/design-system` como ruta App Router.**
`src/app/design-system/page.tsx`, client component (necesita el toggle y estados interactivos). Secciones: paleta (swatches con nombre de token), tipografía (escala), y galería de componentes por variante/estado. Sirve de contrato visual vivo; no se enlaza desde la navegación de usuario final.

## Risks / Trade-offs

- **Conversión hex→oklch imprecisa** → usar una utilidad de conversión y verificar visualmente en `/design-system`; ajustar lightness/chroma hasta cumplir contraste AA.
- **Flash of incorrect theme (FOUC)** → mitigado por el script de `next-themes` + `suppressHydrationWarning`; verificar recargando en dark.
- **shadcn CLI sobrescribe `globals.css`** → ejecutar `init` primero y aplicar los tokens de marca **después**, para no perder personalización.
- **`base-nova`/`base-color: neutral` en `components.json`** podría generar tokens neutrales por defecto → tras `init`, reemplazar los valores neutrales por la paleta de marca conservando los nombres de variable.
- **Deriva de identidad futura** → al ser tokens semánticos centralizados, un cambio de marca se hace en un solo lugar (`globals.css`).

## Open Questions

- Ninguna pendiente. Decidido: display **Sora**; `--destructive` es un rojo de error `#DC2626` separado del acento de marca `#E63946`.
