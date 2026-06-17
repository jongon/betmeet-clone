# Unit 2: UX Education and Onboarding — Logical Components

> Componentes lógicos (no de UI) que materializan los patrones NFR de Unit 2. Los componentes de UI están en `functional-design/frontend-components.md`; aquí se describen los componentes de infraestructura/servicio y sus contratos.

---

## Component Map

```
┌─────────────────────────────────────────────────────────────┐
│ Documento HTML (App Router root layout)                      │
│  ├── Theme Bootstrap Script (inline, hash)    ← Pattern 1/2  │
│  └── CSP Hash Allowlist (proxy.ts / headers)  ← Pattern 2    │
├─────────────────────────────────────────────────────────────┤
│ i18n Layer                                                   │
│  ├── Locale Static Params (generateStaticParams) ← Pattern 4 │
│  ├── Dictionary Loader (get-dictionary, typed)               │
│  └── Localized Content Source (content-collections, MDX)     │
├─────────────────────────────────────────────────────────────┤
│ Education Domain                                             │
│  ├── Shared Scoring Module (computeScore + ScoringRuleSet)   │
│  └── Rule Content Provider (teaser / full)                   │
├─────────────────────────────────────────────────────────────┤
│ Client Runtime Services                                      │
│  ├── Theme Controller (ThemeToggle state)     ← Pattern 1    │
│  ├── Cue Store (localStorage wrapper)         ← Pattern 5    │
│  └── Island Error Boundaries                  ← Pattern 3    │
├─────────────────────────────────────────────────────────────┤
│ Metadata                                                     │
│  └── Open Graph Metadata Builder              ← Pattern 6    │
└─────────────────────────────────────────────────────────────┘
```

---

## Component 1: Theme Bootstrap Script
- **Tipo**: script inline en el root layout (`app/[locale]/layout.tsx` → `<head>`).
- **Responsabilidad**: resolver tema (`localStorage` → `system` fallback) y fijar `data-theme` antes del paint (Pattern 1).
- **Entradas**: `localStorage["theme"]`, `prefers-color-scheme`.
- **Salidas**: `document.documentElement.dataset.theme`.
- **Robustez**: try/catch; fail-open a sistema.
- **Seguridad**: lleva `nonce` (Component 2).

## Component 2: CSP Hash Allowlist (refinado de nonce → hash, Infra Q1=A)
- **Tipo**: configuración CSP en `proxy.ts` / generación de cabeceras de respuesta.
- **Responsabilidad**: añadir el hash SHA-256 del script inline de tema a `script-src 'sha256-…'` (Pattern 2). **No** usa nonce, para no forzar render dinámico y preservar el SSG.
- **Estado**: la CSP permanece **report-only** en v1; el hash deja la transición a enforce lista.
- **Mantenimiento**: el hash se recalcula en build si el script de tema cambia (automatizable para evitar drift).
- **Integración**: extiende la configuración CSP existente de Unit 1 (CSP Violation Reporter).

## Component 3: Locale Static Params
- **Tipo**: `generateStaticParams` + `dynamicParams = false` en el layout de `[locale]`.
- **Responsabilidad**: declarar los locales soportados (`SUPPORTED_LOCALES = ["es"]`) para prerender estático (Pattern 4).
- **Salida**: rutas estáticas `/es/*` en build; 404 para locales no soportados.

## Component 4: Dictionary Loader
- **Tipo**: módulo servidor (`src/i18n/get-dictionary.ts`) + tipos (`src/i18n/types.ts`).
- **Responsabilidad**: cargar el diccionario del locale activo y exponer claves tipadas (BR-2.28).
- **Garantía**: type-safety de claves; falta de clave = error de tipo en build.
- **Datos**: `src/i18n/dictionaries/es.ts` (único activo en v1).

## Component 5: Localized Content Source
- **Tipo**: colección tipada de content-collections (alternativa velite) sobre `content/rules/{locale}/*.mdx`.
- **Responsabilidad**: compilar MDX en `RuleDocument[]` validado (frontmatter `audience`, `section`, `order`, `title`) en build (BL-2).
- **API**: `getTeaserRules()`, `getFullRules()` ordenadas por `order`.
- **Garantía**: metadato inválido rompe el build, no producción.

## Component 6: Shared Scoring Module
- **Tipo**: módulo puro `src/features/scoring/compute-score.ts` + `scoring-rules.ts`.
- **Responsabilidad**: `computeScore(example): ScoreBreakdown` y `ScoringRuleSet` canónico (BL-1, BR-2.7). Sin dependencias de UI/DB.
- **Consumidores**: `ScoringCalculator` y `ScoreBreakdownExplainer` (Unit 2); motor de scoring (Unit 6).
- **Verificación**: tests unitarios de la tabla de casos (exacto; resultado + goles acumulables; miss; bonus penales) como contrato del invariante.

## Component 7: Rule Content Provider
- **Tipo**: capa servidor que compone el contenido para cada superficie.
- **Responsabilidad**: entregar el **teaser** (`audience=teaser`) a la landing y el **set completo** (`audience=full`) al Rules Center (BL-2). Consume Component 5.
- **Acceso**: `/rules` gated (sesión requerida); el gateo redirige a `/sign-in` (heredado de Unit 1, vía `proxy.ts`).

## Component 8: Theme Controller
- **Tipo**: Client Component / hook (`ThemeToggle` + estado).
- **Responsabilidad**: leer/escribir la preferencia (`light`/`dark`/`system`) en `localStorage` y actualizar `data-theme` en caliente (Pattern 1).
- **Robustez**: SSR-safe; no asume `window` en render servidor.

## Component 9: Cue Store
- **Tipo**: servicio cliente `src/features/education/services/cue-store.ts`.
- **Responsabilidad**: `shouldShowCallout(id)` / `dismissCallout(id)` sobre `localStorage` con clave `cue:dismissed:{id}` (Pattern 5, BR-2.16).
- **Robustez**: fail-open (muestra) si `localStorage` no disponible; no-op silencioso al escribir (BR-2.18).
- **Consumidores**: `DismissibleCallout` y cues futuros.

## Component 10: Island Error Boundaries
- **Tipo**: Client Components envoltorio (uno por isla).
- **Responsabilidad**: contener errores de `ScoringCalculator`, `PoolPreview` y cues con fallback estático específico (Pattern 3).
- **Garantía**: el contenido educativo degrada a estático; la página nunca se rompe (BR-2.14, BR-2.26).

## Component 11: Open Graph Metadata Builder
- **Tipo**: `metadata` / `generateMetadata` por locale en el layout/landing.
- **Responsabilidad**: emitir título, descripción, `openGraph` y `twitter:card` desde claves i18n; imagen OG estática en `public/` (Pattern 6).
- **Límite**: sin JSON-LD/sitemap (BR-2.31).

---

## Mapa componente → patrón → NFR

| Componente | Patrón | NFR |
|---|---|---|
| Theme Bootstrap Script | 1 | No-FOUC, usabilidad |
| CSP Hash Allowlist | 2 | Seguridad CSP |
| Locale Static Params | 4 | Performance/escala (SSG) |
| Dictionary Loader | 4 | i18n, mantenibilidad |
| Localized Content Source | — | Robustez de contenido (build-time) |
| Shared Scoring Module | — | Invariante BR-2.7, mantenibilidad |
| Rule Content Provider | — | Acceso/gateo de reglas |
| Theme Controller | 1 | Tema |
| Cue Store | 5 | Fiabilidad (fail-open) |
| Island Error Boundaries | 3 | Resiliencia |
| Open Graph Metadata Builder | 6 | Distribución/usabilidad |
