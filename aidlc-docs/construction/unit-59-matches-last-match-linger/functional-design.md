# Functional Design — Unit 59: el último partido del día sigue visible hasta 1h antes del siguiente

> Refine post-construcción (2026-06-20) vía `/aidlc:refine`. **Plan presentado y aprobado antes
> de ejecutar** (decisiones vía AskUserQuestion). Refine sobre **Unit 30** (filtro de partidos
> pasados — corte por día calendario) y **Unit 42** (agrupamiento por día local), ambos en la
> **capa de vista** de `/matches`. **No reinicia** etapas aprobadas (Units 1–58).

## Traceability

| ID | Source | Description |
|----|--------|-------------|
| FR-REFINE-59.1 | requirements | El último partido del día (todos los del último horario) sigue visible en la vista principal de `/matches` tras la medianoche, hasta 1h antes del siguiente kickoff. |
| FR-REFINE-59.2 | requirements | Solo persiste ese último horario, no el bloque completo del día; el resto sigue oculto tras "Ver partidos anteriores". |
| FR-REFINE-59.3 | requirements | El "siguiente partido" es el próximo con kickoff confirmado; si no hay (TBD o no quedan partidos), no hay corte y permanece visible. |
| US-59.1 | stories | Como usuario, quiero ver el resultado más reciente sin abrir "partidos anteriores" durante el hueco hasta el siguiente partido. |
| BR-30.1 | unit-30 | `/matches` oculta por defecto los días estrictamente anteriores a hoy (corte por día local). |
| FR-REFINE-42.1 | unit-42 | El día se calcula en la timezone local del usuario. |

## 1. Intención del usuario

> *"En /matches salen todos los partidos del día actual hasta el final, pero me gustaría que el
> último partido del día actual se pueda ver hasta 1 hora antes del siguiente partido. Solo ese
> partido no todo el bloque del día."*

**Contexto:** Unit 30 oculta tras "Ver partidos anteriores" todo día con `dayKey < today`, y
Unit 42 calcula `today` en la timezone local. El corte es **por día calendario**: al pasar la
**medianoche local**, el bloque completo del día anterior desaparece de la vista principal de
golpe — aunque el siguiente partido sea horas o días después. El usuario pierde acceso rápido al
resultado más fresco durante ese hueco.

**Objetivo:** dar continuidad. Tras la medianoche, mantener visible en la vista principal **solo
el último partido del día** (todos los del último horario) hasta **1 hora antes** del kickoff del
siguiente partido; luego se oculta normalmente. El resto del bloque del día se oculta como hoy.

**Decisiones (AskUserQuestion):**
- Regla = último horario del día más reciente, visible hasta `siguienteKickoff − 1h`.
- "Siguiente partido" = el inmediato; si es TBD (sin fecha) o no hay siguiente, **no hay corte**.
- "Último partido" = **todos** los que comparten el último horario del día (no uno solo).
- Ubicación = bajo su **propio encabezado de día**, arriba de los bloques futuros.

## 2. Business Rules

| ID | Regla | Trazabilidad |
|---|---|---|
| **BR-59.1** | Tras la medianoche local (cuando Unit 30 manda el día anterior a `pastDays`), el **último horario** del día pasado **más reciente** permanece visible en la vista principal hasta `siguienteKickoff − 1h`. | FR-REFINE-59.1 |
| **BR-59.2** | El "último horario" son **todos** los partidos del día más reciente cuyo `kickoffAt` es el máximo de ese día (p. ej. los dos de las 21:00), no un único partido. | FR-REFINE-59.1 |
| **BR-59.3** | El "siguiente partido" es el **menor `kickoffAt` futuro con fecha confirmada** entre `currentDays` (los TBD/`kickoffAt = null` se ignoran). Si no existe ninguno (todos TBD o no quedan partidos), **no hay corte** (`cutoff = null`) y el último horario permanece visible hasta que aparezca una fecha. | FR-REFINE-59.3 |
| **BR-59.4** | El corte usa **timestamps absolutos** (`siguienteKickoff − 1h`), independiente de la timezone. El agrupamiento y la etiqueta del día siguen en timezone local (Unit 42), sin cambios. | FR-REFINE-59.1, FR-REFINE-42.1 |
| **BR-59.5** | Solo persiste el **último horario** del día más reciente; el resto de ese día y los días más antiguos siguen ocultos tras "Ver partidos anteriores" (Unit 30 intacta). | FR-REFINE-59.2 |
| **BR-59.6** | El partido que persiste se muestra bajo el **encabezado de su propio día** (su `dayKey`/`label` reales), arriba de los bloques futuros (`currentDays`). | FR-REFINE-59.1 |
| **BR-59.7** | Sin duplicado: mientras el último horario persiste arriba, se **excluye** del día correspondiente dentro de "Ver partidos anteriores" (que muestra el resto de sus partidos, o se omite si queda vacío). El contador del toggle refleja ese conjunto. | FR-REFINE-59.2 |
| **BR-59.8** | Solo el día pasado **más reciente** es elegible; nunca persiste más de un día. | FR-REFINE-59.2 |
| **BR-59.9** | Con la pestaña abierta, la vista se **re-renderiza en vivo al cruzar la medianoche local** (sin recarga): el tick se alimenta también con la próxima medianoche local (`nextLocalMidnightMs`), de modo que el cambio de día recalcula la partición pasado/actual y hace **aparecer** el último horario en su estado persistente. (Complementa BR-59.1, que ya lo hace **desaparecer** en vivo en el corte.) | FR-REFINE-59.1 |

## 3. Business Logic Model

### BL-59.1: `selectLingeringLastSlot(pastDays, currentDays, now): { lingering, cutoff }`

> Transform puro en `fixture-by-day.ts`, sin acceso al reloj salvo el `now` del llamador
> (proviene de `useKickoffTick`). Reutiliza la partición de Unit 30; no la modifica.

```
if pastDays vacío: return { lingering: null, cutoff: null }

mostRecent = pastDays[last]                       # orden cronológico → más reciente al final
latest = max{ parse(m.kickoffAt) : m in mostRecent.matches, kickoffAt != null }
if latest no finito: return { null, null }
lastSlot = [ m in mostRecent.matches : parse(m.kickoffAt) == latest ]   # BR-59.2

nextKickoff = min{ parse(m.kickoffAt) : m in currentDays.*.matches, kickoffAt != null }  # BR-59.3
cutoff = finite(nextKickoff) ? nextKickoff - 1h : null

if cutoff != null AND now >= cutoff: return { lingering: null, cutoff }   # BR-59.1 (corte pasado)
return { lingering: { ...mostRecent, matches: lastSlot }, cutoff }        # BR-59.5/59.6
```

### BL-59.2: Render en `matches-fixture-view.tsx`

```
{ pastDays, currentDays } = partitionDaysByToday(localDays, today)   # Unit 30, intacto
{ cutoff } = selectLingeringLastSlot(pastDays, currentDays, Date.now())   # cutoff independiente de now
midnight = nextLocalMidnightMs(today, timeZone)                     # BR-59.9: despierta al cambio de día
now = useKickoffTick(cutoff != null ? [midnight, cutoff] : [midnight])   # BR-59.1/59.9
{ lingering } = selectLingeringLastSlot(pastDays, currentDays, now)

pastDaysForToggle = lingering
  ? pastDays con el último día sin sus matches del último horario (omitido si queda vacío)  # BR-59.7
  : pastDays
hasPast / pastMatchesCount derivan de pastDaysForToggle

render: [toggle] → [pastDaysForToggle si showPast] → [lingering] → [currentDays]   # BR-59.6
```

Reutiliza `useKickoffTick` (BL-57.1) — el mismo hook que el lock en vivo de Unit 57 — para que,
con la pestaña abierta, el partido desaparezca solo al llegar `cutoff` sin recarga.

### BL-59.3: `nextLocalMidnightMs(todayKey, timeZone): number` (BR-59.9)

> Transform puro: instante (epoch ms) de la próxima medianoche local. Se deriva del `todayKey`
> (string estable), no del `Date.now()` vivo → **constante dentro del día**, de modo que el `key`
> de `useKickoffTick` no cambia en cada render (evita un loop de re-arme/re-render).

```
[y, m, d] = todayKey.split("-")
guess = Date.UTC(y, m-1, d+1, 0,0,0)          # medianoche del día siguiente como si fuera UTC
offset = (wall-clock de `guess` en tz, leído con formatToParts, reinterpretado como UTC) - guess
return guess - offset                          # corrige para que el reloj local marque 00:00
```

## 4. Contratos / cambios de código

| Archivo | Cambio |
|---|---|
| `src/features/predictions/services/fixture-by-day.ts` | **NEW** `selectLingeringLastSlot` (BL-59.1) + `LINGER_LEAD_MS`; **NEW** `nextLocalMidnightMs` (BL-59.3). `partitionDaysByToday` sin cambios. |
| `src/features/predictions/components/matches-fixture-view.tsx` | Wiring (BL-59.2): import de `selectLingeringLastSlot`, `nextLocalMidnightMs` y `useKickoffTick`; tick alimentado con `[midnight, cutoff]`; lingering renderizado antes de `currentDays`; trim de `pastDaysForToggle`. |
| `src/features/predictions/__tests__/select-lingering-last-slot.test.ts` | **NEW.** 7 casos (último horario múltiple; visible antes / oculto en el corte; TBD y sin siguiente → sin corte; solo el día más reciente; `pastDays` vacío). |
| `src/features/predictions/__tests__/group-fixture-by-day.test.ts` | +4 casos de `nextLocalMidnightMs` (UTC, tz +offset, tz −offset, tz inválida). |

### Sin cambios
- `partitionDaysByToday`, `groupFixtureByDay`, `regroupFixtureDaysByTimeZone` (Unit 30/42).
- Query/caché (`queries.ts`), schema, migraciones, rutas, server actions, i18n.

### Fuera de alcance
- Etiqueta especial tipo "Último resultado" (se reutiliza el encabezado del día).
- Persistir el bloque completo del día (descartado explícitamente por el usuario).

## 5. Security Baseline Compliance

| Regla | Estado | Razón |
|---|---|---|
| Visibilidad de datos | **COMPLIANT** | El último horario ya jugó (kickoff pasado) y ya era visible antes de medianoche; solo se mantiene unas horas más. Sin fuga de predicciones futuras (anti-sesgo de Unit 53 no aplica a partidos pasados). |
| SECURITY (input surface) | **COMPLIANT** | Cambio de presentación client-side; sin schema, migraciones, rutas, server actions ni i18n. |
| Resto | N/A | Transform puro + render. |

## 6. Verificación

- `npx vitest run src/features/predictions/__tests__/select-lingering-last-slot.test.ts` → **7/7**.
- `group-fixture-by-day` cubre `nextLocalMidnightMs` (+4 casos); `partition-days-by-today` intacto.
- `npx tsc --noEmit` 0; Biome limpio; `npm run build` OK.
- Manual en `/matches` con último partido de "ayer" a las 21:00 y siguiente horas/días después:
  antes de `siguiente − 1h` el último horario aparece bajo su fecha, arriba de los bloques
  futuros, sin duplicarse al abrir "Ver partidos anteriores"; tras `siguiente − 1h` desaparece;
  con siguiente TBD / sin siguiente, permanece. Con la pestaña abierta cruzando la medianoche
  (BR-59.9), el partido pasa a su estado persistente **sin recarga**.
