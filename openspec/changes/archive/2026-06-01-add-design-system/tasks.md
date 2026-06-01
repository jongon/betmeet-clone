## 1. Setup de shadcn/ui y dependencias

- [x] 1.1 Consultar Context7 (shadcn/ui + Tailwind v4 + next-themes) antes de instalar — _Configurado en este mismo cambio: `.agent/config/mcp/source.json` es la fuente canónica; `scripts/setup-agent.sh` genera `.claude/settings.json` y `opencode.json` desde ella; los dos están commiteados (out-of-the-box); `lefthook pre-commit` detecta drift. En opencode, Context7 corre como remote (`https://mcp.context7.com/mcp`). En Claude Code se mantiene el shim stdio+npx ya en uso._
- [x] 1.2 Ejecutar `pnpm dlx shadcn@latest init` respetando `components.json` (Tailwind v4, alias `@/*`) — _`init` pedía confirmación interactiva para sobrescribir `components.json`; setup hecho manualmente (deps + `cn`) conservando la config existente._
- [x] 1.3 Verificar que se generó `src/lib/utils.ts` con el helper `cn`
- [x] 1.4 Instalar `next-themes` con pnpm
- [x] 1.5 Confirmar que `globals.css` quedó con la estructura v4 (`@import "tailwindcss"`, `tw-animate-css`, `@theme inline`, bloques `:root`/`.dark`)

## 2. Tokens de tema del Mundial 2026

- [x] 2.1 Convertir la paleta de marca a oklch: azul FIFA `#1A3C5E`, rojo `#E63946`, crema `#F5F5F0`
- [x] 2.2 Asignar tokens light en `:root`: `--background` (crema), `--foreground`, `--primary` (azul FIFA), `--accent` (rojo), y derivar `--card/--popover/--secondary/--muted/--border/--input/--ring` + sus `*-foreground` — _Ajuste: el rojo de marca se asignó a un token dedicado `--brand` (no `--accent`), porque `--accent` controla los hovers de menús en base-nova. `--accent` queda como superficie azulada sutil._
- [x] 2.3 Asignar tokens dark en `.dark`: fondo azul-noche, primary aclarado, acento rojo más brillante, foregrounds invertidos
- [x] 2.4 Definir `--destructive` con el rojo de error `#DC2626` (separado del acento de marca `#E63946`)
- [x] 2.5 Verificar contraste AA (≥ 4.5:1) en cada par superficie/`*-foreground` — _`pnpm contrast` (script `scripts/contrast-check.mjs` con conversión oklch→sRGB y fórmula WCAG 2.1). Primera pasada: 3 fallos en dark (`primary/primary-foreground` 2.10:1, `muted/muted-foreground` 3.21:1, `brand/brand-foreground` 4.09:1). Ajustes: aclarar `--primary` a `oklch(0.78 0.08 245)`, aclarar `--muted-foreground` a `oklch(0.82 0.02 250)`, saturar `--brand` a `oklch(0.58 0.21 22)`. Resultado final: 18/18 pares ≥ 4.5:1 en light y dark._

## 3. Light/Dark mode

- [x] 3.1 Crear `src/components/theme-provider.tsx` (wrapper client de `next-themes`)
- [x] 3.2 Envolver `children` con `ThemeProvider` en `src/app/layout.tsx` (`attribute="class"`, `defaultTheme="system"`, `enableSystem`) y añadir `suppressHydrationWarning` en `<html>`
- [x] 3.3 Crear `src/components/theme-toggle.tsx` (claro/oscuro/sistema, con iconos lucide)
- [x] 3.4 Verificar ausencia de flash al recargar en dark mode — _Mecanismo en su sitio (script de next-themes + `suppressHydrationWarning` + `disableTransitionOnChange`); confirmación visual pendiente en navegador._

## 4. Tipografía e identidad

- [x] 4.1 Cargar Sora e Inter con `next/font/google` en `layout.tsx` como `--font-display` y `--font-sans`
- [x] 4.2 Mapear `--font-display` y `--font-sans` en el `@theme` de `globals.css` y eliminar el `font-family: Arial` por defecto
- [x] 4.3 Definir escala de titulares y reglas de espaciado/tracking temáticas (mayúsculas en labels, etc.) — _Headings con `font-display` + tracking ajustado; utilidad `.label-stadium` para etiquetas en mayúsculas._
- [x] 4.4 Actualizar `metadata` en `layout.tsx` (title/description del aplicativo de cromos)

## 5. Componentes base shadcn

- [x] 5.1 Instalar componentes: button, card, input, label, badge, tabs, dialog, dropdown-menu, switch, separator, avatar, tooltip, sonner
- [x] 5.2 Confirmar que cada componente consume tokens semánticos (sin colores literales) y cambia con el tema — _Verificado en el source (base-nova usa `bg-primary`, `bg-accent`, etc.) y vía build._

## 6. Página /design-system

- [x] 6.1 Crear `src/app/design-system/page.tsx` (client component) con el `ThemeToggle` visible
- [x] 6.2 Sección Paleta: swatches con nombre de token (primary, accent, background, etc.) en light y dark
- [x] 6.3 Sección Tipografía: escala de display + cuerpo
- [x] 6.4 Sección Componentes: galería de cada componente base en sus variantes y estados
- [x] 6.5 Añadir `<Toaster />` (sonner) para demostrar feedback

## 7. Verificación

- [x] 7.1 `pnpm dev` y abrir `http://localhost:3000/design-system` — _Smoke test: dev server responde 200 y renderiza el contenido esperado._
- [x] 7.2 Alternar el toggle y confirmar que toda la página conmuta light/dark con la paleta correcta — _Automatizado con `pnpm check:toggle:browser` (`scripts/check-theme-toggle-browser.mjs`, Playwright + Chromium). Verifica: (1) carga inicial sin clase dark, (2) click en "Oscuro" aplica `class="dark"` al `<html>`, (3) fondo conmuta de L=96 (crema) a L=9 (azul-noche) en lab perceptual, (4) click en "Claro" quita la clase, (5) recarga en dark mode aplica la clase **antes del primer paint** (FOUC prevenido por el script de `next-themes` + `suppressHydrationWarning`). 7/7 checks pasan. Screenshots en `.tmp/theme-toggle-screenshots/` (gitignored) para revisión humana final._
- [x] 7.3 `pnpm lint` y `pnpm build` sin errores — _Diagnóstico: `eslint-plugin-react@7.37.5` (última versión) declara peer dep `eslint: ^3 || ... || ^9.7` — **no soporta ESLint 10** (issue upstream #3977 abierto). `eslint-config-next@16.2.6` ya exporta flat config nativo (no necesita `FlatCompat`). Fix: (1) reescribir `eslint.config.mjs` importando las 3 sub-configs de `eslint-config-next` sin `FlatCompat`; (2) pinear `eslint` a `9.39.4` en `package.json` (compatible con todos los plugins del stack). Tras la corrección, `pnpm lint` y `pnpm build` pasan limpios (0 errores, 0 warnings)._
