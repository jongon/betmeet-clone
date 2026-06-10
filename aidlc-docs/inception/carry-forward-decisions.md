# Carry-Forward Decisions / Constraints

> Requisitos y restricciones de dominio identificados fuera del unit que los implementa.
> Sirven de **entrada obligatoria** para la etapa correspondiente. No se pierden entre units.

---

## CF-1 — Tema claro/oscuro y detección de sistema
**Origen**: Feedback del usuario (2026-06-10).
**Destino**: Unit 2 (UX Education and Onboarding) — es transversal pero su hogar natural es la unidad de UX, que ya toca `globals.css` y la landing.
**Requisito**: La aplicación debe soportar **light mode / dark mode** y **detección de la preferencia del sistema** (`prefers-color-scheme`), con posibilidad de override manual persistente.
**Notas**:
- Tailwind v4 es CSS-first (tokens en `src/app/globals.css`); el dark mode se define con variantes/`@media (prefers-color-scheme)` o un `data-theme` en `<html>`.
- Al ser tokens globales, estilar el tema cubre retroactivamente las pantallas de Unit 1 (auth/onboarding) — es aditivo, no rompe nada.
- Decisión de override: toggle persistido (cookie para SSR sin flash, o `localStorage` aceptando un posible flash). Se concreta en NFR/Tech-stack de Unit 2.

---

## CF-2 — Banderas de países (assets SVG)
**Origen**: Feedback del usuario (2026-06-10).
**Destino**: Unit 4 (Competition Data and API Sync) + estrategia de assets.
**Requisito**: Los equipos se identifican por la **bandera de su país**; las banderas SVG se obtienen de un repositorio público de GitHub y se incluyen como assets del proyecto (no hotlink en runtime).
**Notas / decisiones pendientes**:
- Candidatos: `lipis/flag-icons` o `hampusborgos/country-flags` (SVG por código **ISO 3166-1 alpha-2**, en minúscula).
- **Mismatch de claves**: las banderas se indexan por ISO alpha-2 (`de`, `nl`, `br`), pero el usuario pide mostrar el **código de 3 letras** (ver CF-3). Hay que almacenar ambos.
- Casos FIFA sin ISO de país: Inglaterra/Escocia/Gales no son países ISO; usan banderas de subdivisión `gb-eng`, `gb-sct`, `gb-wls`. El seed debe contemplarlos.
- Descarga reproducible: script de seed/build que copia los SVG necesarios a `public/` (o los importa), no dependencia en runtime de un CDN externo.

---

## CF-3 — Seed de países del Mundial 2026 + código de 3 caracteres
**Origen**: Feedback del usuario (2026-06-10).
**Destino**: Unit 4 (Competition Data and API Sync) — entidades de dominio + seed.
**Requisito**: Seed de las selecciones clasificadas al Mundial 2026, mostradas con un **código de 3 caracteres**.
**Notas / decisiones pendientes**:
- **Aclaración de "ISO 3 caracteres"**: el fútbol usa el **trigrama FIFA** (GER, NED, POR), que difiere del ISO 3166-1 alpha-3 (DEU, NLD, PRT) para varios países. Para que un aficionado lo reconozca, el código de display debería ser el **FIFA trigramme**. Decisión a confirmar en Unit 4: ¿FIFA o ISO alpha-3?
- Modelo sugerido para `Team`/`Country`: guardar `isoAlpha2` (clave de bandera), `displayCode` (3 chars, FIFA por defecto) y `name`.
- El Mundial 2026 son **48 selecciones**. A 2026-06-10 la clasificación puede no estar 100% cerrada; el seed debe permitir altas/ajustes (y el sync por API-Football reconcilia).

---

## CF-4 — Competition como entidad extensible (multi-competición)
**Origen**: Feedback del usuario (2026-06-10). Parcialmente reconocido en `application-design/components.md` ("Store FIFA World Cup 2026 fixture **and future competitions**") y `services.md`, pero **no modelado** en detalle.
**Destino**: Unit 4 (Competition Data and API Sync) — modelo de datos / functional design.
**Requisito**: El Mundial es **una** competición con una estructura (grupos + knockout). El modelo de datos debe permitir, a futuro, agregar **otras competiciones con estructuras distintas** (ligas con ida/vuelta, copas, formatos mixtos) sin reescribir el dominio.
**Notas / decisiones pendientes**:
- Modelar `Competition` → `Phase/Stage` (tipo: `group` | `knockout` | `league` | ...) → `Match`, en vez de cablear "grupos + octavos" como columnas fijas.
- El `ScoringRuleSet` ya se diseñó como entidad compartida (Unit 2/Unit 6); idealmente el reglamento de puntuación se asocia a la competición/edición para permitir reglas distintas por torneo.
- El `Football API Adapter` ya está pensado para "provider replacement"; la extensibilidad de estructura es el complemento del lado del modelo de dominio.
- Confirmar alcance v1: solo Mundial 2026 funcional, pero **esquema** preparado para multi-competición (sin construir UI de gestión de competiciones en v1).

---

## Estado
| ID | Tema | Destino | Estado |
|---|---|---|---|
| CF-1 | Light/Dark/System theme | Unit 2 NFR | Pregunta añadida al plan NFR de Unit 2 |
| CF-2 | Banderas SVG | Unit 4 | Registrado, pendiente Unit 4 |
| CF-3 | Seed países + código 3 chars | Unit 4 | Registrado, pendiente Unit 4 |
| CF-4 | Competition extensible | Unit 4 | Registrado, pendiente Unit 4 |
