# Unit 2: UX Education and Onboarding — Infrastructure Design Plan

## Unit
**UX Education and Onboarding** (landing, Rules Center, calculadora, cues, tema, i18n)

## Plan Checklist
- [x] Collect and analyze answers to clarification questions below (Q1=A, Q2=A, Q3=B, Q4=A; sin ambigüedades)
- [x] Resolve any ambiguous answers with follow-up questions (N/A)
- [x] Generate `aidlc-docs/construction/unit-2-ux-education/infrastructure-design/infrastructure-design.md`
- [x] Generate `aidlc-docs/construction/unit-2-ux-education/infrastructure-design/deployment-architecture.md`
- [x] Update `aidlc-docs/construction/shared-infrastructure.md` (nota CSP por hash + monitoreo)
- [x] Refinar NFR Design Pattern 2 + Component 2 (nonce → hash) por decisión Q1=A

---

## Contexto y cobertura de categorías

Unit 2 es **frontend/UX** y **no introduce infraestructura nueva de backend**. Monta sobre la infra compartida ya definida en Unit 1 (`shared-infrastructure.md`): Vercel (hosting/CDN/edge) + Supabase (Auth para el gateo de `/rules`). Cobertura de categorías obligatorias:

| Categoría | Estado en Unit 2 |
|---|---|
| Deployment Environment | **Heredado** de Unit 1 (dev local + Vercel Preview, production). Sin cambios. |
| Compute | **Vercel** — render estático (SSG) + posible edge para cabeceras CSP. Sin servidores nuevos. |
| Storage | **Ninguno nuevo** — sin tablas (BR-2.30), sin Supabase Storage. Contenido MDX y OG image son assets del repo/CDN. |
| Messaging / Async | **N/A** — Unit 2 no tiene jobs ni colas. |
| Networking | **Vercel CDN + edge**; cabeceras CSP vía `proxy.ts` (heredado, se extiende). |
| Monitoring | **Heredado** (mínimo). Pregunta abierta sobre web vitals (Q3). |
| Shared Infrastructure | Reutiliza `shared-infrastructure.md`; Unit 2 no crea recursos compartidos nuevos. |

Las preguntas se limitan a las decisiones donde Unit 2 **sí** tiene una elección real. Cada una marca **(recomendado)**.

---

## Clarification Questions

Responde cada pregunta poniendo la letra después de `[Answer]:`.
Si ninguna opción encaja, elige la última (X) y describe tu preferencia.

---

### Question 1 — Reconciliar render estático con la CSP del script de tema  ⚠️ decisión clave
En NFR Design elegiste **nonce por request** (Q2=A) para el script inline de tema, y también **render estático** (SSG, Q1/Q4=A). Hay una tensión técnica: en Next.js, un **nonce por request** se inyecta vía middleware/`proxy.ts` y **fuerza render dinámico** del documento HTML (deja de ser estático puro). Para Unit 2 hay que elegir cómo resolverlo:

A) **CSP por hash (SHA-256) para el script de tema** — el script inline es **estático y conocido**, así que su hash es estable y se permite en la CSP sin nonce. Las páginas siguen **100% estáticas en CDN**. Refina la decisión NFR-Design Q2 (nonce → hash) precisamente para preservar el SSG. (recomendado)
B) **Nonce por request vía middleware** — se mantiene el nonce; el documento HTML pasa a **render dinámico en el edge** (sigue siendo rápido y cacheable a nivel de datos/assets, pero el HTML no es estático puro).
C) **Tema por cookie + SSR** — leer la preferencia desde una cookie en el servidor y fijar `data-theme` en el render; evita el inline, pero **contradice Q9=B (localStorage)** y vuelve el documento dinámico.
X) Otro (describe después de `[Answer]:`)

[Answer]: A

---

### Question 2 — Imagen Open Graph: estática o generada
La OG de la landing (Pattern 6, Q6=A). ¿Cómo la servimos?

A) **Imagen estática en `public/`** (o `opengraph-image.png` estática) — servida por el CDN, coste cero en runtime, sin dependencias. (recomendado)
B) **Generada dinámicamente con `@vercel/og`** (ImageResponse en edge) — permite OG dinámica por página/locale, pero añade una función edge y algo de complejidad.
X) Otro (describe después de `[Answer]:`)

[Answer]: A

---

### Question 3 — Medición de web vitals de la landing
La landing tiene objetivos de rendimiento explícitos (LCP < 2.5s, Lighthouse ≥ 90). Unit 1 fijó monitoreo **mínimo** (solo dashboards). ¿Añadimos medición de web vitals para Unit 2?

A) **Vercel Speed Insights** — captura web vitals reales (LCP/CLS/INP) de usuarios en la landing/rules; free tier suficiente, integración de una línea. Permite validar los objetivos en campo. (recomendado)
B) **Mantener mínimo** — solo dashboards de Vercel/Supabase, sin medición de web vitals en v1.
C) **Vercel Analytics + Speed Insights** — además de web vitals, métricas de visitantes/tráfico de la landing de marketing.
X) Otro (describe después de `[Answer]:`)

[Answer]:B

---

### Question 4 — Cabeceras de caché para assets estáticos y contenido
Para landing/rules estáticos y assets (OG image, fuentes, MDX compilado). ¿Configuración de caché?

A) **Defaults de Vercel** — assets con hash inmutables (`Cache-Control: immutable`) y HTML revalidado por Vercel automáticamente; sin configuración manual. Suficiente para contenido que cambia por deploy (BR-2.8). (recomendado)
B) **Cabeceras explícitas** — definir `Cache-Control`/`s-maxage` a medida en `next.config`/`proxy.ts` para control fino.
X) Otro (describe después de `[Answer]:`)

[Answer]: A

---

## Notas
- Si alguna respuesta resulta ambigua, añadiré preguntas de seguimiento antes de generar los artefactos.
- Tras las respuestas generaré `infrastructure-design.md` y `deployment-architecture.md` para Unit 2 (y actualizaré `shared-infrastructure.md` solo si aplica).
- La Q1 puede **refinar** un patrón de NFR Design (nonce → hash); lo dejaré registrado en el audit y en el artefacto de patrones si eliges A.
