# Functional Design (Light) — Unit 66: Selector de idioma en el header del landing

## Stage
- **Unit**: 66
- **Stage**: Functional Design (Light)
- **Created**: 2026-06-24
- **Status**: Awaiting explicit approval — plan presentado y aprobado antes de ejecutar (`/aidlc:refine`).

## Contexto

Refine vía `/aidlc:refine` — *"con respecto al cambio del idioma también tiene que ser posible desde el header del landing"*.

**Unit 64** llevó el selector de idioma al chrome de la app como un icono + popover (`LanguageMenu`, mismo patrón que `BrandToggle`), montándolo en `AppHeader` y `OnboardingHeader` para hacer descubrible la capacidad bilingüe `es`/`en` de Unit 24. Pero el **header del landing** (`/`, definido inline en `src/app/page.tsx`) quedó fuera: solo expone `BrandToggle` y `ThemeToggle`. Un visitante (anónimo o logueado) en la portada no podía cambiar de idioma desde el header.

Brecha de **descubribilidad** idéntica a la de Unit 64, en la única superficie de header que se omitió. No es brecha de capacidad ni de datos: la capacidad ya existe (Unit 24) y el componente ya existe (Unit 64).

## Business Logic Model

```
src/app/page.tsx (Server Component, root layout)
  header
    ├─ <LanguageMenu />   ← NUEVO (Unit 66)
    ├─ <BrandToggle />
    ├─ <ThemeToggle />
    └─ UserMenu | (sign-in / sign-up)
```

`LanguageMenu` (Unit 64) es un Client Component **sin props** que reusa `useDictionary`/`useLocale` (contexto) + la Server Action `setLocale(locale, pathname)` + `useTransition`/`router.refresh()`. El `DictionaryProvider` envuelve toda la app desde `src/app/layout.tsx` (root layout), por lo que funciona en el landing sin cambios adicionales.

## Business Rules

| ID | Regla |
|----|-------|
| **BR-66.1** | El header del landing (`/`) monta `LanguageMenu` junto a `BrandToggle`/`ThemeToggle`, alineado a la derecha, replicando el chrome de `AppHeader`/`OnboardingHeader` (BR-64.x). Disponible para visitantes anónimos y logueados. |
| **BR-66.2** | Se reutiliza el componente `LanguageMenu` existente tal cual (sin props, sin variantes); la resolución/persistencia de locale (cookie `locale` + `profiles.locale`, `setLocale`) de Unit 24/64 queda intacta. Sin nuevas claves i18n, schema, migraciones, rutas ni server actions. |

## Stages
- **Requirements / User Stories**: EXECUTE (Épica 66 / FR-REFINE-66.1, US-66.1).
- **Application Design**: EXECUTE (delta `unit-of-work.md` Unit 66 + #49).
- **Functional Design**: EXECUTE (este documento).
- **Code Generation**: EXECUTE.
- **Build and Test**: EXECUTE.
- **SKIP**: Reverse Engineering, Units Generation, NFR Requirements/Design, Infrastructure.

## Security Baseline
COMPLIANT — sin nueva superficie de input; `locale` ya se valida server-side en `setLocale` (`parseLocale` contra `SUPPORTED_LOCALES`). Sin schema, migraciones, rutas ni nuevas Server Actions.

## Out of scope
- Routing `[locale]`, hreflang/SEO (igual que Unit 24/64).
- Tests del Server Component `page.tsx` (no existen tests de página ni de los otros headers que extender; `LanguageMenu` ya está cubierto por `language-menu.test.tsx`).

## Primary Deliverable
Al abrir `/` (landing), el header muestra el icono de idioma (globo `Languages`) junto a Marca/Tema; al pulsarlo aparece el popover Español/English y cambiar de idioma recarga la portada en el idioma elegido, tanto para visitantes anónimos como logueados.
