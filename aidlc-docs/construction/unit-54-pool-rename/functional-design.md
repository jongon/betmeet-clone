# Functional Design — Unit 54: Renombrar pool con confirmación

> Refine post-construcción sobre **Unit 3** (Pools and Membership — entidad `Pool`, autorización por `ownerId`) y **Unit 45** (panel "Configuración" del pool en `/pools/[id]`). **No reinicia** etapas aprobadas (Units 1–53 intactas).

## Traceability

| ID | Source | Description |
|----|--------|-------------|
| FR-REFINE-54.1 | requirements | El dueño puede cambiar el nombre de su liga (trim, 3–60 chars) desde el panel de Configuración; se refleja en `/pools` y `/pools/[id]`. |
| FR-REFINE-54.2 | requirements | El cambio requiere confirmación explícita (diálogo `«viejo» → «nuevo»`) antes de persistir. |
| FR-REFINE-54.3 | requirements | Autorización server-side por `ownerId`; aplica a ligas PUBLIC y PRIVATE. |
| US-54.1 | stories | Cambiar el nombre de mi liga con una confirmación. |

## 1. Contexto

El nombre de la liga (`Pool.name`, `@db.VarChar(60)`) hasta ahora solo se fijaba al crear el pool (`createPool` / `CreatePoolSchema`). No existía forma de editarlo después. El panel de "Configuración" introducido en Unit 45 (`PoolSettingsCard`) está reservado al dueño, pero (tras Unit 47, BR-47.5) solo se renderiza para ligas **PRIVATE** y únicamente contiene el toggle `membersCanInvite`.

Unit 54 añade el renombrado dentro de ese panel y, dado que renombrar aplica a cualquier liga propia, abre el panel a todos los dueños (PUBLIC y PRIVATE), manteniendo el toggle de invitaciones condicionado a PRIVATE.

## 2. Business Rules

### BR-54.1 — Autorización por dueño (server-side)
Solo el dueño (`Pool.ownerId === userId`) puede renombrar la liga. La comprobación ocurre en la server action, tras verificar onboarding (`getOnboardedUserId`, FR-REFINE-16.1) y cargar `{ id, ownerId, name }`. Un no-dueño recibe `"Solo el administrador puede cambiar esta configuración"` (mismo mensaje que `updatePoolMembersCanInvite`, BR-45.4). Análoga a SECURITY-08 (anti-IDOR).

### BR-54.2 — Validación del nombre
El nombre se valida con `RenamePoolSchema`: `z.string().trim().min(3).max(60)`, idéntico a `CreatePoolSchema` y consistente con la columna `Pool.name @db.VarChar(60)`. Mensajes: "El nombre debe tener al menos 3 caracteres" / "El nombre debe tener como máximo 60 caracteres". El `poolId` debe ser un UUID.

### BR-54.3 — Alcance: PUBLIC y PRIVATE
El renombrado aplica a ligas **PUBLIC y PRIVATE** (a diferencia del toggle `membersCanInvite`, que sigue siendo solo PRIVATE, BR-47.5). La action no impone restricción de `type` (de hecho no selecciona `type`). Por ello el `PoolSettingsCard` pasa a renderizarse para cualquier dueño (`pool.isOwner`), y el toggle de invitaciones queda condicionado a `type === "PRIVATE"` dentro del card.

### BR-54.4 — Confirmación obligatoria en la UI
El cambio requiere confirmación explícita antes de invocar la action: al pulsar "Cambiar nombre" se abre un diálogo (`Dialog` controlado, modelado en `confirm-delete-modal.tsx`) que muestra `«nombre actual» → «nombre nuevo»` con acciones Cancelar / Confirmar. La action solo se invoca al Confirmar. El botón "Cambiar nombre" está deshabilitado si el nombre no cambió o quedó vacío tras el trim.

### BR-54.5 — Invalidación e impacto
Tras renombrar: `revalidatePath('/pools/[id]')` (detalle) y `revalidatePath('/pools')` (la lista muestra el nombre). **No** se invalida `RANKINGS_TAG`: el nombre no afecta scoring ni rankings. Se registra `logAuthEvent("pool.settings_changed", { userId, poolId, renamedTo })`. Sin schema, migraciones ni rutas nuevas.

### BR-54.6 — Unicidad del nombre entre pools públicos
El nombre es **único entre pools públicos** (BR-3.2), reforzado por el índice parcial `pools_public_name_unique` (`UNIQUE(name) WHERE type = 'PUBLIC'`, migración `20260611120000_rls_constraints_triggers`; no es un `@@unique` de Prisma). Como Unit 54 permite renombrar pools PUBLIC, `renamePool` replica la defensa de `createPool`: si `pool.type === "PUBLIC"`, hace un **pre-check** `findFirst({ type: "PUBLIC", name, id: { not: poolId } })` y devuelve `"Ya existe una liga pública con ese nombre"` ante colisión; el `prisma.pool.update` va envuelto en `try/catch` como **guardia final** ante carreras (P2002 → mismo mensaje). Los pools **PRIVATE** están exentos (pueden repetir nombre).

## 3. Business Logic

### BL-54.1 — `renamePool(input)`
Calcada de `updatePoolMembersCanInvite`:
1. `userId = await getOnboardedUserId()`; si `null` → `{ error: "Completa tu perfil para cambiar la configuración." }`.
2. `RenamePoolSchema.safeParse(input)`; si falla → `{ error: <primer issue> }` (BR-54.2).
3. `prisma.pool.findUnique({ where: { id }, select: { id, ownerId, name } })`; si `null` → `{ error: "Liga no encontrada" }`.
4. Guard `pool.ownerId !== userId` → `{ error: "Solo el administrador puede cambiar esta configuración" }` (BR-54.1). **Sin** guard de `type` que bloquee el renombrado (BR-54.3).
5. Si `pool.type === "PUBLIC"`: pre-check `findFirst({ type: "PUBLIC", name, id: { not: id } })` → si choca, `{ error: "Ya existe una liga pública con ese nombre" }` (BR-54.6).
6. `try { prisma.pool.update({ where: { id }, data: { name } }) } catch { return { error: "Ya existe una liga pública con ese nombre" } }` (guardia final P2002, BR-54.6).
7. `logAuthEvent("pool.settings_changed", { userId, poolId, renamedTo: name })`.
8. `revalidatePath('/pools/${id}')` + `revalidatePath('/pools')` (BR-54.5).
9. `return { success: true, name }`.

El `findUnique` selecciona `{ id, ownerId, name, type }` (se necesita `type` para el pre-check).

## 4. Frontend

- **`pool-settings-card-client.tsx`**: nueva sección de renombrado (Input con el nombre + botón "Cambiar nombre") sobre el toggle. El botón abre un `Dialog` de confirmación `«viejo» → «nuevo»` (Cancelar/Confirmar). Al confirmar: `useTransition` → `renamePool({ poolId, name })`; en éxito `toast.success(renameSaved)`, actualiza el estado local del nombre y cierra el diálogo; en error muestra `<FormError>` y mantiene el diálogo abierto. El toggle `membersCanInvite` se condiciona a `poolType === "PRIVATE"`. Nuevas props: `poolType`, `initialName`.
- **`pool-settings-card.tsx`** (wrapper server): propaga `poolType` e `initialName`.
- **`/pools/[id]/page.tsx`**: gate del card de `pool.isOwner && pool.type === "PRIVATE"` → `pool.isOwner`; pasa `poolType={pool.type}` e `initialName={pool.name}`.

## 5. i18n

Nuevas claves bajo `pools.settings` en `es.ts` y `en.ts`: `renameLabel`, `renameDescription`, `renameButton`, `renameConfirmTitle`, `renameConfirmBody`, `renameConfirm`, `renameCancel`, `renameSaved`.

## 6. Archivos

| Archivo | Cambio |
|---|---|
| `src/features/pools/schemas.ts` | `RenamePoolSchema` + `RenamePoolInput` |
| `src/features/pools/actions/rename-pool.ts` | nueva action `renamePool` (BL-54.1) |
| `src/features/pools/components/pool-settings-card.tsx` | propaga `poolType` / `initialName` |
| `src/features/pools/components/pool-settings-card-client.tsx` | sección rename + diálogo de confirmación; toggle solo PRIVATE |
| `src/app/(app)/pools/[id]/page.tsx` | gate del card → `isOwner`; nuevas props |
| `src/i18n/dictionaries/es.ts`, `en.ts` | claves `settings.rename*` |
| `src/features/pools/actions/__tests__/rename-pool.test.ts` | tests de la action (auth, validación, owner/no-owner, PUBLIC/PRIVATE, revalidate) |
| `src/features/pools/components/__tests__/pool-settings-card.test.tsx` | +2 tests UI (confirmar rename; botón deshabilitado sin cambio + toggle oculto en PUBLIC) |

## 7. Security Baseline Compliance

| Regla | Estado | Razón |
|---|---|---|
| SECURITY-08 (gates/IDOR) | **COMPLIANT** | Autorización por `ownerId` server-side (BR-54.1); el `poolId` se valida como UUID y la propiedad se reverifica contra la BD. |
| SECURITY-01 (validación de input) | **COMPLIANT** | `RenamePoolSchema` valida y normaliza (trim, 3–60); la action no confía en el cliente. |
| Otros | N/A | Sin nueva ruta, schema, migración ni superficie de datos sensibles. |

## 8. Verification Plan

| Check | Método |
|---|---|
| TypeScript | `npx tsc --noEmit` → 0 |
| Biome / ESLint | limpios en archivos tocados |
| Vitest | action: auth/validación/owner/no-owner/PUBLIC+PRIVATE/revalidate; UI: confirma rename + toasts, botón deshabilitado sin cambio; suite completa verde |
| Manual | dueño renombra liga PRIVATE y PUBLIC con confirmación; Cancelar no cambia nada; nombre <3/>60 da error; no-dueño no ve el panel |

## 9. Out of Scope

- Historial/auditoría del cambio de nombre más allá de `logAuthEvent`.
- Renombrar otros campos del pool (tipo, capacidad).
- Notificar a los miembros del cambio de nombre.
