# Functional Design (Light) — Unit 47: Extensión del permiso de invitación a pools públicos

## Stage

- **Unit**: Unit 47, refine post-construcción sobre Unit 45 (Permiso de invitación por miembros)
- **Stage**: Functional Design — COMPLETE / Approval Gate
- **Created**: 2026-06-18
- **Status**: Awaiting explicit approval before Code Generation Part 1

## Context

Unit 45 introdujo el toggle `Pool.membersCanInvite` con `DEFAULT TRUE`, pero restringió su uso a pools `PRIVATE`. Los pools `PUBLIC` quedaron sin la capacidad de que sus miembros (no-owner) inviten a otros: solo el owner puede invitar.

Unit 47 **extiende** el comportamiento para que el toggle aplique a **cualquier tipo de pool** (`PUBLIC` y `PRIVATE`), eliminando la restricción `type === "PRIVATE"` de todos los gates y condiciones de renderizado.

**Sin cambios de schema ni migraciones**: la columna `membersCanInvite` ya existe desde Unit 45 en todos los pools.

## Business Logic Model

### Gate de invitación (modificado desde Unit 45)

```
createDirectedInvite({ poolId, target })
    ├─ getOnboardedUserId() → error si no
    ├─ validar input con CreateDirectedInviteSchema
    ├─ buscar pool (select: id, name, inviteToken, ownerId, type, membersCanInvite)
    ├─ [Gate simplificado Unit 47]
    │   ├─ si pool.ownerId === userId → permitir (owner siempre puede)
    │   └─ si no (miembro no-owner):
    │       ├─ verificar PoolMembership → si no, "Debes ser miembro de la liga para invitar"
    │       └─ verificar pool.membersCanInvite === true
    │           ├─ sí → permitir (aplica a PUBLIC y PRIVATE)
    │           └─ no → "El administrador no permite que los miembros inviten"
    ├─ resolveUserByTarget(target) → mismo flujo
    ├─ upsert/create PoolDirectedInvite → mismo flujo
    ├─ queueNotificationEvent → mismo flujo
    └─ revalidatePath + return
```

Cambio clave: se elimina `pool.type !== "PRIVATE"` de la condición del gate. Antes: `pool.type !== "PRIVATE" || !pool.membersCanInvite`. Ahora: `!pool.membersCanInvite`.

### Gate UI en `/pools/[id]/page.tsx` (modificado desde Unit 45)

```
PoolDetailPage renderiza <InviteShare /> y <DirectedInviteForm /> condicionalmente
    └─ condición: pool.isOwner || pool.membersCanInvite
        ├─ true → renderiza <InviteShare token /> + <DirectedInviteForm poolId />
        └─ false → renderiza <p>{t.invite.membersBlockedHint}</p>
```

Cambio clave: se elimina `pool.type === "PRIVATE"` de la condición. El `InviteShare` (token/link) también queda bajo el mismo gate simplificado, no solo el `DirectedInviteForm`.

### PoolSettingsCard (modificado desde Unit 45)

```
PoolDetailPage renderiza <PoolSettingsCard /> condicionalmente
    └─ condición: pool.isOwner
        ├─ true → renderiza <PoolSettingsCard poolId initialMembersCanInvite />
        └─ false → no renderiza
```

Cambio clave: se elimina `pool.type === "PRIVATE"` de la condición. El `PoolSettingsCard` se muestra para owners de cualquier tipo de pool.

### Toggle en CreatePoolForm (modificado desde Unit 45)

```
CreatePoolForm renderiza el Switch "Los miembros pueden invitar"
    └─ condición: siempre visible (ya no depende de type === "PRIVATE")
    └─ default: true
```

Cambio clave: el Switch ya no está condicionado a `type === "PRIVATE"`. Se muestra siempre.

### updatePoolMembersCanInvite (modificado desde Unit 45)

```
updatePoolMembersCanInvite({ poolId, membersCanInvite })
    ├─ validar input (Zod)
    ├─ buscar pool (select: id, ownerId, type)
    ├─ gate owner → si no, error
    ├─ [ELIMINADO] guard pool.type !== "PRIVATE"
    ├─ prisma.pool.update
    ├─ logAuthEvent
    └─ revalidatePath
```

Cambio clave: se elimina el bloque que rechazaba pools `PUBLIC` con "Esta configuración solo aplica a ligas privadas".

## Business Rules

| Rule | Description |
|------|-------------|
| **BR-47.1** | `Pool.membersCanInvite` aplica a todos los tipos de pool (`PUBLIC` y `PRIVATE`). El column default `TRUE` (desde Unit 45) asegura backward-compatibilidad. |
| **BR-47.2** | En `CreatePoolForm`: el Switch "Los miembros pueden invitar" es visible **siempre** (sin importar `type`). Default `true`. |
| **BR-47.3** | En `createDirectedInvite`: gate simplificado a `isOwner \|\| pool.membersCanInvite`. Sin restricción de `type`. Si no-owner y `!membersCanInvite` → error "El administrador no permite que los miembros inviten". |
| **BR-47.4** | En `/pools/[id]/page.tsx`: `<DirectedInviteForm>` y `<InviteShare>` se renderizan si `pool.isOwner \|\| pool.membersCanInvite`. Sin restricción de `type`. |
| **BR-47.5** | `PoolSettingsCard` se renderiza para `pool.isOwner` en cualquier tipo de pool (ya no requiere `type === "PRIVATE"`). |
| **BR-47.6** | `updatePoolMembersCanInvite` acepta cualquier tipo de pool. El gate owner-only se mantiene. Se elimina el guard `pool.type !== "PRIVATE"`. |
| **BR-47.7** | `getPoolDetail` y `getMyPools` ya incluyen `type` y `membersCanInvite` desde Unit 45. Sin cambios adicionales en queries. |
| **BR-47.8** | El `InviteShare` (token/link de invitación) también se oculta bajo el mismo gate simplificado (`isOwner \|\| membersCanInvite`). Si un miembro no-owner no puede invitar, tampoco ve el token. |

## Frontend Components

### Archivos modificados (respecto a Unit 45)

| Archivo | Cambio | Descripción |
|---------|--------|-------------|
| `src/features/pools/actions/create-directed-invite.ts` | MODIFICAR | Eliminar `pool.type !== "PRIVATE" \|\|` de la condición del gate (línea ~90). |
| `src/features/pools/actions/update-pool-members-can-invite.ts` | MODIFICAR | Eliminar el bloque `if (pool.type !== "PRIVATE")` y su mensaje de error (líneas ~39-44). |
| `src/features/pools/components/create-pool-form.tsx` | MODIFICAR | Eliminar `{type === "PRIVATE" && (` wrapper del Switch. El Switch se muestra siempre. Eliminar `setMembersCanInvite(true)` al cambiar a PUBLIC (ya no necesario). |
| `src/app/(app)/pools/[id]/page.tsx` | MODIFICAR | Simplificar `canInvite` a `pool.isOwner \|\| pool.membersCanInvite`. Simplificar render de `PoolSettingsCard` a solo `pool.isOwner`. |
| `src/features/pools/actions/__tests__/create-directed-invite.test.ts` | MODIFICAR | Ajustar casos PUBLIC: non-owner blocked cuando `membersCanInvite=false`, allowed cuando `true`. |
| `src/features/pools/actions/__tests__/update-pool-members-can-invite.test.ts` | MODIFICAR | Eliminar caso "rejects PUBLIC pools". Añadir caso "allows PUBLIC pool update". |
| `src/features/pools/components/__tests__/create-pool-form.test.tsx` | MODIFICAR | Eliminar caso "does NOT show switch for PUBLIC". Añadir caso "shows switch for PUBLIC". |

### Archivos sin cambios

- `prisma/schema.prisma` — sin cambios (columna ya existe desde Unit 45).
- `src/features/pools/schemas.ts` — sin cambios (`membersCanInvite` en `CreatePoolSchema` ya existe).
- `src/features/pools/types.ts` — sin cambios (`membersCanInvite` en DTOs ya existe).
- `src/features/pools/queries.ts` — sin cambios (`type` y `membersCanInvite` ya se seleccionan).
- `src/features/pools/actions/create-pool.ts` — sin cambios (ya persiste `membersCanInvite`).
- `src/features/pools/components/directed-invite-form.tsx` — sin cambios (solo cambia la condición de render en el padre).
- `src/features/pools/components/pool-settings-card.tsx` y `pool-settings-card-client.tsx` — sin cambios (solo cambia la condición de render en el padre).
- `src/features/pools/actions/search-nicknames.ts` — sin cambios.
- `src/i18n/dictionaries/{es,en}.ts` — sin cambios (claves reutilizadas de Unit 45).
- `src/features/notifications/` — sin cambios.

## i18n

Sin nuevas claves. Se reutilizan las claves de Unit 45:
- `pools.membersCanInvite` / `pools.membersCanInviteDescription` (CreatePoolForm)
- `pools.settings.*` (PoolSettingsCard)
- `pools.invite.membersBlockedHint` (mensaje cuando el miembro no puede invitar)

Las descripciones existentes ("Si lo desactivas, solo tú podrás invitar a otros jugadores") son genéricas y aplican a cualquier tipo de pool.

## Out of Scope

- Cambios de schema o migraciones (la columna ya existe).
- Cambios en el flujo de push, `resolveUserByTarget`, `PoolDirectedInvite` ni el campo `inviteToken`.
- Cambios en `kick-member`, `leave-pool`, `join-public-pool`, `join-pool-by-token`.
- Nuevas claves i18n.
- Nuevas rutas.
- Rate limiting adicional.

## Security Baseline Compliance

| Rule | Status | Rationale |
|------|--------|-----------|
| SECURITY-01 | N/A | Sin cambios en autenticación. |
| SECURITY-02 | N/A | Sin datos de pago. |
| SECURITY-03 | N/A | Sin secrets nuevas. |
| SECURITY-04 | N/A | Sin cambios en CSP. |
| SECURITY-05 | **COMPLIANT** | Los server actions ya validan input con Zod desde Unit 45. |
| SECURITY-06 | N/A | Sin operaciones criptográficas. |
| SECURITY-07 | N/A | Sin rate limiting requerido. |
| SECURITY-08 | **COMPLIANT** | `createDirectedInvite` mantiene gate de membresía + `membersCanInvite`. `updatePoolMembersCanInvite` mantiene gate owner-only. |
| SECURITY-09 | **COMPLIANT** | `logAuthEvent` se mantiene desde Unit 45. |
| SECURITY-10 | N/A | Sin dependencias npm nuevas. |
| SECURITY-11 | N/A | Sin cambios en sesiones. |
| SECURITY-12 | N/A | Los payloads de push no cambian. |
| SECURITY-13 | N/A | Sin cambios en CSRF. |
| SECURITY-14 | N/A | Sin data exports. |
| SECURITY-15 | N/A | Sin cambios en backup/recovery. |

## Verification Plan

### `createDirectedInvite` con gate simplificado
- Owner de pool PUBLIC puede invitar siempre (sin importar `membersCanInvite`).
- Owner de pool PRIVATE puede invitar siempre.
- Miembro no-owner de pool PUBLIC con `membersCanInvite: true` puede invitar (antes bloqueado, ahora permitido).
- Miembro no-owner de pool PUBLIC con `membersCanInvite: false` recibe error.
- Miembro no-owner de pool PRIVATE con `membersCanInvite: true` puede invitar (sin cambios).
- Miembro no-owner de pool PRIVATE con `membersCanInvite: false` recibe error (sin cambios).
- No-miembro recibe error "Debes ser miembro de la liga para invitar" (sin cambios).

### `updatePoolMembersCanInvite` sin restricción de tipo
- Owner de pool PUBLIC puede cambiar `membersCanInvite` (antes rechazado, ahora permitido).
- Owner de pool PRIVATE puede cambiar `membersCanInvite` (sin cambios).
- No-owner recibe error (sin cambios).
- Pool inexistente retorna error (sin cambios).

### `CreatePoolForm` Switch siempre visible
- Switch visible al crear pool PUBLIC.
- Switch visible al crear pool PRIVATE.
- Default `true` en ambos casos.
- El valor se envía correctamente en `submit()`.

### `PoolDetailPage` gate UI simplificado
- `DirectedInviteForm` e `InviteShare` visibles para owner de cualquier tipo.
- `DirectedInviteForm` e `InviteShare` visibles para miembro no-owner si `membersCanInvite: true` (cualquier tipo).
- `DirectedInviteForm` e `InviteShare` ocultos para miembro no-owner si `membersCanInvite: false` (cualquier tipo).
- `PoolSettingsCard` visible para owner de pool PUBLIC (antes oculto).
- `PoolSettingsCard` visible para owner de pool PRIVATE (sin cambios).
- `PoolSettingsCard` oculto para no-owner (sin cambios).

### Verificación estándar
- `pnpm exec tsc --noEmit` — 0 errores.
- `pnpm exec biome check src/features/pools/ src/app/\(app\)/pools/\[id\]/page.tsx` — limpio.
- `pnpm exec eslint` sobre archivos tocados — limpio.
- `pnpm test` — focused + full suite verde.
- `pnpm build` — OK.

## Artifact Changes After Functional Design Approval

| Artifact | Planned change (Code Gen Part 1) |
|---|---|
| `construction/plans/unit-47-public-pool-invites-permission-code-generation-plan.md` (NEW) | Plan de implementación con pasos: modificar gates, tests, verificación. |
| Application code (workspace root) | 3 acciones modificadas, 2 componentes modificados, 1 page modificada, 3 archivos de test modificados. Sin schema, migraciones ni nuevos archivos. |

## Approval Gate

Do not modify application code until Functional Design is explicitly approved.
