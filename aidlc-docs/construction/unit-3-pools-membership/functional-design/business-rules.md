# Unit 3: Pools and Membership — Business Rules

> Reglas de decisión, validación y restricciones. Identificador `BR-3.x` para trazabilidad.

---

## Creación y configuración de pool

| ID | Regla |
|---|---|
| **BR-3.1** | La capacidad de un pool es un entero entre **2 y 100**, elegido por el creador (Q2). Se valida en cliente y servidor. |
| **BR-3.2** | El nombre es **único entre pools públicos** (índice único parcial `WHERE type='PUBLIC'`). Los pools privados pueden repetir nombre (Q3=C). |
| **BR-3.3** | El nombre tiene 3–60 caracteres tras recortar espacios. |
| **BR-3.4** | Cada pool tiene un `inviteToken` único (~8 caracteres, alfanumérico sin ambigüedades) que funciona como **código** y como **link** `/pools/join/{token}` (Q1=A). |
| **BR-3.5** | El creador del pool es su **owner/admin** y obtiene automáticamente una `PoolMembership`. |

## Membresía

| ID | Regla |
|---|---|
| **BR-3.6** | Un usuario puede pertenecer a **varios** pools, pero a un pool **una sola vez** (`UNIQUE(poolId, userId)`). |
| **BR-3.7** | No se puede unir a un pool **lleno** (`memberCount >= capacity`) (US-4.2). |
| **BR-3.8** | ~~No se puede unir a un pool **congelado** (`isFrozen`).~~ **Derogada por FR-REFINE-23 (Unit 23, 2026-06-15)**: el ingreso a una liga ya **no** está sujeto al congelamiento; un usuario puede unirse (directorio o token) **en cualquier momento**, incluso tras el inicio de la competición. Se conservan capacidad (BR-3.7) y unicidad (BR-3.6). |
| **BR-3.9** | Un pool **privado** solo se une por `inviteToken`. Un pool **público** se une desde el directorio o por token (BR-3.15 directorio solo lista públicos). |

## Rol de administrador

| ID | Regla |
|---|---|
| **BR-3.10** | Cada pool tiene **un único owner** (el creador). No hay co-admins (Q5=A). |
| **BR-3.11** | El ownership es **no transferible** en operación normal. La **única** excepción es el borrado de cuenta del owner (BR-3.20, Q9). |
| **BR-3.12** | El owner **no puede abandonar** su pool con "salir". Para dejar de participar debe **eliminar** el pool (BR-3.17) o transferir el ownership (vía borrado de cuenta). Tras FR-REFINE-23 esto es posible **en cualquier momento** (ya no limitado a "antes del congelamiento"). |
| **BR-3.30** | **Invitación dirigida**: cualquier **miembro** del pool (no solo el owner) puede enviar invitaciones dirigidas por nickname o email. Añadida por FR-REFINE-44.7 (Unit 44, 2026-06-18). La acción `createDirectedInvite` verifica membresía vía `PoolMembership.findUnique`; el owner sigue pudiendo invitar por ser miembro. |

## Expulsar / salir / archivar

| ID | Regla |
|---|---|
| **BR-3.13** | **Expulsar** (US-4.3): solo el **owner** y **no a sí mismo**. Elimina la `PoolMembership` del expulsado. **Actualizada por FR-REFINE-23**: ya **no** está limitada a "antes del congelamiento" — permitida en cualquier momento. |
| **BR-3.14** | **Salir** (Q7): un miembro **no-owner** puede salir; elimina su membresía. **Actualizada por FR-REFINE-23**: ya **no** está limitada a "antes del congelamiento" — permitida en cualquier momento. |
| **BR-3.15** | ~~Tras el **congelamiento**, las listas se **congelan**: no hay unir, salir ni expulsar.~~ **Derogada por FR-REFINE-23 (Unit 23, alcance ampliado 2026-06-15)**: el congelamiento **ya no bloquea ninguna mutación de membresía** (unir, salir, expulsar ni eliminar). Las listas **no** se congelan por el inicio del torneo. |
| **BR-3.16** | **Archivar** (F1=A) es un estado **personal** (`PoolMembership.archivedAt`): oculta el pool de la lista activa de *ese* miembro, **no** afecta su membresía ni a otros, y está disponible **en cualquier momento** (incluso congelado). Es reversible (desarchivar). |

## Eliminar pool y ciclo de vida

| ID | Regla |
|---|---|
| **BR-3.17** | **Eliminar pool** (Q8): solo el **owner**. Elimina el pool y sus membresías (cascade). **Actualizada por FR-REFINE-23**: ya **no** está limitada a "antes del congelamiento" — permitida en cualquier momento. |
| **BR-3.18** | ~~Tras el congelamiento **no** se puede eliminar el pool.~~ **Derogada por FR-REFINE-23**: el owner puede eliminar el pool en cualquier momento. |
| **BR-3.19** | ~~El pool debe **permanecer vivo hasta el final del torneo** una vez congelado (Q9).~~ **Derogada por FR-REFINE-23**: era una consecuencia del congelamiento del borrado; con el congelamiento levantado, la continuidad del pool queda a criterio del **owner** (que puede eliminarlo). |

## Congelamiento

| ID | Regla |
|---|---|
| **BR-3.20** | `isFrozen` ⟺ `now() >= getCompetitionLockTime()`. La fuente es Competition Data (Unit 4); en v1 se respalda con `WORLD_CUP_KICKOFF` o config (Q6=A). **FR-REFINE-23**: el servicio se **conserva** como utilidad ("¿empezó la competición?") pero **ya no gobierna ninguna mutación de membresía**. |
| **BR-3.21** | Si `getCompetitionLockTime()` es `null` (no configurado), el sistema se considera **no congelado**. |

## Borrado de cuenta (integración con Unit 1)

| ID | Regla |
|---|---|
| **BR-3.22** | Al **borrar la cuenta** de un usuario, sus membresías **no-owner** se eliminan. |
| **BR-3.23** | Para cada pool del que es **owner**: si hay otros miembros, debe **transferir el ownership** a un miembro **elegido por él** (la UI lista de **más antiguo a más nuevo**, F2=A) como paso obligatorio del borrado. El pool permanece vivo. |
| **BR-3.24** | Si el owner es el **único miembro** del pool, al borrar la cuenta **se elimina el pool** (F3=A). |
| **BR-3.25** | La transferencia de ownership por borrado de cuenta es válida en cualquier momento. (Con FR-REFINE-23 el congelamiento ya **no** bloquea ninguna mutación de membresía; esta regla deja de ser una excepción al congelamiento y simplemente confirma la continuidad del pool durante el borrado.) |

## Directorio público

| ID | Regla |
|---|---|
| **BR-3.26** | El directorio lista **solo pools públicos** (US-4.2). Búsqueda por **nombre** (texto) y filtro **"con cupo disponible"** (`memberCount < capacity`), orden por más recientes (Q4=A). |
| **BR-3.27** | El directorio alimenta la interfaz `PoolPreviewItem` ya definida en Unit 2 (`src/features/pools/types.ts`). |

## Seguridad / autorización

| ID | Regla |
|---|---|
| **BR-3.28** | Toda mutación verifica ownership/membresía **server-side** (prevención IDOR): solo el owner expulsa/elimina/configura; solo un miembro archiva/sale de su propia membresía. |
| **BR-3.29** | RLS en Supabase protege `pools` y `pool_memberships`; además se valida en Server Actions (consistente con la política de Unit 1). |

## Integración futura con Unit 10 Web Push

| ID | Regla |
|---|---|
| **BR-3.30** | Unit 10 puede agregar invitaciones dirigidas por nickname/email sobre el flujo existente de `inviteToken`. Si se resuelve un usuario destinatario, puede emitir `POOL_INVITE`; el evento es aditivo, deduplicable y no cambia la semántica de tokens/links de invitación aprobada en Unit 3. |
| **BR-3.31** | Los links/códigos de invitación compartidos sin destinatario conocido se mantienen y no generan push, porque no hay receptor autorizado. |
| **BR-3.32** | Invitar por email sin cuenta existente puede crear una invitación pendiente vinculada al email normalizado, pero no genera web push hasta que exista un usuario resuelto. |

## Permiso de invitación por miembros (Unit 45, 2026-06-18)

> Reglas añadidas por Unit 45 sobre Unit 3, Unit 13 y Unit 44. Superseden el comportamiento de `FR-REFINE-44.7` ("cualquier miembro puede invitar") en favor de un toggle controlado por el owner. El default `membersCanInvite = true` mantiene la regla anterior como punto de partida.

| ID | Regla |
|---|---|
| **BR-3.33** | El owner de un pool puede **siempre** invitar, independientemente del valor de `membersCanInvite` o del `type` del pool. Gate server-side: `pool.ownerId === userId` ⇒ permitir sin más checks. El `DirectedInviteForm` siempre se renderiza para el owner. |
| **BR-3.34** | Un miembro **no-owner** puede invitar **solo si** `pool.type === "PRIVATE" && pool.membersCanInvite === true`. En cualquier otro caso (`PUBLIC`, o `PRIVATE` con `membersCanInvite = false`), el server action `createDirectedInvite` retorna error "El administrador no permite que los miembros inviten" y la UI oculta el `DirectedInviteForm` mostrando el hint "Solo el administrador puede invitar en esta liga". |
| **BR-3.35** | El owner puede cambiar el valor de `membersCanInvite` en **cualquier momento** del ciclo de vida del pool, vía server action `updatePoolMembersCanInvite({ poolId, membersCanInvite })`. No hay congelamiento ni ventana de edición restringida. El cambio aplica inmediatamente (revalidación de `/pools/[id]`). La acción registra `logAuthEvent({ type: "POOL_SETTINGS_CHANGED" })` para auditoría ligera. |
| **BR-3.36** | El toggle `membersCanInvite` se muestra en `CreatePoolForm` solo si `type === "PRIVATE"`, con default `true` y label "Los miembros pueden invitar". Se persiste al crear el pool (`Pool.membersCanInvite`). En pools `PUBLIC` el control se oculta (no aplica; la invitación dirigida no se usa en PUBLIC, el directorio es la vía principal). |
