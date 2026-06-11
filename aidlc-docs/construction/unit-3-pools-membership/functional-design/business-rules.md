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
| **BR-3.8** | No se puede unir a un pool **congelado** (`isFrozen`) (US-4.3). |
| **BR-3.9** | Un pool **privado** solo se une por `inviteToken`. Un pool **público** se une desde el directorio o por token (BR-3.15 directorio solo lista públicos). |

## Rol de administrador

| ID | Regla |
|---|---|
| **BR-3.10** | Cada pool tiene **un único owner** (el creador). No hay co-admins (Q5=A). |
| **BR-3.11** | El ownership es **no transferible** en operación normal. La **única** excepción es el borrado de cuenta del owner (BR-3.20, Q9). |
| **BR-3.12** | El owner **no puede abandonar** su pool con "salir". Para dejar de participar antes del congelamiento debe **eliminar** el pool (BR-3.17); durante el torneo el pool permanece (BR-3.19). |

## Expulsar / salir / archivar

| ID | Regla |
|---|---|
| **BR-3.13** | **Expulsar** (US-4.3): solo el **owner**, solo **antes del congelamiento**, y **no a sí mismo**. Elimina la `PoolMembership` del expulsado. |
| **BR-3.14** | **Salir** (Q7): un miembro **no-owner** puede salir **antes del congelamiento**; elimina su membresía. |
| **BR-3.15** | Tras el **congelamiento**, las listas se **congelan**: no hay unir, salir ni expulsar (US-4.3). |
| **BR-3.16** | **Archivar** (F1=A) es un estado **personal** (`PoolMembership.archivedAt`): oculta el pool de la lista activa de *ese* miembro, **no** afecta su membresía ni a otros, y está disponible **en cualquier momento** (incluso congelado). Es reversible (desarchivar). |

## Eliminar pool y ciclo de vida

| ID | Regla |
|---|---|
| **BR-3.17** | **Eliminar pool** (Q8): solo el **owner**, solo **antes del congelamiento**. Elimina el pool y sus membresías (cascade). |
| **BR-3.18** | Tras el congelamiento **no** se puede eliminar el pool. |
| **BR-3.19** | El pool debe **permanecer vivo hasta el final del torneo** una vez congelado (Q9). |

## Congelamiento

| ID | Regla |
|---|---|
| **BR-3.20** | `isFrozen` ⟺ `now() >= getCompetitionLockTime()`. La fuente es Competition Data (Unit 4); en v1 se respalda con `WORLD_CUP_KICKOFF` o config (Q6=A). |
| **BR-3.21** | Si `getCompetitionLockTime()` es `null` (no configurado), el sistema se considera **no congelado**. |

## Borrado de cuenta (integración con Unit 1)

| ID | Regla |
|---|---|
| **BR-3.22** | Al **borrar la cuenta** de un usuario, sus membresías **no-owner** se eliminan. |
| **BR-3.23** | Para cada pool del que es **owner**: si hay otros miembros, debe **transferir el ownership** a un miembro **elegido por él** (la UI lista de **más antiguo a más nuevo**, F2=A) como paso obligatorio del borrado. El pool permanece vivo. |
| **BR-3.24** | Si el owner es el **único miembro** del pool, al borrar la cuenta **se elimina el pool** (F3=A). |
| **BR-3.25** | La transferencia de ownership por borrado de cuenta es válida **incluso tras el congelamiento** (el congelamiento bloquea unir/salir/expulsar/eliminar, no la continuidad del pool). |

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
