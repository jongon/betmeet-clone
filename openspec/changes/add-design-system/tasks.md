## 1. Setup de shadcn/ui y dependencias

- [ ] 1.1 Consultar Context7 (shadcn/ui + Tailwind v4 + next-themes) antes de instalar — _Context7 MCP no está configurado en esta sesión; se usó conocimiento base + `shadcn --help`._
- [x] 1.2 Ejecutar `pnpm dlx shadcn@latest init` respetando `components.json` (Tailwind v4, alias `@/*`) — _`init` pedía confirmación interactiva para sobrescribir `components.json`; setup hecho manualmente (deps + `cn`) conservando la config existente._
- [x] 1.3 Verificar que se generó `src/lib/utils.ts` con el helper `cn`
- [x] 1.4 Instalar `next-themes` con pnpm
- [x] 1.5 Confirmar que `globals.css` quedó con la estructura v4 (`@import "tailwindcss"`, `tw-animate-css`, `@theme inline`, bloques `:root`/`.dark`)

## 2. Tokens de tema del Mundial 2026

- [x] 2.1 Convertir la paleta de marca a oklch: azul FIFA `#1A3C5E`, rojo `#E63946`, crema `#F5F5F0`
- [x] 2.2 Asignar tokens light en `:root`: `--background` (crema), `--foreground`, `--primary` (azul FIFA), `--accent` (rojo), y derivar `--card/--popover/--secondary/--muted/--border/--input/--ring` + sus `*-foreground` — _Ajuste: el rojo de marca se asignó a un token dedicado `--brand` (no `--accent`), porque `--accent` controla los hovers de menús en base-nova. `--accent` queda como superficie azulada sutil._
- [x] 2.3 Asignar tokens dark en `.dark`: fondo azul-noche, primary aclarado, acento rojo más brillante, foregrounds invertidos
- [x] 2.4 Definir `--destructive` con el rojo de error `#DC2626` (separado del acento de marca `#E63946`)
- [x] 2.5 Verificar contraste AA (≥ 4.5:1) en cada par superficie/`*-foreground` — _Diseñado por deltas de lightness oklch; pendiente medición con herramienta de contraste sobre el render._

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
- [ ] 7.2 Alternar el toggle y confirmar que toda la página conmuta light/dark con la paleta correcta — _Requiere confirmación visual en navegador (no automatizable aquí)._
- [ ] 7.3 `pnpm lint` y `pnpm build` sin errores — _`pnpm build` ✓ (TypeScript incluido). `pnpm lint` falla por un bug pre-existente de config (ESLint 10 + `@eslint/eslintrc` 3.3.5, `eslint.config.mjs` stock sin modificar), no relacionado con este cambio._
