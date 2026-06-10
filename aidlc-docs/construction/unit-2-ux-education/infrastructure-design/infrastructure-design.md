# Unit 2: UX Education and Onboarding — Infrastructure Design

> Mapeo de los componentes lógicos de Unit 2 a infraestructura real. Unit 2 **no introduce backend nuevo**: reutiliza la infra compartida de Unit 1 (`shared-infrastructure.md`) — Vercel + Supabase. Respuestas: Q1=A (CSP por hash), Q2=A (OG estática), Q3=B (monitoreo mínimo), Q4=A (caché por defecto de Vercel).

---

## Resumen de mapeo componente lógico → infraestructura

| Componente lógico (NFR Design) | Infraestructura | Notas |
|---|---|---|
| Landing `/`, Rules Center `/rules` | **Vercel — SSG estático en CDN** | Prerenderizado en build; servido desde el edge global |
| Locale Static Params (`[locale]`) | **Vercel build** (`generateStaticParams`) | `/es/*` estático; `dynamicParams=false` |
| Localized Content Source (MDX) | **Build step** (content-collections) | Compilado en `next build`; no hay runtime/CMS |
| Shared Scoring Module | **Código en el bundle** | Función pura; sin infraestructura |
| Theme Bootstrap Script | **HTML servido por CDN** | Script inline permitido por **hash CSP** (Q1=A) |
| CSP Hash Allowlist | **Vercel edge / `proxy.ts` headers** | Extiende la CSP report-only de Unit 1; sin nonce ⇒ sin render dinámico |
| Cue Store, Theme Controller, Error Boundaries | **Cliente (navegador)** | Sin infraestructura de servidor |
| Open Graph Metadata + imagen | **Asset estático en `public/` + CDN** | OG estática (Q2=A); cero runtime |
| Gateo de `/rules` | **Supabase Auth** (heredado) | Redirección a `/sign-in` vía `proxy.ts` |

---

## Decisiones de infraestructura

### 1. Compute / Rendering — Vercel SSG (Q1=A, Q4=A)
- Landing y Rules Center se prerenderizan en `next build` y se sirven como **HTML estático desde el CDN de Vercel**.
- **CSP por hash** (no nonce) para el script inline de tema → el documento **no pasa a render dinámico**; se conserva el estático puro y los objetivos de LCP < 2.5s.
- La calculadora se carga vía `dynamic import` solo en `/rules` (no infra, solo bundling).

### 2. Storage — ninguno nuevo
- Unit 2 **no** crea tablas ni usa Supabase Storage (BR-2.30).
- El contenido de reglas (MDX) y la imagen OG son **assets del repositorio**, distribuidos por el CDN tras el build.

### 3. Networking / Edge — CSP por hash (Q1=A)
- La cabecera CSP se gestiona en `proxy.ts` (configuración heredada de Unit 1, modo **report-only**).
- Unit 2 **añade** `script-src 'sha256-<hash-del-script-de-tema>'`.
- Como no hay nonce por request, no se introduce render dinámico ni coste de cómputo por visita.

### 4. Monitoring — mínimo, heredado (Q3=B)
- Sin herramientas nuevas: se usan los dashboards de **Vercel** (logs, estado de deploy) y **Supabase** (Auth).
- **No** se añade Vercel Speed Insights ni Analytics en v1. Los objetivos de rendimiento (LCP, Lighthouse) se validan **en pre-deploy** con Lighthouse/CI manual, no con RUM en producción.

### 5. Caché / CDN — defaults de Vercel (Q4=A)
- Assets con hash → `Cache-Control: public, max-age=31536000, immutable` (gestionado por Vercel).
- HTML estático → revalidación gestionada por Vercel; el cambio de contenido se propaga vía **deploy atómico** (consistente con BR-2.8). Sin cabeceras manuales.

### 6. Messaging / Async — N/A
- Unit 2 no tiene jobs programados, colas ni procesamiento asíncrono.

---

## Cambios sobre la infraestructura compartida

Unit 2 **no añade servicios compartidos nuevos**. El único cambio transversal es la **extensión de la CSP** (un hash adicional en `script-src`) sobre la configuración ya existente de Unit 1. No requiere nuevas variables de entorno ni nuevos proyectos Supabase. Por tanto, `shared-infrastructure.md` no cambia salvo una nota opcional sobre la directiva CSP del script de tema.

---

## Variables de entorno
- **Ninguna nueva** para Unit 2. Reutiliza las de Unit 1 (Supabase URL/keys para el gateo de `/rules`).
- La lista de locales soportados (`SUPPORTED_LOCALES`) es **constante de código**, no variable de entorno (v1 solo `es`).
