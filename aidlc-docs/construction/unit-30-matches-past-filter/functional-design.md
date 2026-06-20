# Unit 30 — Functional Design (mínimo)

## Filtro de "partidos anteriores" en /matches (Épica 29, FR-REFINE-30.x)

Refine UI-only sobre Unit 16 (`groupFixtureByDay`). Por defecto `/matches` colapsa los días
ya pasados detrás de un botón "Ver partidos anteriores", para que el día actual quede arriba
sin scroll. Sin schema, datos ni queries nuevas; conserva el caching (`revalidate = 60` +
`unstable_cache` del fixture).

## 1. Partición pasado / actual+futuro (servidor) — FR-REFINE-30.1, 30.4

Transform puro y unit-testable, sin acceso a DB. Recibe los `FixtureDayGroup[]` que ya produce
`groupFixtureByDay` y los parte en dos listas según la fecha de hoy en la misma timezone local.

```
partitionDaysByToday(days: FixtureDayGroup[], today: string): {
  pastDays: FixtureDayGroup[];      // dayKey !== null && dayKey < today  (orden cronológico)
  currentDays: FixtureDayGroup[];   // dayKey === null  ||  dayKey >= today
}
```

Reglas:
- **Corte por DÍA local del usuario** (refine Unit 42). `today` debe derivarse con la misma timezone
  que usa `groupFixtureByDay`, no con `new Date().toISOString().slice(0, 10)`. Si la timezone es
  `Europe/Madrid`, un instante que localmente cae en 18 de junio se compara contra `2026-06-18`.
- El día de **hoy** (`dayKey === today`) va en `currentDays` **completo**, aunque tenga partidos
  ya jugados/bloqueados.
- El bucket "Fecha por confirmar" (`dayKey === null`, knockouts sin fecha) cuenta como **futuro**
  → `currentDays`.
- Ambas listas preservan el orden cronológico de entrada (no se reordena).

Ubicación: `src/features/predictions/services/fixture-by-day.ts` (junto a `groupFixtureByDay`),
exportado vía `queries.ts`.

## 2. Componente cliente del toggle — FR-REFINE-30.2, 30.3

Nuevo componente cliente que envuelve el render de la lista de días.

```
"use client"
MatchesFixtureView({
  pastDays: FixtureDayGroup[],
  currentDays: FixtureDayGroup[],
  labels: { showPast: string; hidePast: string },  // ya interpoladas con el conteo
})
```

Comportamiento:
- Estado local `const [showPast, setShowPast] = useState(false)` → **colapsado por defecto**
  (FR-REFINE-30.3). Al recargar vuelve a colapsado (aceptado).
- Si `pastDays.length === 0` → **no** renderiza el botón (FR-REFINE-30.2); solo `currentDays`.
- Si hay días pasados:
  - Botón `<button>` **arriba**, antes de la lista. Label `showPast` cuando está colapsado,
    `hidePast` cuando expandido. `aria-expanded={showPast}`.
  - Cuando `showPast` es `false`, los días pasados **no se renderizan** (no quedan en el DOM ni
    en el árbol accesible) — NFR-REFINE-30.2.
  - Cuando `showPast` es `true`, los días pasados se renderizan **por encima** de `currentDays`,
    en su orden cronológico natural.
- El render de cada día/partido reutiliza el markup actual de `page.tsx` (mismas `<section>` y
  `<MatchCard>`), movido al componente sin cambios visuales.

Ubicación: `src/features/predictions/components/matches-fixture-view.tsx`.

## 3. Cambios en `page.tsx` — FR-REFINE-30.1, 30.4

- Calcular `today` con la misma timezone local usada para agrupar `fixture.days` y llamar
  `partitionDaysByToday(fixture.days, today)`.
- Renderizar `<MatchesFixtureView pastDays currentDays labels />` en lugar del `.map` inline
  actual. Header, estado vacío (`fixture-empty`) y `data-testid="fixture-ready"` se conservan.
- `export const revalidate = 60` intacto. La frontera "hoy" puede quedar hasta 60 s desfasada por
  ISR — irrelevante para un corte por día (NFR-REFINE-30.1).

## 4. Copy (i18n) — FR-REFINE-30.2

Añadir a `pages` en `es.ts` (referencia) y `en.ts` (debe mirror para satisfacer `Dictionary`):

| Key | es | en |
|---|---|---|
| `matchesShowPast` | "Ver partidos anteriores ({count})" | "Show earlier matches ({count})" |
| `matchesHidePast` | "Ocultar partidos anteriores" | "Hide earlier matches" |

`{count}` = nº de **partidos** pasados ocultos (suma de `matches` de todos los `pastDays`), no de
días. La interpolación de `matchesShowPast` se hace en el componente cliente con `useDictionary`.

## 5. Pruebas — NFR-REFINE-30.1

`partitionDaysByToday` (transform puro), casos:
- Días anteriores a hoy → `pastDays`; hoy y futuros → `currentDays`.
- Hoy con partidos ya jugados permanece **completo** en `currentDays` (corte por día, no por hora).
- Boundary timezone: `2026-06-17T23:00:00Z` con `Europe/Madrid` cuenta como día local `2026-06-18`.
- Bucket `dayKey === null` (TBD) → `currentDays`.
- Sin días pasados → `pastDays` vacío.
- Orden cronológico preservado en ambas listas.

## Fuera de alcance
- Persistencia del estado del toggle (URL/cookie): descartado por el usuario (client-side).
- Filtro por hora de kickoff: descartado (corte por día).
- Auto-scroll a "hoy": innecesario al colapsar los pasados.

## Trazabilidad
FR-REFINE-30.1 → §1, §3 · FR-REFINE-30.2 → §2, §4 · FR-REFINE-30.3 → §2 ·
FR-REFINE-30.4 → §1, §3 · NFR-REFINE-30.1 → §3, §5 · NFR-REFINE-30.2 → §2

> **Nota (Unit 59, 2026-06-20)**: el corte por día se mantiene, pero Unit 59 añade una excepción
> acotada: el **último horario** del día pasado más reciente sigue visible en la vista principal
> hasta 1h antes del siguiente kickoff (`selectLingeringLastSlot`, sobre la salida de
> `partitionDaysByToday`, que no se modifica). Ver
> `construction/unit-59-matches-last-match-linger/functional-design.md`.
