# Unit 64 — Selector de idioma en el header

> Refine post-construcción (2026-06-24). Aditivo y de UX; no reinicia Units 1–63.
> Reubica el selector de idioma bilingüe (Unit 24) desde el dropdown de `UserMenu`
> al **header**, para hacerlo descubrible. No reimplementa i18n.

## 1. Trazabilidad

| Artefacto | Referencia |
|---|---|
| Requisito | `FR-REFINE-64.1` (selector de idioma visible en el header) |
| Historias | `US-23.1`/`US-23.2` (selección de idioma, Unit 24) — refinadas en ubicación |
| Dependencias | **Unit 24** (infra i18n, `setLocale`, diccionarios), **Unit 11** (App Shell / `AppHeader`), Unit 8 (UI: `Popover`, `Button`) |
| Decisión transversal | `CF-11` — i18n bilingüe sin prefijo de locale (intacta) |
| No reinicia | Units 1–63 aprobadas/verificadas permanecen intactas |

## 2. Causa raíz

La capacidad bilingüe `es`/`en` ya existe y está verificada (Unit 24, 2026-06-15):
cookie `locale` + `profiles.locale`, diccionarios tipados, `setLocale`, reglas MDX,
y 104 archivos consumiendo el sistema. **No hay brecha de capacidad ni de datos.**

La brecha es de **descubribilidad**: el selector (`LanguageToggle`) vivía dentro del
dropdown de `UserMenu` (`src/components/layout/user-menu.tsx`), por lo que el usuario
no lo encontraba («lo quiero en el header, no dentro del menú; ahí no lo veo»).

## 3. Decisiones aprobadas

| Tema | Decisión |
|---|---|
| Ubicación | Header (`AppHeader` y `OnboardingHeader`), junto a Marca/Tema |
| Forma UI | **Icono de globo + popover** (consistente con `BrandToggle`), opciones Español/English con check en el activo — elegido vía AskUserQuestion |
| UserMenu | Se **retira** el `LanguageToggle` del dropdown (evita duplicación) |
| Ajustes/Perfil | **Conserva** el `LanguageToggle` inline (`account-settings.tsx`) como ubicación canónica |
| Diccionario | **Sin claves nuevas**: `dictionary.language` ya tiene `label`, `select`, `spanish`, `english`, `current` en `es.ts`/`en.ts` |

## 4. Contrato funcional

- Nuevo componente cliente `LanguageMenu` (`src/components/language/language-menu.tsx`):
  trigger `Button variant="ghost" size="icon"` con icono `Languages`, `aria-label`
  = `language.select`, `title` = `language.label`; `Popover` con una opción por
  `SUPPORTED_LOCALES` (`Español`/`English`), `Check` + `aria-pressed`/`disabled` en el activo.
- Reusa **toda** la lógica existente: `useDictionary()`/`useLocale()`, la Server Action
  `setLocale(locale, pathname)` y `useTransition` + `router.refresh()`. **Sin nuevas actions**.
- Cambiar idioma persiste cookie + `profiles.locale` (si hay sesión) y refresca la ruta
  actual sin redirect; recargar mantiene el idioma. Resolución de locale (Unit 24) intacta.

## 5. Pantallas y estados afectados

| Área | Cambio |
|---|---|
| `AppHeader` | `<LanguageMenu />` en el cluster derecho, antes de `BrandToggle`/`ThemeToggle` |
| `OnboardingHeader` | `<LanguageMenu />` junto a Marca/Tema (idioma cambiable también pre-onboarding) |
| `UserMenu` | Se elimina el bloque `LanguageToggle` + su separador |
| Settings/Profile | Sin cambios — conserva el `LanguageToggle` inline |

## 6. NFR / seguridad

- **Accesibilidad**: trigger con `aria-label`, foco visible, opción activa con `aria-pressed` y `Check`.
- **Seguridad**: sin nueva superficie de input; `locale` ya se valida server-side en `setLocale`
  (`parseLocale` contra `SUPPORTED_LOCALES`). Sin schema, migraciones ni rutas nuevas.
- **Performance**: sin round-trips extra; mismo patrón cliente que `BrandToggle`.

## 7. Plan de archivos

| Archivo | Acción |
|---|---|
| `src/components/language/language-menu.tsx` | **Nuevo** — icono + popover |
| `src/components/language/__tests__/language-menu.test.tsx` | **Nuevo** — trigger, activo, cambio vía action |
| `src/components/layout/app-header.tsx` | Montar `<LanguageMenu />` |
| `src/components/layout/onboarding-header.tsx` | Montar `<LanguageMenu />` |
| `src/components/layout/user-menu.tsx` | Quitar `LanguageToggle` + separador |
| `src/components/layout/__tests__/user-menu.test.tsx` | Quitar mock de `language-toggle` |

## 8. Verificación

- Biome/ESLint limpios; `tsc --noEmit` sin errores en los archivos tocados.
- Vitest: `language-menu.test.tsx` (3 casos) + `user-menu.test.tsx` actualizado, verdes.
- `pnpm build` OK.
- Smoke `es`/`en`: el header muestra el globo, abre popover, cambia idioma, persiste al recargar;
  el dropdown ya no muestra el selector; Ajustes/Perfil y `OnboardingHeader` siguen funcionando.

## 9. Fuera de alcance

- Cualquier cambio a la infraestructura i18n de Unit 24 (diccionarios, resolución, MDX).
- Routing `[locale]`, hreflang/SEO, emails bilingües (siguen fuera de alcance, igual que Unit 24).
