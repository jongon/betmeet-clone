# Unit 2: UX Education and Onboarding — NFR Requirements Plan

## Unit
**UX Education and Onboarding** (landing pública, Rules Center, calculadora educativa, cues, extensión de onboarding, i18n)

## Plan Checklist
- [x] Collect and analyze answers to clarification questions below
- [x] Resolve any ambiguous answers with follow-up questions (Q1/Q2/Q4/Q7/Q8 explicadas + recomendación aceptada)
- [x] Generate `aidlc-docs/construction/unit-2-ux-education/nfr-requirements/nfr-requirements.md`
- [x] Generate `aidlc-docs/construction/unit-2-ux-education/nfr-requirements/tech-stack-decisions.md`

---

## Contexto para las preguntas

Unit 2 es predominantemente **frontend/UX**: no crea tablas ni migraciones (BR-2.30) y no implementa SEO avanzado (BR-2.31). Sus piezas con impacto NFR son:

- **Landing pública `/`** — primera impresión de marketing, mayormente estática con islas cliente (`PoolPreview`).
- **Rules Center `/rules`** — contenido MDX gated + calculadora interactiva cliente.
- **Calculadora educativa** — `computeScore` debe ser idéntica al scoring autoritativo de Unit 6 (BR-2.7, invariante crítico).
- **Cues educativos** — `localStorage`, fail-open, nunca bloquean.
- **i18n** — español activo, estructura lista para más idiomas (BR-2.28, BR-2.29).

Las decisiones NFR de Unit 1 ya vigentes y heredadas salvo que indiques lo contrario: WCAG 2.1 AA, hosting Vercel + Supabase Free, monitoreo mínimo, Next.js 16 App Router.

---

## Clarification Questions

Responde cada pregunta poniendo la letra después de `[Answer]:`.
Si ninguna opción encaja, elige la última (X) y describe tu preferencia.

---

### Question 1 — Rendering / performance de la landing pública
La landing `/` es la primera impresión y debe cargar rápido en móvil. ¿Qué estrategia de renderizado y objetivo de rendimiento fijamos?

A) **Estática (SSG) con islas cliente** — contenido prerenderizado en build; `PoolPreview` hidrata en cliente. Objetivo: LCP < 2.5s y Lighthouse Performance ≥ 90 en móvil (4G).
B) **Dinámica (SSR por request)** — render en servidor en cada visita para poder inyectar pools reales server-side cuando llegue Unit 3. Objetivo de rendimiento "razonable", sin umbral estricto.
C) **Híbrida** — shell estático + `PoolPreview` como segmento dinámico/streaming (PPR). Objetivo: LCP < 2.5s.
X) Otro (describe después de `[Answer]:`)

[Answer]: A (recomendación de Claude — landing estática SSG; PoolPreview hidrata en cliente y puede subir a PPR cuando Unit 3 traiga datos reales)

---

### Question 2 — Herramienta de MDX para el contenido de reglas
El contenido de reglas vive en MDX versionado en el repo y se compila en build (BL-2). ¿Qué tooling MDX usamos?

A) **`@next/mdx` oficial** — MDX como páginas/imports nativos de Next.js; lo más simple, sin dependencias extra, compila en build.
B) **`next-mdx-remote` / `next-mdx-remote-client`** — MDX cargado desde archivos y serializado; más flexible para separar `audience=teaser` vs `audience=full` desde una fuente de datos.
C) **Librería de content-layer tipada** (ej. `content-collections` / `velite`) — frontmatter tipado y validado, ideal si los `RuleDocument` necesitan metadata estructurada (order, audience, section).
X) Otro (describe después de `[Answer]:`)

[Answer]: C (recomendación de Claude — content-collections: RuleDocument tipado/validado en build, encaja con audience/section/order. Alternativa simple: A @next/mdx. Confirmar librería con Context7 en code-gen)

---

### Question 3 — Accesibilidad de las pantallas de Unit 2
Unit 1 fijó WCAG 2.1 AA para auth/onboarding. ¿Qué nivel aplicamos a la landing, Rules Center, calculadora y cues?

A) **WCAG 2.1 AA en todo Unit 2** — consistente con Unit 1: navegación por teclado en acordeones/calculadora/popovers, foco visible, contraste, roles ARIA y anuncios de resultado de la calculadora a lectores de pantalla.
B) **AA en flujos interactivos (calculadora, onboarding, cues), básico en landing** — la landing solo garantiza contraste y HTML semántico.
C) Sin requisito estricto de accesibilidad para Unit 2.
X) Otro (describe después de `[Answer]:`)

[Answer]: A

---

### Question 4 — Frontera del módulo de scoring compartido
`computeScore` y `ScoringRuleSet` deben producir resultados idénticos a Unit 6 (invariante crítico, BR-2.7). ¿Cómo materializamos ese contrato ahora?

A) **Módulo compartido único y puro** — `src/features/education/services/compute-score.ts` + `scoring-rules.ts` se crean como módulo neutral (sin dependencias de UI/DB) que Unit 6 importará tal cual. Se cubre con tests unitarios de la tabla de casos (exacto/resultado/parcial/miss/bonus).
B) **Implementación local en Unit 2, refactor a compartido en Unit 6** — ahora vive dentro de education; Unit 6 decide la ubicación canónica cuando llegue.
C) **Definir solo `ScoringRuleSet` compartido ahora; `computeScore` duplicado** — cada unit implementa su función pero importa las mismas constantes.
X) Otro (describe después de `[Answer]:`)

[Answer]: A (recomendación de Claude — módulo único puro y testeado, importado por Unit 2 y Unit 6. Matiz: ubicarlo en ruta neutral `src/features/scoring/` o `src/lib/scoring/`, no bajo education)

---

### Question 5 — Librería de popovers/tooltips e interacción
Los `InfoPopover` y elementos interactivos usan primitivas accesibles. ¿Qué base usamos?

A) **shadcn/ui + base-ui** (lo ya referenciado en el diseño y el stack de Unit 1) — popover/tooltip accesibles del sistema de componentes existente, sin añadir librerías nuevas.
B) **Radix UI directo** — si se prefiere Radix como primitiva headless por debajo.
C) Implementación propia mínima con `<details>`/CSS, sin dependencia de librería.
X) Otro (describe después de `[Answer]:`)

[Answer]: A

---

### Question 6 — Estrategia de locale para i18n en v1
La copy referencia claves de diccionario y la estructura está lista para más idiomas (BR-2.29). Para v1 con español único, ¿qué alcance de i18n implementamos ahora?

A) **Diccionario único sin routing de locale** — `es` activo, sin prefijo `/es` ni middleware de locale; la infraestructura (`get-dictionary`, tipos, MDX por carpeta) queda lista pero no se activa multi-locale.
B) **Routing de locale desde ya** — segmento `[locale]` y negociación, aunque solo exista `es`, para no migrar rutas después.
C) Solo diccionario de strings, contenido MDX sin separación por locale todavía.
X) Otro (describe después de `[Answer]:`)

[Answer]: B

---

### Question 7 — Caché y entrega del contenido de reglas / ejemplos calculados
El Rules Center degrada con gracia si un bloque dinámico falla (BR-2.14). ¿Cómo tratamos el contenido y su caché?

A) **Todo estático en build** — MDX y ejemplos precalculados se incluyen en el bundle/HTML; "fallo de bloque dinámico" se limita a la calculadora cliente. Sin caché en runtime que invalidar.
B) **MDX estático + ejemplos vía Server Component cacheado** (`unstable_cache`/revalidate) por si en el futuro los ejemplos se calculan server-side.
C) Indiferente — usa el default de Next.js.
X) Otro (describe después de `[Answer]:`)

[Answer]: A (recomendación de Claude — Rules Center = página /rules gated con reglamento completo + calculadora; contenido estático en build, único bloque vivo es la calculadora cliente; sin caché runtime que invalidar)

---

### Question 8 — Presupuesto de bundle para las islas cliente
La calculadora, los cues y `PoolPreview` añaden JS cliente a páginas que deberían ser ligeras. ¿Fijamos un presupuesto?

A) **Sí, presupuesto estricto** — JS cliente de la landing y `/rules` por debajo de ~150KB gzip por ruta; calculadora cargada de forma diferida (dynamic import) para no penalizar el primer paint.
B) **Presupuesto laxo** — mantener componentes cliente al mínimo razonable, sin umbral numérico.
C) Sin restricción de bundle en v1.
X) Otro (describe después de `[Answer]:`)

[Answer]: A (recomendación de Claude — presupuesto estricto ~150KB gzip/ruta; calculadora vía dynamic import solo en /rules)

---

### Question 9 — Tema claro/oscuro y detección de sistema (CF-1)
La app debe soportar light/dark mode y detectar la preferencia del sistema. Unit 2 es la unidad de UX y toca `globals.css` y la landing, así que es su hogar natural (cubre retroactivamente las pantallas de Unit 1 al ser tokens globales). ¿Qué comportamiento fijamos?

A) **System + toggle persistente sin flash** — por defecto sigue `prefers-color-scheme`; el usuario puede forzar claro/oscuro y se persiste en **cookie** (leída en SSR para evitar flash de tema incorrecto). Tokens dark en `globals.css`.
B) **System + toggle en localStorage** — igual, pero la preferencia se guarda en `localStorage` (más simple; asume un posible flash breve en la primera pintura).
C) **Solo detección de sistema** — respeta `prefers-color-scheme` sin toggle manual en v1.
X) Otro (describe después de `[Answer]:`)

[Answer]: B

---

## Notas
- Si alguna respuesta resulta ambigua ("depende", "estándar", "no sé"), añadiré preguntas de seguimiento antes de generar los artefactos.
- Tras recibir las respuestas generaré `nfr-requirements.md` y `tech-stack-decisions.md` para Unit 2 y presentaré el gate de aprobación.
