# Unit 2: UX Education and Onboarding — NFR Requirements

> Unit predominantemente frontend/UX. No crea tablas ni migraciones (BR-2.30), no implementa SEO avanzado (BR-2.31). Hereda las decisiones NFR de Unit 1 (WCAG 2.1 AA, Vercel + Supabase Free, monitoreo mínimo, Next.js 16 App Router) salvo lo especificado abajo.

## Scale Baseline

| Parameter | Target |
|---|---|
| Visitas a landing pública `/` | ~2,000/día en pico de lanzamiento (tráfico de marketing) |
| Sesiones que abren `/rules` | ~500/día (mayoría durante onboarding) |
| Interacciones con la calculadora educativa | Cálculo 100% en cliente — sin carga de servidor |
| Descartes de cues (`localStorage`) | Cliente puro — sin carga de servidor |

La landing y el Rules Center son contenido estático servido por el CDN de Vercel; no añaden presión a la base de datos ni a funciones serverless. El tier Free de Vercel + Supabase es suficiente.

---

## Rendering & Performance Requirements

### Estrategia de renderizado (Q1 = A)

| Superficie | Estrategia | Justificación |
|---|---|---|
| Landing `/` | **SSG (estática) con islas cliente** | Prerenderizada en `next build`, servida desde CDN. `PoolPreview` hidrata en cliente. |
| Rules Center `/rules` | **Estática (contenido) + isla cliente (calculadora)** | Contenido MDX compilado en build; la calculadora es el único bloque interactivo. |
| `PoolPreview` (dentro de landing) | Isla cliente; **candidata a PPR** cuando Unit 3 provea datos reales | Permite subir solo ese bloque a streaming sin rehacer la página. |

### Objetivos de rendimiento (móvil, red 4G)

| Métrica | Objetivo |
|---|---|
| LCP landing `/` | < 2.5 s |
| LCP Rules Center `/rules` | < 2.5 s |
| Lighthouse Performance (móvil) | ≥ 90 en landing |
| CLS | < 0.1 (reservar espacio para `PoolPreview` skeleton para evitar saltos) |
| Recalculo de la calculadora educativa | < 16 ms (cómputo puro en cliente, percepción instantánea) |

### Presupuesto de bundle (Q8 = A)

| Ruta | Presupuesto JS cliente (gzip) |
|---|---|
| Landing `/` | < 150 KB por ruta |
| Rules Center `/rules` | < 150 KB por ruta |

- La **calculadora** (`ScoringCalculator`) se carga vía `dynamic import` y solo se descarga en `/rules`; no se incluye en el bundle de la landing.
- Los cues (`DismissibleCallout`, `InfoPopover`) son componentes ligeros; el popover usa la primitiva accesible ya presente (base-ui).
- Mantener la landing mayormente Server Components; minimizar `"use client"`.

---

## Caching & Content Delivery Requirements (Q7 = A)

### Contenido de reglas — estático en build

- Todo el contenido de reglas (MDX) y los ejemplos precalculados se **compilan en el build** y viajan dentro del HTML/bundle del deployment.
- **No existe caché de runtime que invalidar.** El único bloque "vivo" es la calculadora cliente.
- **Mecanismo de actualización de reglas**: cambiar el `.mdx` → commit → push → **rebuild + deploy atómico** en Vercel. La invalidación es el propio deploy (consistente con BR-2.8: "cambios requieren deploy, no edición en runtime").
  - Cada deploy genera assets con hash nuevo; el CDN sirve la versión nueva de inmediato. No hay purga manual ni riesgo de contenido stale.
  - El cambio es atómico: el usuario ve la versión vieja completa o la nueva completa, nunca una mezcla.
- **Evolución futura (fuera de v1)**: si en el futuro se requiere editar reglas sin deploy, se migraría el contenido a una fuente dinámica (DB) con `revalidatePath('/rules')` / `revalidateTag()` (ISR). No se implementa en v1.

### Degradación elegante (BR-2.14)

- Si un bloque dinámico (ej. la calculadora o un ejemplo calculado) falla en cliente, la página **degrada al contenido estático** y nunca se rompe.
- `PoolPreview`: en estado `error` se oculta y la landing mantiene su explicación estática (BR-2.26).

---

## Accessibility Requirements (Q3 = A)

**Target level**: WCAG 2.1 Level AA — en **todas** las superficies de Unit 2 (landing, Rules Center, calculadora, onboarding paso `rules`, cues). Consistente con Unit 1.

| Categoría | Requisito |
|---|---|
| Contraste de color | Texto ≥ 4.5:1 (normal), ≥ 3:1 (texto grande y componentes UI) — validar **en ambos temas, claro y oscuro** (ver tema) |
| Navegación por teclado | Acordeones del Rules Center, inputs de la calculadora, toggle de tema y popovers operables con Tab/Enter/Space/flechas |
| Foco visible | Anillo de foco visible en todos los elementos enfocables |
| Acordeones (`RulesAccordion`) | Patrón ARIA de accordion: `aria-expanded`, `aria-controls`, encabezados como botones |
| Calculadora (`ScoringCalculator`) | El resultado (`ScoreBreakdown`) se anuncia a lectores de pantalla vía región `aria-live="polite"` al cambiar inputs |
| `InfoPopover` | Disparador con `aria-label`, contenido con rol apropiado, cerrable con `Escape`, foco gestionado |
| `DismissibleCallout` | Botón de cierre con `aria-label`; el descarte no atrapa el foco |
| Indicador de onboarding | El paso actual se comunica a lectores de pantalla (heredado de Unit 1, ahora con 4 pasos) |
| Imágenes/iconos | Texto alternativo o `aria-hidden` según corresponda |

---

## Theming Requirements (Q9 = B, CF-1)

**Requisito**: soporte de **light mode / dark mode** con **detección de la preferencia del sistema** (`prefers-color-scheme`) y override manual.

| Aspecto | Decisión |
|---|---|
| Por defecto | Sigue `prefers-color-scheme` del sistema |
| Override manual | Toggle de tema (claro / oscuro / sistema) accesible desde la UI |
| Persistencia | `localStorage` (clave de tema); se asume un posible flash breve en la primera pintura |
| Tokens | Variables de tema dark definidas en `src/app/globals.css` (Tailwind v4 CSS-first) |
| Alcance | Tokens globales → cubre **retroactivamente** las pantallas de Unit 1 (auth/onboarding); es aditivo |
| Accesibilidad | Contraste WCAG AA verificado **en ambos temas** |
| Robustez | Si `localStorage` no está disponible, se respeta `prefers-color-scheme` sin romper el render |

---

## Internationalization Requirements (Q6 = B)

**Requisito**: routing de locale desde ya, aunque `es` sea el único idioma activo en v1, para no migrar rutas después.

| Aspecto | Decisión |
|---|---|
| Routing | Segmento `[locale]` en App Router; `es` como locale por defecto y único activo en v1 |
| Diccionario | Toda copy referencia clave de diccionario (BR-2.28); no hay strings literales de cara al usuario |
| Contenido MDX | Organizado por locale (carpeta/sufijo) para permitir añadir idiomas sin refactor |
| Type-safety | Claves de diccionario tipadas (`src/i18n/types.ts`) |
| Negociación | Estructura lista; en v1 redirige/sirve `es` por defecto |

---

## Reliability Requirements

### Calculadora educativa

- Cómputo 100% en cliente, función pura `computeScore` (sin red). No puede fallar por latencia.
- Validación de inputs: goles ≥ 0 y enteros (clamp); selector de ganador de penales solo visible si `isKnockout && empate`.
- Invariante crítico (BR-2.7): el resultado debe coincidir exactamente con el scoring de Unit 6 — garantizado por compartir el mismo módulo (ver tech-stack Decision: módulo de scoring compartido).

### Cues educativos

- `DismissibleCallout`: fail-open hacia mostrar educación si `localStorage` falla (BR-2.18). Nunca bloquea una acción (BR-2.19).
- Estado de descarte por navegador (`cue:dismissed:{id}`), no sincronizado entre dispositivos (BR-2.16).

### Landing / PoolPreview

- Estados `loading | empty | error | ready`. Ningún estado dinámico rompe la landing (BR-2.26).
- Reservar espacio del skeleton para no provocar CLS.

### Onboarding paso `rules`

- Paso saltable; nunca bloquea la finalización (BR-2.21, BR-2.23). Ambas acciones avanzan a `passkey`.

---

## Availability Requirements

- Landing y Rules Center son estáticos en CDN: disponibilidad efectiva = disponibilidad del CDN de Vercel (muy alta), independiente de Supabase.
- Si la fuente futura de pools (Unit 3) no está disponible, la landing oculta el bloque y mantiene la explicación estática.
- El Rules Center requiere sesión (gated): si Supabase Auth no está disponible, el gateo redirige a `/sign-in` (comportamiento heredado de Unit 1).

---

## Maintainability Requirements

- El módulo de scoring (`computeScore` + `ScoringRuleSet`) vive en una ruta neutral compartida y se cubre con **tests unitarios de la tabla de casos** (exacto / resultado / parcial / miss / bonus de penales). Es el contrato verificable del invariante BR-2.7.
- El contenido de reglas (MDX) se valida en build con metadatos tipados (`audience`, `section`, `order`, `title`); un metadato inválido rompe el build, no la producción.
- Toda copy en diccionarios tipados; agregar un idioma no debe requerir tocar componentes.
- `ScoreBreakdownExplainer` se entrega como componente reutilizable y data-agnóstico para Unit 6 (BR-2.33); sin fetching ni contexto de pool.
- Cues `scoring-hint` y `match-lock-countdown` se entregan como contratos de componente para Unit 5.

---

## Resumen de objetivos medibles

| NFR | Objetivo |
|---|---|
| LCP landing / rules (móvil 4G) | < 2.5 s |
| Lighthouse Performance landing | ≥ 90 |
| JS cliente por ruta (gzip) | < 150 KB |
| Recalculo calculadora | < 16 ms (cliente) |
| Accesibilidad | WCAG 2.1 AA en ambos temas |
| Invalidación de reglas | Vía deploy atómico (sin caché runtime) |
| Tema | System + toggle (localStorage), AA en claro y oscuro |
| i18n | Routing `[locale]`, `es` por defecto |
