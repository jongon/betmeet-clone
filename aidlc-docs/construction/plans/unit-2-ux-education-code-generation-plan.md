# Unit 2: UX Education and Onboarding — Code Generation Plan

> **Single source of truth** para la generación de código de Unit 2. La generación (Parte 2) ejecutará estos pasos en orden tras tu aprobación.

## Unit Context

**Unit**: UX Education and Onboarding
**Workspace root**: `/var/www/html`
**Code location**: `/var/www/html/src/` (monolito, estructura híbrida feature-first — consistente con Unit 1)
**Project type**: Greenfield (Next.js 16, TypeScript, Tailwind v4, shadcn/ui + base-ui, content-collections, Prisma/Supabase heredado)

## Stories / Screen Contracts implementados por este Unit
- **Landing / Public Home** screen contract → landing pública `/`
- **Onboarding** screen contract → paso `rules` añadido al onboarding de Unit 1
- **Rules Center** screen contract → `/rules` (gated)
- **Match Prediction education cues** → componentes de cue entregados como contrato para Unit 5
- **Score breakdown education** → `ScoreBreakdownExplainer` entregado como contrato para Unit 6

## Dependencias
- **Depende de Unit 1** (Foundation): root layout, `proxy.ts`, gating de Auth, onboarding existente, `globals.css`, shadcn/ui base.
- **Provee a futuros units**: interfaz `PoolPreviewItem` (Unit 3), `ScoreBreakdownExplainer` + módulo `scoring` (Unit 6), cues `scoring-hint`/`match-lock-countdown` (Unit 5).
- **No** crea tablas ni migraciones (BR-2.30).

---

## ⚠️ Decisión de alcance previa a la generación — Routing de locale (Q6=B)

Q6=B eligió **routing `[locale]`**. Implementarlo de forma completa exige **reubicar las rutas de Unit 1** (`src/app/page.tsx`, `(auth)/`, `onboarding/`, `settings/`, `auth/callback`) bajo `src/app/[locale]/`, y reescribir el matcher y las listas de rutas de `proxy.ts` para ser locale-aware. Es un refactor invasivo justo antes del lanzamiento.

Dos formas de cumplir el espíritu de Q6=B:

- **Opción A — i18n sin prefijo de URL ahora (recomendada)**: construir TODA la infraestructura i18n (diccionarios tipados, `get-dictionary`, contenido MDX por locale, copy vía claves) con `es` como locale por defecto **sin** el segmento `[locale]` en la URL. Las rutas de Unit 1 **no se mueven**. Cuando se añada un segundo idioma, se introduce `[locale]` con las rutas ya desacopladas del texto (el trabajo duro —externalizar la copy— ya está hecho). Bajo riesgo, no toca Unit 1.
- **Opción B — `[locale]` completo ahora (fiel literal a Q6=B)**: mover todas las rutas de Unit 1 + Unit 2 bajo `src/app/[locale]/`, `generateStaticParams`, y `proxy.ts` locale-aware. Mayor blast radius sobre Unit 1 y más superficie de regresión.

**Recomendación**: **Opción A**. Logra el objetivo real de Q6B ("no migrar texto después") externalizando toda la copy, sin el coste/riesgo de mover rutas antes del lanzamiento. El plan de abajo asume **Opción A** salvo que indiques B al aprobar.

> Confirma A o B al aprobar el plan. Si eliges B, reordeno y añado los pasos de migración de rutas de Unit 1.

---

## Generation Steps (asume Opción A)

### Step 1 — Dependencias y componentes UI base
- [x] Añadir `content-collections` (+ `@content-collections/core`, `@content-collections/next`, `@content-collections/mdx`) — confirmar versión con **Context7**.
- [x] Añadir componentes shadcn/ui faltantes (base-ui): `accordion`, `popover` (o `tooltip`), `switch` (para el toggle de tema) vía CLI.
- [x] `pnpm install`.

### Step 2 — Configuración de build (content-collections + CSP hash)
- [x] `content-collections.ts` (config raíz): colección `rules` desde `content/rules/**/*.mdx` con schema `{ slug, title, order, audience }`.
- [x] `next.config.ts`: envolver con `withContentCollections`.
- [x] `next.config.ts` / `proxy.ts`: añadir a la CSP (report-only de Unit 1) `script-src 'sha256-<hash-del-theme-script>'` (Pattern 2, Q1=A). Script de cálculo de hash documentado.

### Step 3 — Infraestructura i18n
- [x] `src/i18n/dictionaries/es.ts` — diccionario español (copy de landing, rules, onboarding, cues, tema).
- [x] `src/i18n/types.ts` — tipos de claves (type-safety, BR-2.28).
- [x] `src/i18n/get-dictionary.ts` — carga del diccionario por locale (`es` default).
- [x] `src/i18n/config.ts` — `SUPPORTED_LOCALES = ["es"]`, `DEFAULT_LOCALE = "es"`.

### Step 4 — Contenido de reglas (MDX)
- [x] `content/rules/es/scoring.mdx`, `penalties.mdx`, `match-locks.mdx`, `ties.mdx`, `pools.mdx` con frontmatter (`slug`, `title`, `order`, `audience`).
- [x] Teaser (`audience: teaser`) para el resumen de puntuación de la landing; resto `audience: full`.

### Step 5 — Módulo de scoring compartido (entregable para Unit 6)
- [x] `src/features/scoring/scoring-rules.ts` — `ScoringRuleSet` (EXACT 5, RESULT 2, PARTIAL 1, MISS 0, PENALTY +1).
- [x] `src/features/scoring/compute-score.ts` — `computeScore(example): ScoreBreakdown` (BL-1) y tipos `ScoringExample`, `ScoreBreakdown`.
- [x] `src/features/scoring/__tests__/compute-score.test.ts` — tabla de casos (exacto/resultado/parcial/miss/bonus penales) — contrato del invariante BR-2.7.

### Step 6 — Theming
- [x] `src/app/globals.css` — ampliar tokens claro/oscuro (reusa `.dark` ya existente y `@custom-variant dark`).
- [x] `src/components/theme/theme-script.ts` — string del script inline (fija `.dark` en `<html>` desde `localStorage`/`prefers-color-scheme`, fail-open).
- [x] `src/components/theme/theme-toggle.tsx` — toggle claro/oscuro/sistema (persiste en `localStorage`), `data-testid="theme-toggle"`.
- [x] `src/app/layout.tsx` — `lang="es"`, inyectar el script inline en `<head>` (con hash CSP), montar `ThemeToggle` donde aplique.

### Step 7 — Servicios y componentes de cues (contrato para Units 5/6)
- [x] `src/features/education/services/cue-store.ts` — `shouldShowCallout`/`dismissCallout` (SSR-safe, fail-open, clave `cue:dismissed:{id}`).
- [x] `src/features/education/components/dismissible-callout.tsx` — `data-testid="dismissible-callout-{id}"`.
- [x] `src/features/education/components/info-popover.tsx` — base-ui popover, sin estado de descarte.
- [x] Cues iniciales: `nickname-discriminator`, `ranking-pool-only` (dismissible), `scoring-hint`, `match-lock-countdown` (info, contrato para Unit 5).

### Step 8 — Calculadora y explicador de puntaje (entregable para Unit 6)
- [x] `src/features/education/components/score-breakdown-explainer.tsx` — data-agnóstico (BR-2.33).
- [x] `src/features/education/components/scoring-calculator.tsx` — usa `computeScore`; selector de penales solo si knockout+empate; validación de inputs; `data-testid`.
- [x] `src/features/education/components/score-breakdown-demo.tsx` — ejemplos estáticos.

### Step 9 — Rules Center `/rules` (gated)
- [x] `src/app/rules/page.tsx` — Server Component; `getFullRules()` de content-collections.
- [x] `rules-header.tsx`, `rules-accordion.tsx` (base-ui accordion, ARIA), montaje de `ScoringCalculator` (dynamic import) + `ScoreBreakdownDemo`.
- [x] Error Boundary por isla (Pattern 3): calculadora → tabla estática de fallback.

### Step 10 — Landing pública `/`
- [x] `src/app/page.tsx` — **reemplaza** el placeholder del template; Server Component estático.
- [x] `landing-hero.tsx`, `scoring-teaser.tsx` (`getTeaserRules()`), `pool-preview.tsx` (estados loading/empty/error, interfaz `PoolPreviewItem`), `landing-secondary-ctas.tsx`.
- [x] `src/features/pools/types.ts` — interfaz `PoolPreviewItem` (contrato para Unit 3).
- [x] OG: `app/opengraph-image` estática en `public/` + `metadata`/`generateMetadata` (Pattern 6, Q2=A).
- [x] Error Boundary alrededor de `PoolPreview` (se oculta al fallar, BR-2.26).

### Step 11 — Paso `rules` en onboarding (modifica Unit 1)
- [x] `src/features/profile/components/rules-step.tsx` — resumen + enlace al Rules Center; `Continuar` y `Saltar por ahora` (saltable, BR-2.21).
- [x] **Modificar** `src/app/onboarding/profile/onboarding-client.tsx` — tipo `Step` += `"rules"`; insertar entre `avatar` y `passkey`.
- [x] **Modificar** `src/features/profile/components/onboarding-progress-indicator.tsx` — añadir paso `rules` (4 pasos).

### Step 12 — Gating y CSP en proxy.ts (modifica Unit 1)
- [x] **Modificar** `src/proxy.ts` — quitar `/rules` de `PUBLIC_ROUTES` (BR-2.10); un no-autenticado en `/rules` redirige a `/sign-in`.
- [x] Añadir la cabecera CSP con el hash del theme script (si se centraliza aquí en vez de `next.config`).

### Step 13 — Tests de componentes y lógica
- [x] Tests de `compute-score` (Step 5, ya listado), `cue-store` (fail-open), y render básico de calculadora/teaser.
- [x] (Ejecución real de tests ocurre en la fase Build & Test.)

### Step 14 — Documentación
- [x] `aidlc-docs/construction/unit-2-ux-education/code/generation-summary.md` — archivos creados/modificados, mapa story→archivo, notas de integración para Units 3/5/6.

---

## Trazabilidad story/contrato → pasos
| Contrato | Pasos |
|---|---|
| Landing / Public Home | 10, 3, 4, 6 |
| Onboarding (+rules) | 11, 3 |
| Rules Center | 9, 4, 8, 3 |
| Education cues (Unit 5) | 7 |
| Score breakdown (Unit 6) | 5, 8 |
| Theming (CF-1) | 6, 2 |
| i18n (Q6) | 3, 4 |

## Notas de generación
- **Modificar en sitio** los archivos de Unit 1 (onboarding-client, progress-indicator, proxy.ts, layout, globals.css, page.tsx); nunca crear copias.
- `data-testid` estable en elementos interactivos (regla de automatización).
- Confirmar cada librería externa con **Context7** antes de usarla (convención del proyecto).
- Total de pasos: **14**. Alcance: ~1 nuevo módulo (scoring), ~2 features (education, landing/pools types), i18n, theming, contenido MDX, y 3 modificaciones a Unit 1.
