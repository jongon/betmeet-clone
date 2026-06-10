# Unit 2: UX Education and Onboarding — Deployment Architecture

> Cómo se construye, despliega y sirve Unit 2. Hereda el pipeline y los entornos de Unit 1 (`shared-infrastructure.md`). Unit 2 es estático/CDN, sin componentes de servidor nuevos.

---

## Topología de despliegue

```
                        git push
   Repo (develop/main) ───────────► Vercel Build
                                        │
                                        ├─ next build
                                        │   ├─ content-collections → RuleDocument[] (MDX compilado)
                                        │   ├─ generateStaticParams → /es, /es/rules (HTML estático)
                                        │   ├─ bundle: calculadora (dynamic import), cues, theme controller
                                        │   └─ hash SHA-256 del script de tema → inyectado en CSP
                                        ▼
                                 Vercel Edge CDN (global)
                                        │
        ┌───────────────────────────────┼───────────────────────────────┐
        ▼                               ▼                                ▼
   Landing  /es              Rules Center /es/rules              Assets estáticos
   (HTML estático)           (HTML estático, gated)             (OG image, fuentes, MDX compilado)
        │                               │
        │                               └─► gateo: Supabase Auth (heredado)
        │                                       no-sesión → redirect /sign-in
        ▼
   Islas cliente (navegador):
   ThemeController · ScoringCalculator (lazy) · Cue Store (localStorage) · PoolPreview
```

---

## Pipeline de build y deploy

| Fase | Acción | Responsable |
|---|---|---|
| Commit | Push a rama (`develop` = preview, `main` = producción) | Desarrollador |
| Build | `next build` compila MDX (content-collections), prerenderiza locales, empaqueta islas y calcula el hash del script de tema | Vercel |
| CSP | El hash del script de tema se añade a `script-src` en `proxy.ts`/headers (report-only) | Build + edge |
| Deploy | Publicación atómica; el CDN sirve el nuevo deployment de inmediato | Vercel |
| Invalidación | **El deploy es la invalidación** (sin caché runtime); cambios de reglas requieren deploy (BR-2.8) | Vercel |

---

## Entornos (heredados de Unit 1)

| Entorno | Rama | Render |
|---|---|---|
| Local | — (`next dev`) | Mismo código; tema/cues funcionan con `localStorage` del navegador |
| Preview | cualquier rama ≠ `main` | SSG estático en `*.vercel.app` |
| Production | `main` | SSG estático en dominio de Vercel (o custom cuando se configure) |

Sin proyectos Supabase nuevos: el gateo de `/rules` usa el mismo Supabase Auth de Unit 1 por entorno.

---

## Rendering por ruta

| Ruta | Estrategia | Dinámico | Cache |
|---|---|---|---|
| `/[locale]` (landing) | SSG (`generateStaticParams`) | No | CDN, revalida por deploy |
| `/[locale]/rules` | SSG + gateo Auth | No (HTML estático; gateo en edge/proxy) | CDN |
| Assets (`public/`, OG, MDX, fuentes) | Estático con hash | No | `immutable`, 1 año |
| Islas cliente (calculadora, cues, theme) | Cliente | No (corre en navegador) | Parte del bundle cacheado |

> El gateo de `/rules` se aplica en `proxy.ts` (heredado); el contenido sigue prerenderizado, el control de acceso ocurre en el borde antes de servirlo.

---

## Observabilidad (mínima — Q3=B)

- **Vercel dashboard**: estado de build/deploy, logs de funciones (mínimas en Unit 2).
- **Supabase dashboard**: logs de Auth (relevante solo para el gateo de `/rules`).
- **Sin** Speed Insights / Analytics en v1. Validación de rendimiento (LCP, Lighthouse ≥ 90) **en pre-deploy** (Lighthouse local/CI), no RUM en producción.

---

## Resiliencia en despliegue

- Deploy atómico: o se sirve la versión anterior completa o la nueva completa (sin estados intermedios).
- Las islas cliente degradan vía Error Boundary (Pattern 3): un fallo de runtime en el navegador no afecta el HTML estático servido.
- Si Supabase Auth no está disponible, el gateo de `/rules` redirige a `/sign-in` (comportamiento heredado); la landing pública permanece accesible (estática, sin dependencia de Auth).
