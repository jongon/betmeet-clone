# Unit 2: UX Education and Onboarding — NFR Design Patterns

> Traduce los NFR de Unit 2 en patrones concretos. Decisiones base: SSG estático, presupuesto <150KB/ruta, WCAG AA en ambos temas, tema system+toggle (`localStorage`), routing `[locale]`, módulo de scoring compartido, MDX tipado. Respuestas NFR Design: Q1=A, Q2=A, Q3=A, Q4=A, Q5=A, Q6=A.

---

## Pattern 1: No-Flash Theme Bootstrap (Resilience / Usability) — Q1=A

**Problema**: el tema se persiste en `localStorage`; React no conoce la preferencia hasta hidratar, lo que produce un parpadeo de tema incorrecto (FOUC).

**Patrón**: script **inline bloqueante** en `<head>`, ejecutado antes del primer paint, que resuelve el tema y fija `data-theme` en `<html>`.

**Lógica**:
```js
// Inline en <head>, antes de cualquier render
(function () {
  try {
    var stored = localStorage.getItem("theme");           // "light" | "dark" | "system" | null
    var system = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    var theme = (!stored || stored === "system") ? system : stored;
    document.documentElement.dataset.theme = theme;
  } catch (e) {
    // localStorage bloqueado (incógnito) → respeta el sistema, nunca rompe
    document.documentElement.dataset.theme =
      matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
})();
```

**Propiedades**:
- Se ejecuta de forma síncrona antes del paint → cero FOUC en el caso normal.
- Fail-open: si `localStorage` falla, cae a `prefers-color-scheme` sin romper el render.
- El `ThemeToggle` (Client Component) reescribe `localStorage` y `data-theme` en caliente.
- El script requiere autorización CSP (ver Pattern 2).

---

## Pattern 2: Hash-based CSP for Inline Theme Script (Security) — Q2=A, refinado por Infra Q1=A

> **Refinamiento (Infrastructure Design Q1=A)**: la versión original de este patrón usaba **nonce por request**. Un nonce se inyecta vía middleware y **fuerza render dinámico** del documento, lo que choca con el render estático (SSG) elegido en Q1/Q4. Como el script de tema es **estático y conocido**, se permite por **hash SHA-256**, preservando páginas 100% estáticas. Decisión adoptada en `infrastructure-design-plan` Q1=A.

**Problema**: la CSP moderada de Unit 1 (report-only) no debe permitir `unsafe-inline`. El script de Pattern 1 es inline, pero las páginas deben permanecer estáticas.

**Patrón**: **CSP por hash (SHA-256)**. El contenido del script inline de tema es fijo; se calcula su hash y se añade a `script-src 'sha256-<hash>'` en la cabecera CSP. No requiere nonce ni render dinámico.

**Lógica**:
- El script inline de tema (Pattern 1) tiene contenido **estable** entre deploys → su hash SHA-256 es determinista.
- Añadir `'sha256-<hash>'` a la directiva `script-src` de la CSP (configurada en `proxy.ts` / cabeceras de Unit 1).
- Mantener la CSP en **report-only** durante v1 (heredado de Unit 1), lista para pasar a **enforce** sin reescritura.
- Si el script cambia, se recalcula el hash en build (puede automatizarse en el paso de build para evitar drift).

**Propiedades**:
- Evita `unsafe-inline` y **no fuerza render dinámico** → las páginas siguen estáticas en CDN (preserva Pattern 4 y el objetivo LCP).
- El inline solo se ejecuta si su hash coincide; cualquier alteración lo bloquea.
- Coherente con la CSP moderada de Unit 1 y su evolución a enforce.

> Nota: el contenido MDX se compila a componentes (no inyecta scripts arbitrarios), así que no requiere relajar la CSP.
> Trade-off frente al nonce: el hash exige recalcularse si el script cambia; a cambio conserva el estático. Para un script de tema fijo es el equilibrio correcto.

---

## Pattern 3: Per-Island Error Boundary with Static Fallback (Resilience) — Q3=A

**Problema**: calculadora, `PoolPreview` y cues son islas cliente; un error en una no debe tumbar la página (BR-2.14, BR-2.26).

**Patrón**: **Error Boundary por isla**, cada uno con un fallback estático específico.

| Isla | Fallback al fallar |
|---|---|
| `ScoringCalculator` | Tabla de puntuación estática (las 5 reglas) — el usuario sigue aprendiendo, solo pierde la interactividad |
| `PoolPreview` | Se oculta la sección; la landing mantiene su explicación estática (BR-2.26) |
| `DismissibleCallout` | Se muestra el contenido sin el control de descarte (fail-open hacia educación, BR-2.18) |
| `InfoPopover` | Se omite el popover; el texto ancla permanece |

**Propiedades**:
- Aislamiento real: el blast radius de un error queda contenido en su isla.
- El contenido educativo nunca desaparece por completo (degrada, no rompe).
- Los boundaries son Client Components ligeros (no afectan el presupuesto de bundle de forma material).

---

## Pattern 4: Build-Time Static Localization (Performance / Scalability) — Q4=A

**Problema**: rutas con segmento `[locale]` deben mantenerse estáticas (decisión SSG) y escalar a más idiomas sin refactor.

**Patrón**: **`generateStaticParams`** declara los locales activos; Next prerenderiza cada uno en build.

**Lógica**:
```ts
// app/[locale]/layout.tsx
export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale })); // hoy: ["es"]
}
export const dynamicParams = false; // 404 para locales no soportados
```

**Propiedades**:
- `/es` y `/es/rules` salen como HTML estático servido por el CDN de Vercel (LCP < 2.5s).
- Añadir `en` = añadir a `SUPPORTED_LOCALES` + diccionario + MDX `en/`, sin tocar componentes.
- `dynamicParams = false` evita render dinámico accidental de locales inexistentes.
- (Opcional) rewrite para servir `es` como default sin prefijo visible en la URL; se afina en code-generation.

---

## Pattern 5: SSR-Safe Cue Persistence Service (Reliability / Maintainability) — Q5=A

**Problema**: el descarte de cues usa `localStorage`, que no existe en SSR ni en modo incógnito; el acceso disperso por componentes duplica lógica y riesgo.

**Patrón**: servicio único **`cueStore`** que encapsula el acceso con guardas y fail-open.

**API**:
```ts
shouldShowCallout(cueId: string): boolean   // true si no descartado o si localStorage no disponible
dismissCallout(cueId: string): void         // no-op silencioso si falla
```

**Propiedades**:
- SSR-safe: si `typeof window === "undefined"` o el acceso lanza, devuelve `true` (mostrar) y no rompe.
- Clave canónica `cue:dismissed:{id}` (BR-2.16). No sincroniza entre dispositivos (intencional).
- Una sola fuente de verdad; `DismissibleCallout` y futuros cues lo consumen.

---

## Pattern 6: Static Open Graph Metadata (Usability / Distribution) — Q6=A

**Problema**: la landing se comparte en redes; sin metadata, la previsualización es pobre. SEO avanzado está fuera de alcance (BR-2.31).

**Patrón**: metadata **estática de Open Graph** vía la API `metadata` de Next.js (o `generateMetadata` por locale).

**Lógica**:
- `title`, `description`, `openGraph` (título, descripción, imagen) y `twitter:card` definidos en el `layout`/`page` por clave de diccionario i18n.
- Imagen OG estática en `public/` (o `opengraph-image` estática). Sin generación dinámica costosa en v1.
- **No** se incluye JSON-LD, sitemap ni otras señales de SEO avanzado (respeta BR-2.31).

**Propiedades**:
- Buena previsualización en WhatsApp/redes con coste cero en runtime (estático).
- Copy traducible vía el sistema i18n; lista para más locales.

---

## Resumen de patrones

| # | Patrón | Categoría | NFR origen |
|---|---|---|---|
| 1 | No-Flash Theme Bootstrap | Resiliencia/Usabilidad | Tema (Q9 NFR-Req) |
| 2 | Hash-based CSP for Inline Script (refinado de nonce → hash, Infra Q1) | Seguridad | CSP Unit 1 + tema |
| 3 | Per-Island Error Boundary | Resiliencia | BR-2.14, BR-2.26 |
| 4 | Build-Time Static Localization | Performance/Escala | SSG + i18n |
| 5 | SSR-Safe Cue Persistence | Fiabilidad/Mantenibilidad | BR-2.16, BR-2.18 |
| 6 | Static Open Graph Metadata | Usabilidad/Distribución | Landing marketing |
