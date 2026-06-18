# Unit 3: Pools and Membership — Frontend Components

> Pantallas y componentes (Q10=A). Construido sobre los patrones de Unit 1/2 (App Router, Server/Client Components, shadcn/ui + base-ui, Server Actions, i18n tipado). Toda copy vía diccionario.

---

## Mapa de rutas

| Ruta | Acceso | Componente raíz | Estado |
|---|---|---|---|
| `/pools` | Autenticado | `MyPoolsPage` | Nuevo — "mis pools" (activos + archivados) |
| `/pools/new` | Autenticado | `CreatePoolPage` | Nuevo — formulario de creación |
| `/pools/discover` | Autenticado | `PoolDirectoryPage` | Nuevo — directorio público (búsqueda) |
| `/pools/[id]` | Autenticado (miembro) | `PoolDetailPage` | Nuevo — detalle + miembros |
| `/pools/join/[token]` | Autenticado | `JoinByTokenPage` | Nuevo — confirmación de ingreso |

> Todas requieren sesión y perfil completo (gating heredado de Unit 1 vía `proxy.ts`). Hay que añadir `/pools` a las rutas protegidas (no públicas).

---

## 1. MyPoolsPage (`/pools`)

**Tipo**: Server Component (carga `getMyPools(userId)`), con islas cliente para acciones.

```
MyPoolsPage
├── PoolsHeader            (CTA "Crear pool" → /pools/new, "Descubrir" → /pools/discover)
├── PoolList (activos)     (PoolCard[])
└── ArchivedSection        (colapsable; PoolCard[] archivados) — F1
```

### PoolCard
| Prop | Tipo | Descripción |
|---|---|---|
| `pool` | `MyPoolSummary` | id, name, type, memberCount, capacity, isOwner, isArchived (campo `isFrozen` eliminado en FR-REFINE-23) |

- Muestra nombre, tipo, `memberCount/capacity`, badge "Admin" si `isOwner`.
- Menú de acciones según rol: **Archivar/Desarchivar** (siempre), **Salir** (no-owner), **Eliminar** (owner), **Compartir invitación**. (FR-REFINE-23: ya **no** se ocultan por congelamiento.)
- `data-testid="pool-card-{id}"`.

---

## 2. CreatePoolPage (`/pools/new`)

**Tipo**: Client Component con Server Action `createPool`.

### CreatePoolForm
| Campo | Validación (Zod, cliente+servidor) |
|---|---|
| `name` | 3–60 chars; si público, unicidad se valida en servidor (BR-3.2) |
| `type` | `PUBLIC` \| `PRIVATE` (toggle/segmented) |
| `capacity` | entero 2–100 (slider/stepper; sugerencia 20) — BR-3.1 |
| `membersCanInvite` | **(Unit 45, 2026-06-18)** boolean, default `true`, **visible solo si `type === "PRIVATE"`** (BR-3.36). Switch con label "Los miembros pueden invitar". Si `type === "PUBLIC"`, el control se oculta (no aplica). |

- Al crear, redirige a `/pools/[id]` y muestra el `InviteShare`.
- `data-testid`: `create-pool-name`, `create-pool-type`, `create-pool-capacity`, `create-pool-members-can-invite` (solo PRIVATE), `create-pool-submit`.

> **Unit 45 (2026-06-18)**: el `CreatePoolForm` gana un Switch opcional de "Los miembros pueden invitar" cuando el pool es privado. Por default, viene activado (alineado con Unit 44). Ver `construction/unit-45-pool-member-invites-permission/functional-design.md` para el diseño completo del toggle y su edición posterior.

---

## 3. PoolDirectoryPage (`/pools/discover`)

**Tipo**: Server Component (lista inicial) + isla cliente de búsqueda.

```
PoolDirectoryPage
├── PoolSearchBar          (input nombre + toggle "con cupo disponible")  — Q4=A
└── PoolDirectoryList      (PoolPreviewCard[] → join)
```

### PoolSearchBar (cliente)
- Input de texto con debounce (≈400ms) → `listPublicPools({ query, onlyWithCapacity })` (BL-8).
- `data-testid="pool-search-input"`, `pool-search-capacity-toggle`.

### PoolPreviewCard
- Reusa/concuerda con `PoolPreviewItem` (Unit 2). Botón **Unirse** (deshabilitado solo si **lleno**; ya **no** por congelamiento — FR-REFINE-23/Unit 23).
- `data-testid="pool-join-{id}"`.

---

## 4. PoolDetailPage (`/pools/[id]`)

**Tipo**: Server Component (`getPoolDetail`), con islas cliente para acciones de admin.

```
PoolDetailPage   (solo miembros; 403/redirect si no lo es)
├── PoolDetailHeader   (nombre, tipo, memberCount/capacity)  // badge "Congelado" eliminado (FR-REFINE-23)
├── InviteShare        (token: copiar link, copiar código, compartir WhatsApp) — Q1=A
├── DirectedInviteForm (Unit 13/44)  // solo si isOwner || (PRIVATE && membersCanInvite)
│   ├── NicknameAutocomplete dropdown  (Unit 44)
│   └── hint "Solo el administrador puede invitar" si el usuario no puede invitar
├── MemberList         (MemberRow[] con nickname/avatar de Unit 1)
│   └── KickButton      (solo owner, no a sí mismo) — US-4.3  // FR-REFINE-23: sin gate de congelamiento
├── PoolSettingsCard   (Unit 45, solo owner)   // sección "Configuración" con Switch de permiso
└── PoolActions        (Archivar/Desarchivar; Salir; Eliminar según rol)
```

### InviteShare (cliente)
| Acción | Comportamiento |
|---|---|
| Copiar link | `/pools/join/{token}` al portapapeles (`navigator.clipboard`) |
| Copiar código | `{token}` al portapapeles |
| Compartir WhatsApp | `https://wa.me/?text=...` con link + nombre del pool |

- `data-testid`: `invite-copy-link`, `invite-copy-code`, `invite-share-whatsapp`.

> **Unit 44 (2026-06-18)**: `DirectedInviteForm` gana autocompletar de nickname mientras se escribe (dropdown con avatar + `base#discriminator`, debounce ≈250ms, activado a partir de 2 caracteres si no es email). Ver `construction/unit-44-nickname-autocomplete-invite/` para el diseño funcional detallado. Sin cambios en el contrato de `InviteShare` ni en el resto de componentes de Unit 3.

> **Unit 45 (2026-06-18)**: el `DirectedInviteForm` ahora se renderiza condicionalmente. Reglas de visibilidad:
> - `pool.isOwner` → siempre visible (BR-3.33).
> - `pool.type === "PRIVATE" && pool.membersCanInvite === true` → visible para el miembro no-owner (BR-3.34).
> - En otro caso → no se renderiza; en su lugar se muestra el hint `pools.invite.membersBlockedHint` ("Solo el administrador puede invitar en esta liga").

### PoolSettingsCard (Unit 45) — visible solo para el owner

Sección "Configuración" dentro de `/pools/[id]`. Render condicional: `pool.isOwner === true`.

| Elemento | Comportamiento |
|---|---|
| Título | "Configuración" (`pools.settings.title`). |
| Subtítulo | "Opciones de la liga que solo tú puedes cambiar." |
| Switch "Los miembros pueden invitar" | Estado actual: `pool.membersCanInvite` (default `true`). Label: `pools.settings.membersCanInvite`. Descripción: `pools.settings.membersCanInviteDescription`. Al cambiar: `updatePoolMembersCanInvite({ poolId, membersCanInvite })`; mientras `pending` se deshabilita; en éxito → toast (`sonner`) `pools.settings.saved`; en error → `FormError` con el mensaje devuelto. |
| Visibilidad | Solo si `pool.isOwner`. En pools `PUBLIC` se muestra igualmente (aunque el flag no tenga efecto, la UI lo muestra y la acción lo permite; el server action acepta el cambio aunque no afecte el render del `DirectedInviteForm`). |

- `data-testid`: `pool-settings-card`, `pool-settings-members-can-invite-switch`.

> El `PoolSettingsCard` se renderiza al final de la página del pool, después de `PoolActions` y antes del footer. Ver `construction/unit-45-pool-member-invites-permission/functional-design.md` para los contratos completos.

### MemberList / MemberRow
- Muestra avatar + nickname (datos de Unit 1). Badge "Admin" para el owner.
- `KickButton` por fila (solo visible para el owner, oculto en la fila propia). Confirmación modal. (FR-REFINE-23: ya **no** se oculta por congelamiento.)
- `data-testid="member-row-{userId}"`, `member-kick-{userId}"`.

---

## 5. JoinByTokenPage (`/pools/join/[token]`)

**Tipo**: Server Component que resuelve el token + confirmación cliente.

- Muestra nombre/tipo/cupo del pool y botón **Unirse** (`joinPoolByToken`).
- Estados de error: token inválido (404), pool lleno (BR-3.7), ya miembro (redirige a `/pools/[id]`). (FR-REFINE-23: el estado "congelado" ya no aplica al ingreso.)
- `data-testid="join-confirm"`.

---

## 6. Integración con Unit 1 — Borrado de cuenta (BL-9)

La pantalla de **borrado de cuenta** (Unit 1, `security` settings / `ConfirmDeleteModal`) se **extiende**:
- Antes de confirmar, llama a `getOwnedPoolsNeedingTransfer(userId)`.
- Por cada pool con otros miembros, muestra un **selector de nuevo owner** con los miembros **ordenados de más antiguo a más nuevo** (F2=A).
- Pools unipersonales se informan como "se eliminarán" (F3=A).
- Al confirmar, invoca `transferOwnershipOnAccountDeletion(userId, assignments)` (Unit 3) dentro del flujo de borrado.
- `data-testid="delete-account-pool-transfer-{poolId}"`.

> Este es el único archivo de **Unit 1 que Unit 3 modifica**; se hará en sitio durante code generation.

---

## Server Actions / Queries (contratos)

| Acción/Query | Origen | Regla |
|---|---|---|
| `createPool(input)` | CreatePoolForm | BL-1 |
| `listPublicPools({query, onlyWithCapacity, page})` | Directorio / landing | BL-8 |
| `joinPublicPool(poolId)` | PoolPreviewCard | BL-2 |
| `joinPoolByToken(token)` | JoinByTokenPage | BL-3 |
| `kickMember(poolId, userId)` | KickButton | BL-4 |
| `leavePool(poolId)` | PoolActions | BL-5 |
| `setPoolArchived(poolId, archived)` | PoolCard/PoolActions | BL-6 |
| `deletePool(poolId)` | PoolActions | BL-7 |
| `getMyPools(userId)` | MyPoolsPage | — |
| `getPoolDetail(poolId, userId)` | PoolDetailPage | autorización BR-3.28 |
| `getOwnedPoolsNeedingTransfer(userId)` / `transferOwnershipOnAccountDeletion(userId, assignments)` | Unit 1 delete-account | BL-9 |
| `updatePoolMembersCanInvite({ poolId, membersCanInvite })` **(Unit 45)** | PoolSettingsCard | BR-3.35 (owner-only, persiste `Pool.membersCanInvite`, `revalidatePath("/pools/[id]")`) |
| `createPool` modificado **(Unit 45)** | CreatePoolForm | input `membersCanInvite` (default `true`); persiste en creación. |

## Componentes nuevos (orientativo para code generation)

```
src/app/pools/page.tsx, new/page.tsx, discover/page.tsx, [id]/page.tsx, join/[token]/page.tsx
src/features/pools/components/{pool-card,create-pool-form,pool-search-bar,pool-directory-list,
  pool-preview-card,member-list,kick-button,invite-share,pool-actions,join-confirm}.tsx
src/features/pools/actions/*.ts        (server actions de la tabla anterior)
src/features/pools/queries.ts          (getMyPools, getPoolDetail, listPublicPools)
src/features/pools/schemas.ts          (Zod: CreatePoolSchema, etc.)
src/features/pools/services/{invite-token,competition-lock}.ts
src/features/pools/types.ts            (ya existe PoolPreviewItem; se amplía con MyPoolSummary, PoolDetail)
```
