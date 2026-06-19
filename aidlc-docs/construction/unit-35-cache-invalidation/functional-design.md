# Unit 35 — Invalidacion inmediata de cache tras mutaciones admin (Functional Design, light)

> **⚠️ Corregido por Unit 52 (2026-06-19).** Esta unidad eligió `updateTag` como mecanismo de invalidación. En Next.js 16 `updateTag` es **Server-Action-only** y lanza `E872` cuando se llama desde un **Route Handler** (el cron de sync de Unit 50/51), por lo que la invalidación del fixture nunca llegaba a ejecutarse por el camino automático y `/matches` quedaba stale hasta vencer la ventana `revalidate: 300` (síntoma de doble refresh). La política vigente usa **`revalidateTag(tag, "max")`** (válido en Server Actions y Route Handlers). Donde abajo se lea "`updateTag`", entiéndase `revalidateTag(tag, "max")`. Ver `construction/unit-52-cache-invalidation-next16-fix/functional-design.md` y BR-52.1.

**Tipo**: refine post-construccion sobre Unit 7 (Admin), Unit 31 (revert override), Unit 22/27 (performance/cache) y Unit 6 (scoring/rankings).  
**No reinicia** Units 1-34. Sin schema, migraciones, rutas nuevas, auth ni cambios al algoritmo de scoring.  
**Añadida via** AI-DLC refine (2026-06-17).

## 1. Problema / Causa raiz

Despues de `forceMatchResult`, `revertMatchOverride` o `triggerSync`, las paginas de usuario pueden ver fixture/rankings obsoletos en la siguiente navegacion y solo quedar actualizadas tras un segundo refresh.

La causa funcional es que las acciones admin invalidan tags con semantica stale-while-revalidate (`revalidateTag(tag, "max")`). Esa politica permite servir una respuesta stale mientras Next.js refresca el cache en background. Para mutaciones admin explicitas de resultados, el comportamiento de negocio esperado es consistencia inmediata: el siguiente request de usuario debe leer el resultado y los puntos ya recalculados.

## 2. Alcance funcional

### Mutaciones cubiertas

| Accion admin | Motivo de invalidacion |
|---|---|
| `forceMatchResult()` | Cambia marcador/ganador, marca override manual y ejecuta scoring. |
| `revertMatchOverride()` | Limpia resultado manual, vuelve el partido a no-scoreable y elimina puntos del match. |
| `triggerSync()` | Puede cambiar fixture, estados, marcadores, resultados y puntajes derivados. |

### Vistas afectadas

| Vista | Dato stale observado o posible |
|---|---|
| `/matches` | Estado/marcador del fixture y disponibilidad visual del partido. |
| `/rankings` | Ranking global calculado desde `PredictionScore`. |
| `/pools` | Resumen/listado de ligas que puede depender de agregados visibles al usuario. |
| `/pools/[id]` | Detalle de liga y leaderboard embebido/adyacente. |
| `/pools/[id]/leaderboard` | Ranking de liga calculado desde scores. |
| `/admin` y `/admin/matches` | Refresco operativo para que el admin vea el resultado/sync recien aplicado. |

## 3. Politica de invalidacion compartida

Crear una unica politica funcional para acciones admin que mutan resultados o scoring:

1. Expirar inmediatamente el cache tagged de fixture (`COMPETITION_FIXTURE_TAG`) con `updateTag`.
2. Expirar inmediatamente el cache tagged de rankings (`RANKINGS_TAG`) con `updateTag`.
3. Revalidar rutas de usuario dependientes con `revalidatePath`.
4. Revalidar rutas admin relevantes para mantener feedback operativo consistente.
5. Mantener la autorizacion admin existente en cada accion; el helper de invalidacion no decide permisos.

La politica debe vivir como helper compartido en la capa admin para evitar que `force-result`, `revert-override` y `trigger-sync` diverjan con el tiempo.

## 4. Reglas de negocio

| ID | Regla |
|---|---|
| BR-35.1 | Toda mutacion admin que cambie resultados o puntajes debe invalidar fixture y rankings con semantica inmediata, no stale-while-revalidate. |
| BR-35.2 | La invalidacion se ejecuta despues de que la mutacion y el recalculo de puntajes terminan correctamente. |
| BR-35.3 | Si la mutacion falla, no se debe presentar una invalidacion como exito funcional; se conserva el manejo de error existente de cada accion. |
| BR-35.4 | El helper compartido debe cubrir `forceMatchResult`, `revertMatchOverride` y `triggerSync`. |
| BR-35.5 | Las rutas dinamicas de pools deben revalidarse por patron (`/pools/[id]`, `/pools/[id]/leaderboard`) para cubrir cualquier liga afectada por el match. |
| BR-35.6 | La politica no cambia el calculo de puntos, el modelo de datos ni el contrato de UI; solo cambia frescura de lectura tras writes admin. |

## 5. Contratos funcionales

### Entrada

No hay nuevo input de usuario. Las acciones existentes conservan sus parametros y validaciones:

- `forceMatchResult` conserva match, score, penalty winner y reason.
- `revertMatchOverride` conserva match/revert target actual.
- `triggerSync` conserva scope/provider actual.

### Salida esperada

Despues de una respuesta exitosa de cualquiera de las acciones cubiertas:

- `/matches` debe leer el fixture/resultados actualizados en la siguiente navegacion/refresco normal.
- `/rankings` debe leer el ranking global actualizado en la siguiente navegacion/refresco normal.
- Las vistas de liga deben leer rankings/puntajes actualizados en la siguiente navegacion/refresco normal.
- El admin no necesita repetir la accion ni forzar doble refresh para ver feedback coherente.

## 6. Fuera de alcance

- No se agrega cache nuevo.
- No se cachea el leaderboard de pool en esta unidad.
- No se modifica scoring matematico ni desempates.
- No se agregan migraciones, tablas, columnas, rutas, cron jobs ni storage.
- No se toca `src/features/competition/components/match-card.tsx`, marcado como cambio no relacionado del worktree.

## 7. Verificacion de diseno

La Code Generation planificada debe cubrir:

- Tests del helper compartido para tags y paths esperados.
- Tests de `force-result`, `revert-override` y `trigger-sync` que verifiquen uso de invalidacion inmediata.
- `pnpm exec tsc --noEmit`.
- Biome/ESLint sobre archivos de `src` tocados.

## 8. Security Baseline Compliance

| Regla | Estado | Razon |
|---|---|---|
| SECURITY-08 | Compliant | Las acciones admin existentes conservan `getAdminUserId()`/guards server-side; el helper no expone una nueva ruta ni omite autorizacion. |
| SECURITY-13 | Compliant | Cambios criticos siguen auditados por las acciones existentes; la unidad no elimina logs ni auditoria. |
| SECURITY-03 | N/A | No se agregan logs ni datos sensibles. |
| SECURITY-05 | N/A | No hay nuevo input ni endpoints. |
| SECURITY-01/02/04/06/07/09/10/11/12/14/15 | N/A | No hay cambios de infraestructura, auth, headers, dependencias, red ni manejo externo de errores. |

No hay hallazgos bloqueantes.
