# Unit 23 — Membresía sin congelamiento (FR-REFINE-23)

> Refine post-construcción (2026-06-15) vía `/aidlc:refine`. Cambio de **regla de
> negocio**. **No reinicia** etapas aprobadas. Cubre la **Épica 22** (US-22.1) y
> deriva de Unit 3 (Pools y Membresía) con efecto sobre las invitaciones dirigidas de
> Unit 10.

## 1. Intención del usuario

Solicitud inicial:
> *"Cuando una competencia empezó un usuario no puede unirse ni ser invitado. Quiero
> remover esa regla. Un usuario puede unirse a un pool/liga privada o pública en
> cualquier momento."*

Tras aclarar qué era el "congelamiento", el usuario confirmó **ampliar el alcance** para
levantar el congelamiento **también de salir, expulsar y eliminar** (respuesta *"Así es,
implementar"*). Resultado final: **ninguna** mutación de membresía se congela por el inicio
de la competición.

## 2. Causa y diagnóstico

Unit 3 introdujo un **gate de congelamiento** (`isFrozen()`, BL-0) respaldado por
`getCompetitionLockTime()` / `WORLD_CUP_KICKOFF`. A partir del kickoff del primer partido,
**toda** mutación de membresía quedaba bloqueada:

- **Unir** desde el directorio (`join-public-pool.ts`, BL-2) y por token/link
  (`join-pool-by-token.ts`, BL-3 — vía de aceptación de **invitaciones dirigidas** de Unit
  10, BR-3.30). Reglas BR-3.8 / BR-3.15.
- **Salir** (`leave-pool.ts`, BL-5 / BR-3.14), **expulsar** (`kick-member.ts`, BL-4 /
  BR-3.13) y **eliminar** la liga (`delete-pool.ts`, BL-7 / BR-3.17 / BR-3.18).

La UI además **ocultaba** los botones y mostraba badges "Congelado" / "Lista congelada".

## 3. Decisión

**Derogar el congelamiento para todas las mutaciones de membresía.** Unir, salir, expulsar
y eliminar quedan permitidos **en cualquier momento**, incluso con la competición en curso.

Se **conservan**:
- Tope de **capacidad** (BR-3.7) y **unicidad** de membresía (BR-3.6).
- Liga **privada solo por token** (BR-3.9).
- Autorización server-side: solo el owner expulsa/elimina; el owner no "sale" (BR-3.12);
  no se puede expulsar a sí mismo (BR-3.28/BR-3.29).

Reglas **derogadas / actualizadas**: BR-3.8 (derogada), BR-3.15 (derogada), BR-3.18
(derogada), BR-3.19 (derogada — la continuidad del pool pasa a criterio del owner),
BR-3.13/BR-3.14/BR-3.17/BR-3.12/BR-3.25 (actualizadas: sin límite de "antes del
congelamiento"). BR-3.20 conserva el servicio `isFrozen` como utilidad no usada para
gating.

### Consecuencia natural (no es un bloqueo)
Las predicciones se bloquean **por partido** al alcanzarse su kickoff (Unit 5). Quien se
une tarde simplemente **no puntúa** los partidos ya cerrados; puede pronosticar los
restantes. Eliminar una liga a mitad de torneo es ahora decisión del **owner** (antes lo
impedía BR-3.19).

> **Nota (Unit 55, 2026-06-20):** esta "consecuencia natural" describía el comportamiento
> esperado, pero el leaderboard del pool (`getPoolLeaderboardRows`) seguía sumando **todos**
> los scores del miembro sin acotar por la fecha de ingreso, así que un miembro que ya venía
> prediciendo en global arrastraba al pool sus puntos previos al ingreso. **Unit 55**
> (BR-55.1) lo corrige: el leaderboard del pool solo cuenta partidos con
> `kickoffAt ≥ PoolMembership.joinedAt`. Ver
> `construction/unit-55-pool-leaderboard-membership-scoped/functional-design.md`.

## 4. Trazabilidad

| Historia | Regla | Antes | Después |
|---|---|---|---|
| US-22.1 | BR-3.8 | Unir bloqueado si `isFrozen` | Derogada: unir permitido siempre |
| US-22.1 | BR-3.15 | Congela unir/salir/expulsar | Derogada: nada se congela |
| US-22.1 | BR-3.13 | Expulsar solo antes del congelamiento | Permitido siempre |
| US-22.1 | BR-3.14 | Salir solo antes del congelamiento | Permitido siempre |
| US-22.1 | BR-3.17/3.18 | Eliminar solo antes del congelamiento | Permitido siempre |
| US-22.1 | BR-3.19 | Pool vivo hasta fin del torneo | Derogada (a criterio del owner) |
| — | BR-3.6/3.7/3.9/3.12/3.28 | Capacidad, unicidad, token, autorización | **Sin cambios** |

## 5. Contratos / cambios de código

| Archivo | Cambio |
|---|---|
| `actions/join-public-pool.ts` | Eliminado el chequeo `isFrozen()` + import. |
| `actions/join-pool-by-token.ts` | Eliminado el chequeo `isFrozen()` + import. |
| `actions/leave-pool.ts` | Eliminado el chequeo `isFrozen()` + import. |
| `actions/kick-member.ts` | Eliminado el chequeo `isFrozen()` + import. |
| `actions/delete-pool.ts` | Eliminado el chequeo `isFrozen()` + import. |
| `types.ts` | Eliminado el campo `isFrozen` de `MyPoolSummary` y `PoolDetail`. |
| `queries.ts` | Dejó de calcular/exponer `isFrozen` (import eliminado). |
| `components/pool-actions.tsx` | Botones **Salir** / **Eliminar** ya no se ocultan por `isFrozen`. |
| `components/member-list.tsx` | `KickButton` ya no se oculta por `isFrozen`. |
| `components/pool-card.tsx` | Eliminado el texto "Lista congelada por inicio del torneo". |
| `app/(app)/pools/[id]/page.tsx` | Eliminado el badge "Congelado". |
| `services/competition-lock.ts` | **Conservado** como utilidad ("¿empezó la competición?"); documentado que ya no gobierna la membresía. |

Sin cambios: `competition/services/competition-lock.ts` (`getCompetitionLockTime` /
`WORLD_CUP_KICKOFF`).

## 6. NFR / Infra

Sin schema, migraciones ni rutas nuevas. Security Baseline intacto: capacidad, unicidad y
autorización server-side (BR-3.28/BR-3.29) no cambian. El servicio de congelamiento se
conserva (con test unitario) por si se reutiliza la noción "competición iniciada".

## 7. Verificación

- `pnpm exec tsc --noEmit` (0 errores).
- Biome / ESLint limpios en los archivos tocados.
- `pnpm exec vitest run`: **187/187 tests**. `join-public-pool.test.ts` limpia el mock de
  `isFrozen` (ya no importado) y añade un caso explícito de ingreso sin gate; el test del
  servicio `competition-lock.test.ts` se conserva (utilidad retenida).
