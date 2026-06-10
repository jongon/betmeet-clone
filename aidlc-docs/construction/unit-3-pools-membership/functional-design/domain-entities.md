# Unit 3: Pools and Membership — Domain Entities

> Entidades de dominio del unit. A diferencia de Unit 2, **sí** se persisten tablas nuevas en PostgreSQL (Prisma + migraciones Supabase). Identidad de usuario proviene de `Profile` (Unit 1).

---

## 1. Pool

Grupo donde compiten los usuarios (US-4.1).

| Atributo | Tipo | Descripción |
|---|---|---|
| `id` | uuid (PK) | Identificador del pool. |
| `name` | string (3–60) | Nombre visible. **Único entre pools públicos** (Q3=C); los privados pueden repetir. |
| `type` | enum `PUBLIC` \| `PRIVATE` | Visibilidad (Q1/Q4). |
| `capacity` | int (2–100) | Límite de miembros elegido por el creador (Q2). |
| `inviteToken` | string (único, ~8 chars) | Sirve como **código** y como **link** `/pools/join/{token}` (Q1=A). |
| `ownerId` | uuid (FK → Profile) | Admin/creador. Fuente de verdad de la propiedad. No transferible salvo borrado de cuenta (Q5/Q9). |
| `createdAt` | timestamptz | Creación. |

**Derivados**:
- `memberCount` = nº de `PoolMembership` del pool.
- `isFull` = `memberCount >= capacity`.
- `isFrozen` = `now() >= getCompetitionLockTime()` (ver entidad 3).

**Relaciones**:
- 1 `Pool` → N `PoolMembership` (cascade on delete del pool).
- `ownerId` → `Profile` (Unit 1). El owner **también** tiene una fila `PoolMembership`.

**Constraints**:
- Índice único parcial: `UNIQUE(name) WHERE type = 'PUBLIC'` (BR-3.2).
- `UNIQUE(inviteToken)` (BR-3.4).
- `CHECK(capacity BETWEEN 2 AND 100)` (BR-3.1).

---

## 2. PoolMembership

Pertenencia de un usuario a un pool. Incluye el estado de **archivo personal** (F1).

| Atributo | Tipo | Descripción |
|---|---|---|
| `id` | uuid (PK) | Identificador. |
| `poolId` | uuid (FK → Pool) | Pool al que pertenece. |
| `userId` | uuid (FK → Profile) | Miembro. |
| `joinedAt` | timestamptz | Momento de ingreso. Define el orden "más antiguo → más nuevo" (F2). |
| `archivedAt` | timestamptz \| null | **Archivo personal** del miembro (F1=A): si no es null, el pool se oculta de *su* lista activa sin afectar a nadie más ni a la membresía. Disponible en cualquier momento (incluso congelado). |

**Derivados**:
- `isOwner` = `membership.userId === pool.ownerId` (no hay enum de rol; se deriva del `ownerId`).
- `isArchived` = `archivedAt != null`.

**Constraints**:
- `UNIQUE(poolId, userId)` — una sola membresía por usuario y pool (BR-3.5).
- FK `userId` → `Profile` con borrado gestionado por la lógica de cuenta (ver BL-9), no `ON DELETE CASCADE` ciego (el borrado del owner exige transferir, no cascada).

---

## 3. CompetitionLock (interfaz, no tabla nueva en Unit 3)

Fuente del **congelamiento**: el kickoff del primer partido del Mundial (US-4.3). Dato propio de Competition Data (Unit 4).

| Concepto | Tipo | Descripción |
|---|---|---|
| `getCompetitionLockTime()` | `() => Date \| null` | Devuelve el instante de congelamiento. Unit 4 lo implementará con datos reales. En v1 de Unit 3 se respalda con `WORLD_CUP_KICKOFF` (env) o una fila de configuración (Q6=A). |

- Mientras `getCompetitionLockTime()` sea `null` (no configurado), se considera **no congelado** (desarrollo).
- Es una **interfaz de integración**, no una tabla que Unit 3 cree.

---

## Diagrama de relaciones

```
Profile (Unit 1) ──1:N── PoolMembership ──N:1── Pool
      │                                            │
      └────────────────── ownerId ────────────────┘  (1 owner por pool)

Pool.isFrozen ← getCompetitionLockTime()  (interfaz → Unit 4)
```

## Mapeo a la interfaz `PoolPreviewItem` (Unit 2)

La query del directorio público alimenta `src/features/pools/types.ts`:

| `PoolPreviewItem` | Origen |
|---|---|
| `id` | `Pool.id` |
| `name` | `Pool.name` |
| `memberCount` | derivado |
| `capacity` | `Pool.capacity` |
| `isPublic` | `Pool.type === 'PUBLIC'` |
