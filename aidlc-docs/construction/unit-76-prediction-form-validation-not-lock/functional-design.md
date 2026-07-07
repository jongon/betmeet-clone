# Functional Design — Unit 76: El error de validación de la predicción ya no bloquea el formulario en `/matches`

> Refine post-construcción (2026-07-07) vía `/aidlc:refine`. **Plan presentado y aprobado
> antes de ejecutar.** Refine sobre la **capa de UI de Unit 5** (Predictions & Match Locking,
> `prediction-form.tsx`) y sobre el contrato de la server action `savePrediction`, en
> continuación de **Unit 57** (bloqueo en vivo del formulario al llegar el kickoff). **No
> reinicia** etapas aprobadas (Units 1–75).

## Traceability

| ID | Source | Description |
|----|--------|-------------|
| FR-REFINE-76.1 | requirements | En `/matches`, un error **recuperable** al guardar una predicción (p. ej. empate en fase de eliminación sin elegir quién avanza por penales) muestra el mensaje pero **mantiene el formulario editable** para corregirlo inline, sin recargar la pantalla. |
| US-76.1 | stories | Como usuario que predice en `/matches`, cuando mi predicción es inválida quiero ver el error y **corregirla ahí mismo** (elegir el ganador por penales y volver a guardar), sin tener que reiniciar la pantalla. |
| BR-5.5 | unit-5 | Una predicción solo puede crearse/editarse antes de que la hora del servidor alcance `match.kickoffAt`. |
| BR-5.7 | unit-5 | El reloj del cliente, el estado de UI cacheado o un contador no pueden **autorizar** un guardado. |
| BR-57.1 | unit-57 | En el cliente, el formulario se vuelve solo-lectura en vivo al alcanzar `kickoffAt`. |

## 1. Intención del usuario

Reporte del usuario: *"En `/matches`, cuando hago una predicción de empate y no selecciono un
ganador pero le doy a guardar predicción, da un error. Ese error está bien, pero para corregir
la predicción tengo que reiniciar la pantalla. No lo puedo corregir directamente ahí."*

**Contexto.** En un partido de fase de eliminación, un marcador empatado exige elegir quién
avanza por penales (`validatePredictionInput`, BL-5.2: *"En fase de eliminación con empate,
debes elegir quién avanza por penales."*). El error en sí es **correcto y deseado** — el usuario
lo confirma. El defecto es de **UX de recuperación**: tras el error el formulario queda
inutilizable y obliga a recargar.

**Causa raíz (solo UI).** En `prediction-form.tsx`, `handleSave()` trataba **cualquier**
resultado no-`success` de `savePrediction` como un **conflicto de bloqueo** (kickoff alcanzado):

```
if ("success" in result) { … return; }
// Lock conflict: the server rejected the save
setLockedConflict(true);      // ← se activa para TODO error
setError(result.error);
setCanEdit(false);            // ← congela la edición
```

Como `isReadOnly = NOT liveCanEdit OR lockedConflict` (Unit 57, BL-57.2), al fallar la
**validación** el formulario pasaba a **solo-lectura**: desaparecían los controles +/−, el
`PenaltyWinnerSelector` (que es justo lo que faltaba rellenar) y el botón Guardar. Sin superficie
editable, la única salida era recargar. La causa de fondo es que `savePrediction` devolvía la
**misma forma** `{ error: string }` para dos situaciones distintas:

- **Conflicto de elegibilidad real** (kickoff alcanzado / partido cerrado): el form **sí** debe
  pasar a solo-lectura — ya no se puede editar.
- **Error recuperable** (validación, no-miembro de la liga, fallo transitorio): el usuario
  **puede y debe** corregir inline; el form no debería bloquearse.

**Objetivo.** Distinguir ambos casos y bloquear el formulario **solo** ante un conflicto de
elegibilidad real. El error de validación se mantiene visible (BR-76.5) pero la edición sigue
disponible para corregir y reintentar sin recargar.

## 2. Business Rules

| ID | Regla | Trazabilidad |
|---|---|---|
| **BR-76.1** | `savePrediction` marca con `locked: true` **solo** las ramas de conflicto de elegibilidad reales (`!eligibility.editable`: kickoff alcanzado, con o sin predicción previa). Los demás errores (validación de `validatePredictionInput`, no-miembro de la liga, `parsed` de Zod, catch transitorio) **no** llevan la marca. | FR-REFINE-76.1 |
| **BR-76.2** | En el cliente (`prediction-form.tsx`), el formulario pasa a **solo-lectura** ante un error **solo si** `result.locked === true`. Ante cualquier otro error se **muestra el mensaje inline y el formulario permanece editable**, conservando marcador, `PenaltyWinnerSelector` y botón Guardar para corregir y reintentar. | FR-REFINE-76.1 |
| **BR-76.3** | El cambio es **puramente presentacional/UX**. BR-5.5/5.7 permanecen intactas: la autoridad sigue 100% server-side (`getPredictionEligibility` con la hora del servidor + trigger `prediction_lock_guard`). `locked` **solo** indica a la UI cómo presentar el error; **no** autoriza ni deniega ninguna escritura. | BR-5.7, BR-76.1 |
| **BR-76.4** | Alcance: **solo `/matches`** (`prediction-form.tsx`). El modal de `/pools` (`pool-predictions-view.tsx`) ya trataba los errores con `toast.error` dejando el modal abierto y editable; el campo opcional `locked` es retrocompatible y no lo afecta. | FR-REFINE-76.1 |
| **BR-76.5** | El mensaje de error **se sigue mostrando** siempre (el usuario confirmó que el error "está bien"). El `data-testid="prediction-lock-conflict"` se conserva **solo** para el conflicto de bloqueo real (`lockedConflict === true`); un error recuperable renderiza el mismo `<p>` sin ese testid. | FR-REFINE-76.1 |
| **BR-76.6** | Tras corregir (elegir el ganador por penales) y volver a guardar con éxito, el flujo existente aplica sin cambios: se actualiza `savedPrediction`, el botón pasa a "Actualizar" y el resumen/estado reflejan la predicción guardada. | FR-REFINE-76.1 |
| **BR-76.7** | **Prevención proactiva**: cuando el `PenaltyWinnerSelector` está visible (empate en fase de eliminación editable) y aún **no** hay ganador elegido (`penaltyWinner === null`), el botón "Guardar" se **deshabilita** (`needsPenaltyWinner`), de modo que la predicción nunca llega a rechazarse por ese motivo. La validación server-side (`savePrediction` → `validatePredictionInput`) permanece como red de seguridad; BR-76.2 sigue cubriendo cualquier otro error recuperable que sí llegue al servidor. | FR-REFINE-76.1 |

## 3. Business Logic Model

### BL-76.1: `savePrediction` — discriminante `locked`

```
firma: Promise<{ success: true } | { error: string; locked?: true }>

# ramas de conflicto de elegibilidad (NO editable) → añaden locked:
if NOT eligibility.editable:
    if existing:  return { error: "El partido ya no acepta cambios…", locked: true }   # BR-76.1
    else:         return { error: "El partido ya no acepta predicciones…", locked: true }

# el resto de errores NO llevan locked (recuperables):
#   - perfil incompleto / Zod safeParse
#   - no-miembro de la liga
#   - validatePredictionInput (empate knockout sin ganador, marcador fuera de rango, …)
#   - catch transitorio ("No se pudo guardar… Inténtalo de nuevo.")
```

### BL-76.2: `prediction-form.tsx` — reacción al error

```
result = await savePrediction({ … })
setPending(false)

if "success" in result:
    setSavedPrediction({ … }); return                      # BR-76.6

setError(result.error)                                     # BR-76.5 (siempre visible)
if result.locked:                                          # BR-76.2
    setLockedConflict(true)                                #   solo conflicto real
    setCanEdit(false)                                      #   → isReadOnly (BL-57.2)
# else: form sigue editable; showPenaltySelector reaparece porque liveCanEdit
#       sigue true y homeScore === awayScore → el usuario elige y reintenta
```

`isReadOnly = NOT liveCanEdit OR lockedConflict` (Unit 57) no cambia; lo que cambia es **cuándo**
`lockedConflict` se activa. El lock en vivo por kickoff (Unit 57, `liveCanEdit`) sigue intacto.

### BL-76.3: `prediction-form.tsx` — gate del botón Guardar (prevención proactiva)

```
needsPenaltyWinner = Boolean(showPenaltySelector) AND penaltyWinner === null   # BR-76.7
# botón Guardar:
disabled = pending OR needsPenaltyWinner
```

`showPenaltySelector` ya depende de `liveCanEdit AND homeScore === awayScore` (Unit 5/57), así
que el gate solo aplica al caso de empate en knockout editable. Al elegir un equipo,
`penaltyWinner` deja de ser `null` y el botón se habilita.

## 4. Contratos / cambios de código

| Archivo | Cambio |
|---|---|
| `src/features/predictions/actions/save-prediction.ts` | Tipo de retorno `{ success: true } \| { error: string; locked?: true }`; las **dos** ramas de `!eligibility.editable` devuelven `locked: true` (BL-76.1). Resto sin tocar. |
| `src/features/predictions/components/prediction-form.tsx` | `handleSave`: `setError(result.error)` siempre; `setLockedConflict(true)` + `setCanEdit(false)` **solo si** `result.locked` (BL-76.2). Botón "Guardar" `disabled={pending \|\| needsPenaltyWinner}` (BL-76.3). |
| `src/features/predictions/actions/__tests__/save-prediction.test.ts` | +1 caso (empate knockout sin ganador → error de validación **sin** `locked`); refuerzo de los 2 casos de kickoff (`toMatchObject({ locked: true })`) y del caso de validación de rango (`"locked" in result === false`). |

### Sin cambios (server-side de autoridad intacto)
- `services/eligibility.ts`, `services/validation.ts`, `services/lock.ts`, `schemas.ts`,
  `queries.ts`: la lógica de elegibilidad, validación y bloqueo de Unit 5/57 no se toca.
- `pool-predictions-view.tsx`: ya manejaba los errores con `toast` sin bloquear (BR-76.4).
- Schema, migraciones, RLS, triggers, rutas, i18n: sin tocar.

### Fuera de alcance
- Validación en vivo en el cliente del resto de reglas antes del round-trip (marcador fuera de
  rango no ocurre por los controles +/−; el servidor sigue siendo la autoridad de todo lo demás).

## 5. Security Baseline Compliance

| Regla | Estado | Razón |
|---|---|---|
| BR-5.7 (no client-authorized saves) | **COMPLIANT — intacta** | `locked` es solo un discriminante de presentación del error; la autorización sigue 100% server-side (`getPredictionEligibility` + trigger `prediction_lock_guard`). El cliente nunca habilita un guardado que el servidor prohíba. |
| SECURITY (input surface) | **COMPLIANT** | No añade superficie de input, schema, migraciones, rutas ni server actions. Campo de retorno opcional retrocompatible. |
| Resto | N/A | Cambio de presentación/UX de recuperación de error. |

## 6. Verificación

- `pnpm vitest run src/features/predictions/actions/__tests__/save-prediction.test.ts` →
  **12/12** (NEW: empate knockout sin ganador **no** lleva `locked`; kickoff sí lo lleva).
- Regresión suites `src/features/predictions src/features/pools` → sin regresiones nuevas
  (2 fallos **preexistentes y ajenos**: `pool-predictions-view.test.tsx` "defaults to page that
  contains today" es sensible a la fecha —hoy 2026-07-07 vs. junio hardcodeado—, reproduce
  idéntico con los cambios stasheados; `pool-settings-card.test.tsx` requiere `DATABASE_URL`,
  fallo ambiental de import de `prisma`).
- `tsc --noEmit` 0 en los archivos tocados (persisten 2 errores preexistentes de
  `pool-live-now-banner.test.tsx` Unit 61, ajenos). `biome check` limpio (3 archivos).
- Manual: en `/matches`, con un partido de fase de eliminación, poner un empate → aparece el
  `PenaltyWinnerSelector` y el botón "Guardar" queda **deshabilitado** hasta elegir un equipo
  (BR-76.7); al elegir, se habilita y guarda **sin recargar**. Si algún otro error recuperable
  llega al servidor, se muestra el mensaje pero el formulario **sigue editable** (BR-76.2). Un
  partido ya iniciado sigue pasando a solo-lectura (lock real por kickoff, Unit 57).
