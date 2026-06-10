# Unit 2: UX Education and Onboarding — Tech Stack Decisions

## Context

El stack está preseleccionado: Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui (base-ui), Supabase, Prisma, pnpm, Vercel. Unit 2 es frontend/UX y no añade tablas. Las decisiones siguientes configuran ese stack para landing, Rules Center, calculadora educativa, cues, tema y i18n. Toda librería externa nueva se confirma con **Context7** antes de su uso en code-generation (convención del proyecto).

---

## Decision 1: Renderizado estático de landing y Rules Center (Q1 = A, Q7 = A)

**Choice**: SSG (Static Site Generation) por defecto para `/` y `/rules`; islas cliente puntuales.

**Rationale**:
- La landing y el reglamento casi no cambian y, cuando cambian, ya requieren deploy (BR-2.8). Prerenderizar en `next build` da carga instantánea desde el CDN de Vercel, sin presión sobre Supabase ni funciones serverless.
- No hay caché de runtime que invalidar: el deploy atómico de Vercel reemplaza el contenido. Cero riesgo de contenido stale.

**Implementation approach**:
- `src/app/[locale]/page.tsx` (landing) y `src/app/[locale]/rules/page.tsx` como Server Components estáticos.
- `PoolPreview` como Client Component (isla). Marcado como candidato a Partial Prerendering (PPR) cuando Unit 3 provea datos reales, sin reescribir la página.
- `ScoringCalculator` cargada con `next/dynamic` (`ssr: false` o lazy) solo en `/rules`.

**Evolución futura**: edición de reglas sin deploy → migrar contenido a fuente dinámica con `revalidatePath`/`revalidateTag` (ISR). Fuera de v1.

---

## Decision 2: MDX tipado con content-collections (Q2 = C)

**Choice**: Capa de contenido tipada (`content-collections`, alternativa `velite`) para compilar los `.mdx` de reglas en datos validados en build.

**Rationale**:
- El modelo de dominio define `RuleDocument` con metadatos estructurados: `audience: teaser|full`, `section`, `order`, `title`. Una capa tipada valida esos metadatos en build y entrega un `RuleDocument[]` type-safe para componer la landing (teaser) y el Rules Center (full).
- Un metadato mal escrito rompe el **build**, no la producción — refuerza la robustez/degradación elegante (BR-2.14).
- Coherente con el resto del proyecto (i18n tipado, Zod en Unit 1).

**Alternativa más simple**: `@next/mdx` oficial (cero dependencias extra) si se prefiere minimizar dependencias; requeriría tipado/validación manual del frontmatter. No elegida por la pérdida de garantías de tipo.

**Implementation approach**:
- Contenido en `content/rules/{locale}/*.mdx` con frontmatter (`audience`, `section`, `order`, `title`).
- Colección tipada que expone `getTeaserRules()` y `getFullRules()` ordenadas por `order`.
- Confirmar versión/uso con Context7 en code-generation.

---

## Decision 3: Módulo de scoring compartido y puro (Q4 = A)

**Choice**: Un único módulo puro `computeScore` + `ScoringRuleSet`, en ruta **neutral** compartida, importado por Unit 2 (calculadora) y Unit 6 (scoring real).

**Rationale**:
- Garantiza por construcción el invariante crítico BR-2.7: educación y puntuación real nunca divergen porque ejecutan **la misma función**.
- Función pura (sin UI ni DB) → testeable de forma exhaustiva y reutilizable.

**Implementation approach**:
- Ubicación neutral: `src/features/scoring/compute-score.ts` + `src/features/scoring/scoring-rules.ts` (NO bajo `education`, porque Unit 6 es el dueño natural del scoring).
- `ScoringRuleSet` expone las constantes canónicas: `EXACT_SCORE=5`, `CORRECT_RESULT=2`, `PARTIAL_GOAL_COUNT=1`, `MISS=0`, `PENALTY_BONUS=1`.
- `computeScore(example: ScoringExample): ScoreBreakdown` implementa BL-1 (exacto / resultado / parcial / miss + bonus de penales).
- **Tests unitarios** de la tabla de casos como contrato verificable; los reusará Unit 6.
- La calculadora (`ScoringCalculator`) y `ScoreBreakdownExplainer` consumen este módulo; este último se entrega data-agnóstico para Unit 6 (BR-2.33).

---

## Decision 4: Popovers y tooltips con shadcn/ui + base-ui (Q5 = A)

**Choice**: Usar las primitivas accesibles de shadcn/ui (base-ui) ya presentes en el stack; no añadir librerías nuevas.

**Rationale**:
- `InfoPopover` y elementos interactivos requieren foco gestionado, `Escape` para cerrar y roles ARIA correctos — provistos por base-ui out of the box (WCAG AA).
- Consistencia con Unit 1 y cero dependencias adicionales.

**Implementation approach**:
- `InfoPopover` envuelve el Popover/Tooltip de shadcn/ui; sin estado de descarte (BR-2.17).
- `DismissibleCallout` es un componente propio ligero con botón de cierre accesible y persistencia en `localStorage` (BR-2.15, BR-2.16).

---

## Decision 5: Tema claro/oscuro con detección de sistema (Q9 = B, CF-1)

**Choice**: Tema basado en `prefers-color-scheme` con override manual persistido en `localStorage`; tokens dark en `globals.css` (Tailwind v4 CSS-first).

**Rationale**:
- Cumple CF-1 (light/dark/system). `localStorage` es la opción simple aceptada por el usuario (asumiendo un posible flash breve en primera pintura).
- Al ser tokens globales, el tema cubre retroactivamente las pantallas de Unit 1 sin tocarlas (aditivo).

**Implementation approach**:
- Estrategia `class`/`data-theme` en `<html>`: `light` | `dark`, derivado de la preferencia guardada o de `prefers-color-scheme`.
- Variables de color claras y oscuras en `src/app/globals.css` (`:root` y `.dark` / `[data-theme="dark"]`).
- `ThemeToggle` (Client Component) con tres estados: claro / oscuro / sistema; escribe la preferencia en `localStorage`.
- Pequeño script inline en `<head>` para aplicar el tema antes de la hidratación y minimizar el flash (FOUC).
- Contraste WCAG AA validado en ambos temas.
- Robustez: si `localStorage` no está disponible, se cae a `prefers-color-scheme` sin romper el render.

**Nota de validación**: confirmar si se adopta una utilidad (ej. `next-themes`) o implementación propia mínima; decidir en code-generation con Context7. Implementación propia es viable dado Tailwind v4 CSS-first.

---

## Decision 6: i18n con routing de locale (Q6 = B)

**Choice**: Segmento `[locale]` en App Router con `es` por defecto y único activo en v1; diccionarios tipados; contenido MDX por locale.

**Rationale**:
- Activar el routing de locale desde ya evita una migración de rutas dolorosa cuando se añadan idiomas (BR-2.29).
- Diccionarios tipados garantizan que ninguna clave de copy falte (BR-2.28).

**Implementation approach**:
- Estructura `src/app/[locale]/...`; `src/i18n/dictionaries/es.ts`, `get-dictionary.ts`, `types.ts`.
- Contenido de reglas en `content/rules/{locale}/*.mdx`, consumido por la colección tipada (Decision 2).
- `generateStaticParams` para prerenderizar el/los locales en build (mantiene SSG de Decision 1).
- En v1: locale por defecto `es`; estructura lista para `en` u otros sin refactor de componentes.

---

## Decision 7: Presupuesto de bundle y carga diferida (Q8 = A)

**Choice**: Presupuesto estricto de ~150 KB JS gzip por ruta; calculadora vía `dynamic import`.

**Rationale**:
- Mantener landing y `/rules` ligeras refuerza el objetivo de LCP < 2.5 s y Lighthouse ≥ 90.

**Implementation approach**:
- Maximizar Server Components; minimizar `"use client"`.
- `ScoringCalculator` con `next/dynamic` — fuera del bundle de la landing.
- Revisar el tamaño con `@next/bundle-analyzer` durante code-generation; tratar el presupuesto como criterio de revisión, no solo aspiracional.

---

## Summary Table

| Concern | Decision |
|---|---|
| Renderizado landing / rules | SSG estático + islas cliente; PPR futuro para PoolPreview |
| Tooling MDX | content-collections (tipado en build); fallback `@next/mdx` |
| Módulo de scoring | Único, puro, en `src/features/scoring/`, testeado; compartido con Unit 6 |
| Popovers / tooltips | shadcn/ui + base-ui (sin librerías nuevas) |
| Tema | system + toggle (localStorage), tokens dark en globals.css, AA en ambos temas |
| i18n | Routing `[locale]`, `es` por defecto, diccionarios tipados, MDX por locale |
| Bundle | Presupuesto < 150 KB gzip/ruta; calculadora con dynamic import |
| Invalidación de reglas | Deploy atómico (sin caché runtime) |
