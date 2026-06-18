# Unit 2: UX Education and Onboarding — Code Generation Summary

> Resumen de la generación (Parte 2). Alcance: **Opción A** (i18n sin prefijo `[locale]`; no se movieron rutas de Unit 1).

## Validación
- **Type check**: **0 errores** de TypeScript en todo el proyecto (`tsc --noEmit`).
- **Tests**: **41/41 pasan** (`vitest run`, 10 archivos) — incluye 9 de scoring + 5 de cue-store de Unit 2.
- **Formato**: Biome aplicado (solo advertencias preexistentes, sin errores).
- **content-collections**: build OK (1 colección, 6 documentos MDX).
- ✅ **Errores preexistentes de Unit 1 resueltos** (a petición del usuario, post-generación): se tipó el retorno de las acciones `sign-in`/`sign-up`/`reset-password`/`forgot-password` con un objeto `error` plano (incluye `_form`) y `| undefined`, resolviendo el narrowing de `useActionState`; y se migró `AvatarUploadMetaSchema` de la API zod v3 (`errorMap`) a zod v4 (`error`). Tipos definidos sin `export` por la restricción de los módulos `"use server"`.

## Dependencias añadidas
- `@content-collections/core`, `@content-collections/mdx`, `@content-collections/next`, `@content-collections/cli` (devDeps).
- (Reutilizadas) `next-themes`, `@base-ui/react`.

## Archivos creados

### Configuración / build
- `content-collections.ts` — colección `rules` (MDX tipado, schema zod).
- `next.config.ts` *(modificado)* — `withContentCollections` + nota de hardening CSP por hash.
- `tsconfig.json` *(modificado)* — alias `content-collections`.

### i18n (Step 3)
- `src/i18n/config.ts`, `src/i18n/types.ts`, `src/i18n/get-dictionary.ts`, `src/i18n/dictionaries/es.ts`.

### Contenido de reglas (Step 4)
- `content/rules/es/{scoring,penalties,match-locks,ties,pools}.mdx` (`audience=full`) + `scoring-teaser.mdx` (`audience=teaser`).

### Módulo de scoring compartido — entregable Unit 6 (Step 5)
- `src/features/scoring/scoring-rules.ts` — `ScoringRuleSet` canónico.
- `src/features/scoring/compute-score.ts` — `computeScore` puro (BL-1, BR-2.7).
- `src/features/scoring/__tests__/compute-score.test.ts` — tabla de casos.

### UI primitives (base-ui) (Step 1)
- `src/components/ui/{accordion,popover,switch}.tsx`.

### Theming (Step 6)
- `src/components/providers/theme-provider.tsx` (next-themes), `src/components/theme/theme-toggle.tsx`.
- `src/app/globals.css` *(modificado)* — set completo de tokens claro/oscuro.
- `src/app/layout.tsx` *(modificado)* — `lang="es"`, `ThemeProvider`, `suppressHydrationWarning`.

### Education (cues, calculadora) (Steps 7–8)
- `src/features/education/services/cue-store.ts` (+ test).
- `src/features/education/components/{dismissible-callout,info-popover,scoring-calculator,score-breakdown-explainer,score-breakdown-demo,scoring-table,calculator-error-boundary,island-boundary}.tsx`.

### Rules Center (Step 9)
- `src/app/rules/page.tsx`, `src/features/education/components/{rules-accordion,rules-header}.tsx`, `src/lib/rules-content.ts`.

### Landing (Step 10)
- `src/app/page.tsx` *(reemplazado)*, `src/features/education/components/{landing-hero,scoring-teaser,pool-preview,landing-secondary-ctas}.tsx`, `src/features/pools/types.ts` (`PoolPreviewItem`).

### Onboarding (Step 11)
- `src/features/profile/components/rules-step.tsx`.
- `src/app/onboarding/profile/onboarding-client.tsx` *(modificado)* — paso `rules`.
- `src/features/profile/components/onboarding-progress-indicator.tsx` *(modificado)* — 4 pasos.

### Gating (Step 12)
- `src/proxy.ts` *(modificado)* — `/rules` removido de rutas públicas (BR-2.10).

## Contratos entregados a otros units
- **Unit 3**: `PoolPreviewItem` (`src/features/pools/types.ts`) — `PoolPreview` se cablea a esta interfaz.
- **Unit 5**: cues `scoring-hint` / `match-lock-countdown` (vía `InfoPopover` y diccionario) como contratos de componente.
- **Unit 6**: `src/features/scoring/*` (módulo compartido, invariante BR-2.7) y `ScoreBreakdownExplainer` data-agnóstico.

## Notas de implementación
- **Tema**: se usa `next-themes` (ya era dependencia) en lugar de un script propio; encaja con `.dark` + `@custom-variant` de `globals.css`. El script inline de next-themes está permitido por la CSP report-only (`'unsafe-inline'`); el endurecimiento por hash queda documentado para el cambio a enforce.
- **MDX**: `@next/mdx` se descartó a favor de **content-collections** (Q2=C) por tipado/validación en build.
- **OG**: metadata `openGraph` en la landing; el asset de imagen estática (`src/app/opengraph-image.png`, convención Next) queda como activo de diseño pendiente.
- **Locale**: ruta sin prefijo (Opción A). Estado original de Unit 2: `SUPPORTED_LOCALES=["es"]`; añadir un idioma no requiere refactor de componentes. **Refine Unit 24**: se activa `en` sin introducir `/es` ni `/en`, con preferencia por cookie + `profiles.locale`, selector en `UserMenu`/Perfil y contenido MDX bilingüe.
- **Refine Unit 43 (2026-06-18)**: nuevo paso "Notificaciones" en el onboarding, entre reglas y passkey. El paso reutiliza el panel de notificaciones (`NotificationSettingsPanel`) y es skippable. La secuencia completa queda: nickname → avatar → reglas → notificaciones → passkey. Ver `aidlc-docs/inception/requirements/requirements.md` (FR-REFINE-43.1).
