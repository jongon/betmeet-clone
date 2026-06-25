# Functional Design — Unit 71: Marcador en línea en mobile (`/matches`)

> Refine post-construcción (2026-06-25). Refine **puramente presentacional** sobre el componente compartido **`MatchCard`** (`src/features/competition/components/match-card.tsx`). **No reinicia** etapas aprobadas (Units 1–70 intactas). Un solo cambio de clases Tailwind responsivas corrige todas las vistas que montan el componente (la lista de `/matches` vía `MatchesFixtureView`, y cualquier otro fixture/predicción que reusa `MatchCard`).

## Traceability

| ID | Source | Description |
|----|--------|-------------|
| FR-REFINE-71.1 | requirements | En la lista de partidos (`/matches`), el marcador debe verse **en línea** en mobile: `Equipo local [TLA] M-N Equipo visitante [TLA]`, no apilado verticalmente |

## 1. Contexto y decisión

`/matches` (`src/app/(app)/matches/page.tsx`) monta `MatchesFixtureView`
(`src/features/predictions/components/matches-fixture-view.tsx`), que renderiza un `MatchCard`
por partido. El marcador de `MatchCard` usaba una rejilla de 3 columnas
`grid-cols-[1fr_auto_1fr]` **activada solo en `sm:`**. Por debajo de ese breakpoint (mobile)
el grid colapsaba a una sola columna y los tres elementos (equipo local, marcador, visitante)
se **apilaban verticalmente**:

```
Scotland [Sco]
0-3
Brazil [Bra]
```

cuando debían verse en una sola fila:

```
Scotland [Sco] 0-3 Brazil [Bra]
```

**Decisión (plan presentado y aprobado antes de ejecutar):** aplicar la rejilla de 3 columnas en
**todos los breakpoints** (no solo `sm:`), reduciendo el tamaño del marcador en mobile para que
quepa en línea. Cambio mínimo de clases, sin tocar lógica, datos ni `data-testid`.

## 2. Business Rules

### BR-71.1 — Rejilla de 3 columnas en todos los breakpoints
El contenedor del marcador usa `grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3` (antes
`grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center`). El equipo visitante usa `justify-self-end`
sin prefijo `sm:`. Así local / marcador / visitante quedan en una fila en mobile y desktop.

### BR-71.2 — Marcador escalado por breakpoint
El marcador (`<p>`) pasa de `text-2xl` fijo a `text-base sm:text-2xl` con `px-1 sm:px-3`, para
caber en línea en pantallas angostas y conservar el tamaño grande en desktop. Se mantiene
`tabular-nums-display text-center font-bold`.

### BR-71.3 — Preservación de contratos existentes
Se mantienen intactos `data-testid="match-card-{id}"`, `TeamBadge` (bandera + nombre + chip TLA),
`MatchStatusBadge`, el bloque `PredictionForm` para partidos de predicción, la función `score()`
(`"vs"` cuando no hay marcador) y el formato de fecha. En pantallas muy angostas un nombre de
equipo largo puede ajustar a 2 líneas **dentro de su columna**, conservando la fila en línea.
Nada se persiste; ninguna query, server action, schema, migración, ruta ni i18n cambia.

## 3. Archivos

| Archivo | Cambio |
|---------|--------|
| `src/features/competition/components/match-card.tsx` | MODIFIED — rejilla de 3 columnas en todos los breakpoints + marcador `text-base sm:text-2xl` + `justify-self-end` sin `sm:` |

## 4. Stages

Requirements/User Stories EXECUTE (FR-REFINE-71.1). Functional Design EXECUTE (este doc).
Code Generation EXECUTE. Build and Test EXECUTE. **SKIP** Reverse Engineering, Units Generation,
NFR Requirements/Design, Infrastructure, Application Design (refine presentacional, sin nuevo
unit-of-work, sin schema/migraciones/rutas/server actions/i18n).

## 5. Out of scope

- Truncado/elipsis de nombres de equipo largos en mobile — se permite el ajuste a 2 líneas dentro de la columna.
- Cambios al `TeamBadge` (tamaño de bandera, chip TLA) — fuera de alcance.
