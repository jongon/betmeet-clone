# Functional Design — Unit 57: Bloqueo en vivo del formulario de predicción al llegar el kickoff

> Refine post-construcción (2026-06-20) vía `/aidlc:refine`. **Plan presentado y aprobado
> antes de ejecutar.** Refine sobre **Unit 5** (Predictions & Match Locking — BR-5.5/5.6/5.7)
> en la **capa de UI**, y sobre la UI de predicciones de **Unit 41** (predicciones visibles
> en el pool) y **Unit 48** (override por pool). **No reinicia** etapas aprobadas (Units 1–56).

## Traceability

| ID | Source | Description |
|----|--------|-------------|
| FR-REFINE-57.1 | requirements | El formulario de predicción se deshabilita en vivo al alcanzar `kickoffAt`, sin recarga ni intento de guardado. |
| US-57.1 | stories | Como usuario con una pestaña abierta, quiero que el form se bloquee solo cuando el partido empieza, para no rellenar un marcador que será rechazado. |
| BR-5.5 | unit-5 | Una predicción solo puede crearse/editarse antes de que la hora del servidor alcance `match.kickoffAt`. |
| BR-5.6 | unit-5 | El servidor re-lee el estado del partido y la hora del servidor en cada intento de guardado. |
| BR-5.7 | unit-5 | El reloj del cliente, el estado de UI cacheado o un contador no pueden **autorizar** un guardado. |

## 1. Intención del usuario

Auditoría del usuario: *"¿está blindada la app en `/matches` y `/pools` si dejo el navegador
abierto con un formulario de predicción y el partido empieza mientras tanto? ¿Qué pasa si
escribo valores y guardo después de la hora de inicio?"*

**Hallazgo:** la **integridad de datos ya estaba blindada** (Unit 5 + Unit 48):

- Todo guardado (global de `/matches` y override de pool de `/pools`) pasa por la **misma**
  server action `savePrediction`, que re-verifica la elegibilidad con `new Date()` del
  **servidor** antes de cualquier escritura (`getPredictionEligibility` → `KICKOFF_REACHED`),
  cumpliendo BR-5.5/5.6/5.7.
- Defensa en profundidad en BD: trigger `prediction_lock_guard`.

**Brecha (solo UX):** la decisión `canEdit` se calculaba **una sola vez** en el render y no se
re-evaluaba con el tiempo. En `/matches`, `canEdit` venía del servidor y quedaba congelado en
`useState` al montar (`prediction-form.tsx`); en `/pools`, se calculaba en el render con
`new Date(col.kickoffAt) > new Date()` pero **sin** timer que forzara un re-render al llegar el
kickoff. Consecuencia: en una pestaña abierta antes del kickoff, los controles +/− y el botón
Guardar seguían visibles tras el inicio; al pulsar Guardar el servidor lo rebotaba (correcto)
pero la UI confundía.

**Objetivo:** deshabilitar el formulario **en vivo** al alcanzar `kickoffAt`, sin esperar al
rebote del servidor ni a una recarga. El servidor sigue siendo la **única autoridad**; este
cambio solo **refleja** el lock en la UI antes (no lo autoriza).

## 2. Business Rules

| ID | Regla | Trazabilidad |
|---|---|---|
| **BR-57.1** | En el cliente, el formulario de predicción se vuelve **solo-lectura en vivo** cuando el tiempo local alcanza `kickoffAt`, sin interacción del usuario ni recarga de página. | FR-REFINE-57.1 |
| **BR-57.2** | El bloqueo en vivo del cliente es **puramente presentacional**: **no** autoriza ningún guardado. BR-5.7 permanece intacta — la autoridad sigue siendo la re-verificación server-side de `savePrediction` (BR-5.5/5.6). El reloj del cliente solo deshabilita la UI. | BR-5.7, BR-57.1 |
| **BR-57.3** | El temporizado usa un único `setTimeout` agendado al **próximo kickoff relevante** (el menor `kickoffAt` futuro entre los partidos visibles), no un `setInterval`: entre kickoffs no hay nada que refrescar. Al dispararse re-agenda hacia el siguiente. | FR-REFINE-57.1 |
| **BR-57.4** | Aplica a ambas superficies: `/matches` (`prediction-form.tsx`) y `/pools` (celdas editables de la grilla **y** el modal de edición abierto, `pool-predictions-view.tsx`). | FR-REFINE-57.1 |
| **BR-57.5** | Tolerancia a desfase de reloj: si el reloj del cliente va **atrasado** respecto al servidor, el form puede seguir visible unos segundos de más; el guardado igual lo rechaza el servidor (red de seguridad de Unit 5). Nunca se produce el caso inverso peligroso (el cliente **no** habilita nada que el servidor prohíba). | BR-57.2 |
| **BR-57.6** | Un partido con `kickoffAt = null` (knockout TBD) **no** agenda timer y conserva su estado de elegibilidad actual (ya `false` por BR-5.8). | FR-REFINE-57.1 |

## 3. Business Logic Model

### BL-57.1: Hook `useKickoffTick(kickoffTimestamps: number[]): number`

> Tiempo reactivo reutilizable. Devuelve un `now` (epoch ms) que se actualiza exactamente
> cuando se alcanza el próximo kickoff relevante.

```
now = state(Date.now())
key = kickoffTimestamps.join(",")        // re-arma solo cuando cambia el conjunto
effect(on key):
  timestamps = parse(key)
  arm():
    current = Date.now(); setNow(current)
    next = min{ t in timestamps : t > current }     // BR-57.3
    if next no existe: return                        // BR-57.6 (lista vacía / todos pasados)
    delay = min(next - current, 24h)                 // cap anti-overflow; re-arma
    timer = setTimeout(arm, delay)
  arm()
  cleanup: clearTimeout(timer)
```

### BL-57.2: `/matches` — `liveCanEdit`

```
kickoffMs = match.kickoffAt ? parse(match.kickoffAt) : null
now = useKickoffTick(kickoffMs != null ? [kickoffMs] : [])
liveCanEdit = canEdit AND (kickoffMs == null OR now < kickoffMs)   // BR-57.1
isReadOnly = NOT liveCanEdit OR lockedConflict
```

`canEdit` (estado) conserva su semántica previa: arranca del valor server-side y pasa a `false`
ante un rebote del servidor (`setCanEdit(false)`). `liveCanEdit` solo le **añade** la condición
temporal. El resumen de estado (`PredictionStatusSummary`) recibe `liveCanEdit` para mantener
la coherencia del mensaje.

### BL-57.3: `/pools` — celdas y modal

```
futureKickoffMs = matches.map(kickoffAt → parse).filter(finite)   // memoizado
now = useKickoffTick(futureKickoffMs)                              // a nivel del componente raíz

# por celda (MatchCard recibe `now` como prop):
canEdit = isViewer AND col.matchStatus == "SCHEDULED"
          AND col.kickoffAt != null AND now < parse(col.kickoffAt)  // BR-57.1, BR-57.4

# modal abierto:
modalEditable = editingMatch.kickoffAt != null AND now < parse(editingMatch.kickoffAt)
# si NOT modalEditable: PredictionScoreControls disabled + botones Guardar disabled
#                       + aviso t.kickoffReachedModal                // BR-57.4
```

## 4. Contratos / cambios de código

| Archivo | Cambio |
|---|---|
| `src/features/predictions/hooks/use-kickoff-tick.ts` | **NEW.** Hook `useKickoffTick` (BL-57.1). |
| `src/features/predictions/hooks/__tests__/use-kickoff-tick.test.ts` | **NEW.** 4 casos (now en mount; despierta al kickoff; ignora kickoffs pasados; despierta al más cercano de varios) con fake timers. |
| `src/features/predictions/components/prediction-form.tsx` | `liveCanEdit` (BL-57.2); `isReadOnly` deriva de `liveCanEdit`; `showPenaltySelector` y `PredictionStatusSummary` usan `liveCanEdit`. |
| `src/features/pools/components/pool-predictions-view.tsx` | `now = useKickoffTick(futureKickoffMs)`; `MatchCard` recibe prop `now`; `canEdit` por celda usa `now`; `modalEditable` deshabilita controles/botones del modal + aviso. |
| `src/i18n/dictionaries/{es,en}.ts` | Nueva key `pools.predictions.kickoffReachedModal`. |

### Sin cambios (server-side intacto)
- `src/features/predictions/actions/save-prediction.ts`, `services/eligibility.ts`,
  `services/lock.ts`, `queries.ts`: la autoridad de Unit 5 ya era correcta (BR-5.5/5.6/5.7).
- Schema, migraciones, RLS, triggers, rutas, server actions: sin tocar.

### Fuera de alcance
- Sincronizar el reloj del cliente con el del servidor (innecesario: el servidor es la
  autoridad y el desfase solo puede dejar el form visible de más, nunca habilitar de más, BR-57.5).
- Countdown visible hasta el kickoff (mejora futura separada).

## 5. Security Baseline Compliance

| Regla | Estado | Razón |
|---|---|---|
| BR-5.7 (no client-authorized saves) | **COMPLIANT — reforzada** | El bloqueo en vivo es presentacional; la autorización sigue 100% server-side (`savePrediction`). El cliente nunca habilita un guardado que el servidor prohíba (BR-57.2/57.5). |
| SECURITY (input surface) | **COMPLIANT** | No añade superficie de input, schema, migraciones, rutas ni server actions. Solo deshabilita UI antes. |
| Resto | N/A | Cambio de presentación. |

## 6. Verificación

- `pnpm vitest run src/features/predictions/hooks/__tests__/use-kickoff-tick.test.ts` → **4/4** (fake timers).
- Regresión server-side: `src/features/predictions/actions/__tests__/save-prediction.test.ts` → **11/11** (rebote post-kickoff intacto).
- Suites completas: `pnpm vitest run src/features/predictions src/features/pools` → **161/161** (21 archivos).
- `biome check` limpio en los archivos tocados (los errores de `pnpm check` son SVGs de banderas preexistentes, ajenos).
- `pnpm build` (incluye TypeScript) → OK.
- Manual: con un partido a ~30 s del kickoff, dejar la pestaña quieta en `/matches` y
  `/pools/[id]`; al pasar la hora el form pasa a solo-lectura **sin** interacción ni recarga, y
  el modal del pool deshabilita Guardar con el aviso `kickoffReachedModal`.

> **Nota (Unit 58, 2026-06-20)**: este lock en vivo del formulario se complementa con la actualización de **resultados** en vivo (Supabase Realtime). Mientras `useKickoffTick` deshabilita la edición al llegar el kickoff, `useLiveResults` refresca el marcador/estado de los mismos partidos sin recarga manual. Ver `construction/unit-58-live-results-realtime/functional-design.md`.
