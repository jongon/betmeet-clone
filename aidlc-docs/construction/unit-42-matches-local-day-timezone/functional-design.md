# Unit 42 — Agrupación de partidos por día local del usuario · Functional Design

> Refine post-construcción (2026-06-17). Corrige bug de presentación en `/matches` y alinea unidades dependientes. **No reinicia** Units 1–41. Sin schema, migraciones, rutas nuevas, sync, scoring, admin ni auth.

## 1. Alcance y trazabilidad

| Historia | FR-REFINE | Naturaleza | Resultado |
|----------|-----------|------------|-----------|
| US-42.1 | 42.1 | bug UX | `/matches` agrupa partidos por día calendario local del usuario |
| US-42.1 | 42.2 | restricción | El detalle/hora del partido no cambia |
| US-42.1 | 42.3 | dependencia Unit 30 | "Partidos anteriores" usa el mismo día local |
| US-42.1 | 42.4 | dependencia Unit 41 | Predicciones por jornada usan el mismo día local |
| US-42.1 | 42.5 | robustez | Timezone inválida/no disponible cae a fallback seguro |

## 2. Problema

`/matches` agrupa por `dayKey` UTC. Para un usuario en España, un kickoff como `2026-06-17T23:00:00Z` se muestra en la tarjeta como 01:00 del 18 de junio, pero el bloque de día sigue siendo 17 de junio. El detalle del partido ya es correcto; la inconsistencia está en el agrupamiento por día y en las vistas que heredaron ese criterio.

## 3. Decisión de diseño

El día visible de un partido se deriva de la zona horaria local del usuario. El sistema mantiene `kickoffAt` como instante absoluto UTC y conserva el orden cronológico global por `kickoffAt`. Solo cambian `dayKey`, etiqueta de día y la partición de días pasados.

## 4. Contratos

### 4.1 Timezone contract

La implementación debe centralizar una función pequeña para validar/coercer timezones antes de usarlas con `Intl.DateTimeFormat`.

```ts
type TimeZone = string;

function coerceTimeZone(value: string | null | undefined): string {
  // returns value if Intl accepts it; otherwise stable fallback
}
```

Fallback permitido: `UTC` como valor técnico seguro cuando el navegador no provee timezone o el valor no es válido. El fallback no debe romper render ni tests.

### 4.2 Fixture grouping

`groupFixtureByDay` debe recibir o resolver una timezone explícita para calcular:

```ts
type FixtureDayGroup = {
  dayKey: string | null; // yyyy-mm-dd in selected timezone, null for TBD
  label: string;         // localized label in selected timezone
  matches: DayMatchView[];
};
```

Reglas:
- `kickoffAt = null` continúa en el bucket `Fecha por confirmar` (`dayKey === null`).
- El orden entre partidos se mantiene por `kickoffAt` absoluto y desempate existente (`matchNumber`).
- La etiqueta se formatea con el locale actual y la timezone validada.

### 4.3 Past/current partition

`partitionDaysByToday(days, today)` permanece como transform puro, pero `today` debe derivarse con la misma timezone usada para construir `dayKey`.

```ts
const today = formatLocalDayKey(new Date(), timeZone);
partitionDaysByToday(days, today);
```

Esto preserva la decisión de Unit 30: el día actual se muestra completo y solo se ocultan días estrictamente anteriores.

### 4.4 Pool predictions grouping

La agrupación por jornada de `PoolPredictionsView` usa el mismo contrato de timezone que `/matches`. La visibilidad de predicciones no cambia: sigue siendo `match.kickoffAt <= now`.

## 5. Frontend/SSR

La timezone real del usuario es una propiedad del navegador. Si el Server Component no puede conocerla de forma fiable en el primer render, Code Generation debe elegir el cambio mínimo que mantenga coherencia:
- opción preferida: componente cliente/wrapper que obtiene `Intl.DateTimeFormat().resolvedOptions().timeZone` y agrupa/particiona con helpers puros;
- opción alternativa: persistir/leer timezone en cookie después del primer render, sin añadir schema ni rutas;
- fallback técnico: UTC solo cuando no hay timezone válida.

La elección concreta queda para Code Generation Part 1, tras inspección del código actual.

## 6. Seguridad y NFR

| Área | Decisión |
|------|----------|
| Seguridad | Timezone es dato de presentación; validar antes de `Intl`; sin autorización nueva |
| Performance | O(n) sobre ~104 partidos; sin queries nuevas; preservar caching del fixture cuando sea viable |
| i18n | Locale actual (`es`/`en`) se conserva; solo cambia timezone del formatter |
| Compatibilidad | Browsers sin timezone válida usan fallback seguro |

## 7. Verificación esperada

Tests mínimos:
- `2026-06-17T23:00:00Z` con `Europe/Madrid` produce `dayKey = 2026-06-18`.
- El mismo instante con `UTC` produce `dayKey = 2026-06-17`.
- `partitionDaysByToday` usa el `today` local y no oculta el día local actual.
- `kickoffAt = null` sigue en `Fecha por confirmar`.
- Unit 41 agrupa predicciones con el mismo helper/criterio local.

Verificación de calidad:
- `pnpm exec tsc --noEmit`.
- Biome y ESLint sobre archivos tocados.
- Vitest enfocado sobre helpers/componentes tocados; full suite/build si el cambio cruza componente server/client compartido.

## 8. Fuera de alcance

- Cambiar `kickoffAt` almacenado.
- Cambiar lock de predicciones, scoring, sync o admin.
- Añadir preferencias persistidas de timezone en perfil.
- Modificar el detalle del partido, salvo que Code Generation detecte reutilización obligatoria del mismo helper para evitar duplicidad.

> **Nota (Unit 59, 2026-06-20)**: el agrupamiento y la etiqueta por día local siguen sin cambios.
> Unit 59 mantiene visible el último horario del día más reciente hasta 1h antes del siguiente
> kickoff usando timestamps **absolutos** (independiente de timezone), conservando el día local
> de este unit. Ver `construction/unit-59-matches-last-match-linger/functional-design.md`.
