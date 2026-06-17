# Unit 30 — Code Generation Plan

Refine UI-only sobre `/matches`: colapsar días pasados detrás de un botón "Ver partidos
anteriores". Sin schema/datos/queries. Conserva caching. Ref: `functional-design.md`.

> Refine posterior Unit 42: las referencias a `today` UTC quedan superseded. El corte de "hoy" debe usar la misma timezone local del usuario que el agrupamiento de `/matches`.

## Steps

- [x] **1. Transform `partitionDaysByToday`** en `src/features/predictions/services/fixture-by-day.ts`
      — recibe `FixtureDayGroup[]` + `today` (`yyyy-mm-dd` local según Unit 42; antes UTC), devuelve `{ pastDays, currentDays }`.
      Pasado = `dayKey !== null && dayKey < today`. Resto (incluido `dayKey === null` y `=== today`)
      → `currentDays`. Preserva orden. JSDoc breve.
- [x] **2. Re-export** del tipo/función desde `src/features/predictions/queries.ts` si hace falta
      para `page.tsx` (seguir el patrón de `groupFixtureByDay`/`FixtureDayGroup`).
- [x] **3. Componente cliente** `src/features/predictions/components/matches-fixture-view.tsx`
      (`"use client"`): props `pastDays`, `currentDays`, `labels { showPast, hidePast }`.
      `useState(false)`; botón solo si `pastDays.length > 0`; `aria-expanded`; días pasados fuera
      del DOM al colapsar; markup de `<section>`/`<MatchCard>` movido tal cual desde `page.tsx`.
- [x] **4. `page.tsx`** — calcular `today` con la timezone local de Unit 42, `partitionDaysByToday`, interpolar labels con el
      conteo de días pasados, renderizar `<MatchesFixtureView ... />`. Conservar header, estado
      vacío, `data-testid="fixture-ready"`, `revalidate = 60`.
- [x] **5. i18n** — `matchesShowPast` / `matchesHidePast` en `src/i18n/dictionaries/es.ts`
      (referencia) y `en.ts` (mirror), dentro de `pages`.
- [x] **6. Tests** — `src/features/predictions/__tests__/partition-days-by-today.test.ts`:
      pasado→pastDays; hoy completo (con partido jugado) y futuro→currentDays; TBD (null)→currentDays;
      sin pasados→pastDays vacío; orden preservado.
- [x] **7. Verificación** — `pnpm exec tsc --noEmit`, `pnpm check` (Biome), `pnpm lint` (ESLint),
      `pnpm test` (Vitest), `pnpm build` (Next).
