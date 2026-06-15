# Unit 3: Pools and Membership — Business Logic Model

> Lógica técnico-agnóstica del unit. Algoritmos de creación, ingreso, expulsión, archivo y transferencia, más el gate de congelamiento.

---

## BL-0: Gate de congelamiento (transversal)

```
function isFrozen() -> boolean:
    lockTime = getCompetitionLockTime()      // interfaz → Unit 4 / config v1
    if lockTime == null: return false        // BR-3.21
    return now() >= lockTime                  // BR-3.20
```
**FR-REFINE-23 (Unit 23):** **ninguna** mutación de membresía (unir/salir/expulsar/eliminar)
consulta ya `isFrozen()`. El congelamiento queda **derogado** para todas ellas; se permiten
en cualquier momento. El servicio `isFrozen()`/`getCompetitionLockTime()` se conserva como
utilidad ("¿empezó la competición?") pero no gobierna nada de la membresía.

---

## BL-1: Crear pool (US-4.1)

**Entrada**: `{ name, type, capacity }`, `creatorId`.

```
1. Validar name (3–60), capacity (2–100), type ∈ {PUBLIC, PRIVATE}.   // BR-3.1, BR-3.3
2. Si type == PUBLIC: verificar unicidad de name entre públicos.       // BR-3.2
3. Generar inviteToken único (reintentar si colisiona).                // BR-3.4
4. Crear Pool { ownerId = creatorId, ... } y PoolMembership(creator).  // BR-3.5  (transacción)
5. Devolver pool + token.
```
La creación **no** está sujeta al congelamiento. **El ingreso tampoco** (FR-REFINE-23, Unit 23): se pueden crear pools y unirse a ellos incluso después del inicio de la competición.

---

## BL-2: Unirse desde el directorio público (US-4.2)

**Entrada**: `poolId`, `userId`.
```
1. Cargar pool (debe ser PUBLIC).                          // BR-3.9
   // FR-REFINE-23: SIN gate de congelamiento — el ingreso se permite en cualquier momento.
2. if memberCount >= capacity: rechazar ("pool lleno").    // BR-3.7
3. if ya es miembro: rechazar (idempotente/duplicado).     // BR-3.6
4. Crear PoolMembership(userId). (transacción + chequeo de capacidad atómico)
```

## BL-3: Unirse por token (privado o público)

**Entrada**: `inviteToken`, `userId`.
```
1. Resolver token -> pool (404 si no existe).
2. Mismos chequeos que BL-2 (lleno, duplicado) — SIN congelamiento (FR-REFINE-23).
```
> El paso 5 debe ser **atómico** frente a concurrencia: contar miembros e insertar en una transacción/`SELECT ... FOR UPDATE` o con constraint, para no exceder `capacity` por carreras.

## BL-4: Expulsar miembro (US-4.3)

**Entrada**: `poolId`, `targetUserId`, `actorId`.
```
1. Cargar pool. Verificar actorId == pool.ownerId.    // BR-3.13, BR-3.28
   // FR-REFINE-23: SIN gate de congelamiento.
2. if targetUserId == ownerId: rechazar (no a sí mismo).
3. Eliminar PoolMembership(target).
```

## BL-5: Salir del pool (Q7)

**Entrada**: `poolId`, `userId`.
```
1. Cargar membresía. if userId == ownerId: rechazar (el owner no sale; BR-3.12).
   // FR-REFINE-23: SIN gate de congelamiento.
2. Eliminar PoolMembership(userId).
```

## BL-6: Archivar / desarchivar (F1)

**Entrada**: `poolId`, `userId`, `archived: boolean`.
```
1. Cargar membresía propia.
2. Set archivedAt = archived ? now() : null.    // BR-3.16  (sin gate de congelamiento)
```
No afecta a otros ni a la membresía; solo a la vista personal.

## BL-7: Eliminar pool (Q8)

**Entrada**: `poolId`, `actorId`.
```
1. Verificar actorId == ownerId.                 // BR-3.17, BR-3.28
   // FR-REFINE-23: SIN gate de congelamiento.
2. Eliminar pool (cascade memberships).
```

## BL-8: Directorio público (US-4.2, Q4)

**Entrada**: `{ query?, onlyWithCapacity? , page? }`.
```
SELECT pools WHERE type = 'PUBLIC'
  AND (query is null OR name ILIKE %query%)
  AND (onlyWithCapacity is false OR memberCount < capacity)
ORDER BY createdAt DESC
LIMIT/OFFSET paginado.
```
Proyecta a `PoolPreviewItem` (BR-3.27). Reusado por el `PoolPreview` de la landing de Unit 2.

## BL-9: Transferencia de ownership por borrado de cuenta (Q9/F2/F3) — integración Unit 1

Invocado por el flujo de borrado de cuenta de Unit 1 (`delete-account`). **Punto de integración cross-unit.**

```
on deleteAccount(userId):
    // (a) Membresías no-owner
    eliminar todas las PoolMembership(userId) donde userId != pool.ownerId.   // BR-3.22

    // (b) Pools donde es owner
    for each pool owned by userId:
        otherMembers = members(pool) excluyendo al owner
        if otherMembers vacío:
            eliminar pool (cascade).                                          // BR-3.24 (F3=A)
        else:
            newOwnerId = elegido por el usuario en la UI                       // BR-3.23 (F2=A)
                         (lista ordenada por joinedAt asc: más antiguo→nuevo)
            pool.ownerId = newOwnerId
            eliminar la PoolMembership del owner saliente
    // Válido incluso si isFrozen() (BR-3.25): el pool sigue vivo.
```
**Nota de integración**: la pantalla de borrado de cuenta (Unit 1) debe, **antes** de confirmar, mostrar los pools que el usuario administra y pedir el nuevo owner por cada uno con otros miembros. Unit 3 expone la lógica/acción `transferOwnershipOnAccountDeletion(userId, assignments)`; Unit 1 la invoca.

---

## Flujos de datos (resumen)

| Flujo | Origen | Transformación | Destino |
|---|---|---|---|
| Crear pool | Form | BL-1 (validación + token) | `pools`, `pool_memberships` |
| Unirse | Directorio/Token | BL-2/BL-3 (gate + capacidad) | `pool_memberships` |
| Expulsar/Salir | Acción usuario | BL-4/BL-5 (gate + autorización) | `pool_memberships` |
| Archivar | Acción usuario | BL-6 | `pool_memberships.archivedAt` |
| Directorio | Query | BL-8 | `PoolPreviewItem[]` (landing Unit 2) |
| Borrado de cuenta | Unit 1 | BL-9 (transfer/eliminar) | `pools`, `pool_memberships` |

## Integraciones

| Con | Qué |
|---|---|
| Unit 1 (Profile) | identidad de miembros (nickname/avatar); **borrado de cuenta** invoca BL-9 |
| Unit 4 (Competition Data) | implementa `getCompetitionLockTime()` (v1: config/env) |
| Unit 2 (Landing) | consume `PoolPreviewItem` desde BL-8 |
| Unit 6 (Rankings) | lee membresía para construir leaderboards por pool |
