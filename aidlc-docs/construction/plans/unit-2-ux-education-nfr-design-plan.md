# Unit 2: UX Education and Onboarding — NFR Design Plan

## Unit
**UX Education and Onboarding** (landing, Rules Center, calculadora, cues, tema, i18n)

## Plan Checklist
- [x] Collect and analyze answers to clarification questions below (Q1–Q6 = A; explicada Q4 al usuario)
- [x] Resolve any ambiguous answers with follow-up questions (sin ambigüedades)
- [x] Generate `aidlc-docs/construction/unit-2-ux-education/nfr-design/nfr-design-patterns.md`
- [x] Generate `aidlc-docs/construction/unit-2-ux-education/nfr-design/logical-components.md`

---

## Contexto

Esta etapa traduce los NFR de Unit 2 en **patrones de diseño** y **componentes lógicos** concretos. Recordatorio de decisiones ya tomadas: SSG estático, presupuesto <150KB/ruta, WCAG AA en ambos temas, tema system+toggle en `localStorage`, routing `[locale]`, módulo de scoring compartido en `src/features/scoring/`, MDX tipado con content-collections. Unit 1 fijó una **CSP moderada en modo report-only**.

Cada pregunta marca una opción **(recomendado)** según el contexto; puedes aceptarla o elegir otra.

---

## Clarification Questions

Responde cada pregunta poniendo la letra después de `[Answer]:`.
Si ninguna opción encaja, elige la última (X) y describe tu preferencia.

---

### Question 1 — Resiliencia: flash de tema (FOUC) al cargar
El tema se persiste en `localStorage` (Q9=B), lo que puede causar un parpadeo de tema incorrecto antes de que React hidrate. ¿Cómo lo mitigamos?

A) **Script inline bloqueante en `<head>`** que lee `localStorage`/`prefers-color-scheme` y fija `data-theme` en `<html>` **antes** del primer paint. Minimiza el FOUC. (recomendado)
B) **Aceptar el parpadeo breve** — aplicar el tema en un efecto de React tras la hidratación; sin script inline.
C) **Usar `next-themes`** — librería que ya gestiona el script inline y el toggle por nosotros.
X) Otro (describe después de `[Answer]:`)

[Answer]: A

---

### Question 2 — Seguridad: CSP para el script inline de tema
Si elegimos un script inline (Q1 A/C), la CSP moderada de Unit 1 debe permitirlo de forma segura. ¿Qué enfoque?

A) **Nonce por request** — el script inline lleva un `nonce` que se incluye en la cabecera CSP; queda limpio y listo para pasar la CSP de report-only a enforce más adelante. (recomendado)
B) **Hash en la CSP** — permitir el script estático por su hash SHA-256 (sin nonce dinámico).
C) **Sin cambios** — mantener CSP report-only; no tratar el inline de forma especial en v1.
X) Otro (describe después de `[Answer]:`)

[Answer]: A

---

### Question 3 — Resiliencia: degradación de las islas cliente
Calculadora, `PoolPreview` y cues son islas cliente que no deben tumbar la página (BR-2.14, BR-2.26). ¿Qué patrón de aislamiento usamos?

A) **Error Boundary por isla** — cada isla envuelta en su propio boundary con fallback estático: calculadora → tabla de puntuación estática; `PoolPreview` → se oculta; cue → se muestra/omite sin romper. (recomendado)
B) **Un Error Boundary global** de página, con un fallback genérico.
C) **Sin boundaries explícitos** — confiar en `try/catch` dentro de cada componente.
X) Otro (describe después de `[Answer]:`)

[Answer]: A

---

### Question 4 — Performance/Escalabilidad: prerender de locales
Con routing `[locale]` (Q6=B) y `es` como único idioma activo, ¿cómo generamos las rutas?

A) **`generateStaticParams` prerenderiza todos los locales activos** (solo `es` hoy) en build → páginas 100% estáticas en CDN. (recomendado)
B) **Locale por defecto estático, otros bajo demanda (ISR)** cuando se añadan idiomas.
C) **Dinámico por request** (SSR) para negociar locale en runtime.
X) Otro (describe después de `[Answer]:`)

[Answer]: A

---

### Question 5 — Componente lógico: abstracción de persistencia de cues
El descarte de cues usa `localStorage` con fail-open (BR-2.16, BR-2.18). ¿Cómo lo encapsulamos?

A) **Servicio `cueStore` tipado y único** — wrapper SSR-safe sobre `localStorage` con guardas (fail-open si no disponible); todos los cues lo usan. Una sola fuente de verdad. (recomendado)
B) **Llamadas a `localStorage` inline** dentro de cada componente de cue.
X) Otro (describe después de `[Answer]:`)

[Answer]: A

---

### Question 6 — Performance/Metadata: imagen Open Graph para compartir la landing
La landing es marketing y se compartirá en redes. SEO avanzado está fuera de alcance (BR-2.31), pero una OG básica mejora el compartir. ¿La incluimos?

A) **OG básica estática + meta tags** (título, descripción, imagen de previsualización) para WhatsApp/redes; sin SEO avanzado (sin JSON-LD/sitemap). (recomendado)
B) **Sin OG/meta** más allá de los defaults de Next.js en v1.
X) Otro (describe después de `[Answer]:`)

[Answer]: A

---

## Notas
- Si alguna respuesta resulta ambigua, añadiré preguntas de seguimiento antes de generar los artefactos.
- Tras las respuestas generaré `nfr-design-patterns.md` y `logical-components.md` para Unit 2 y presentaré el gate de aprobación.
