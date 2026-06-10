# Unit 3: Pools and Membership — Code Generation Plan

> Single source of truth para la generación de Unit 3. La generación (Parte 2) ejecuta estos pasos tras tu aprobación.

## Unit Context
- **Workspace root**: `/var/www/html` · **Code location**: `src/` (monolito feature-first).
- **Project type**: Greenfield (Next.js 16, TS, Tailwind v4, shadcn/base-ui, Prisma 7, Supabase).
- **Novedad vs Unit 2**: Unit 3 **sí** crea tablas/migraciones (Pool, PoolMembership).

## Stories
- **US-4.1** Crear pool · **US-4.2** Unirse (directorio/token) · **US-4.3** Expulsar (con congelamiento).

## Dependencias / integraciones
- **Unit 1**: identidad (Profile) para miembros; **modifica** `delete-account.ts` + `confirm-delete-modal.tsx` (transferencia de ownership, BL-9).
- **Unit 4**: `getCompetitionLockTime()` (v1: env `WORLD_CUP_KICKOFF` / config).
- **Unit 2**: cablear `PoolPreview` de la landing a `listPublicPools` (`PoolPreviewItem`).
- **Unit 6**: la membresía servirá de base para rankings (solo se deja el modelo listo).

---

## Generation Steps

### Step 1 — Modelo de datos (Prisma)
- [x] `prisma/schema.prisma`: enum `PoolType { PUBLIC PRIVATE }`; modelos `Pool` y `PoolMembership` (con `archivedAt`), relaciones a `Profile`, índices (`@@unique([poolId,userId])`, unique `inviteToken`, índice de `ownerId`).
- [x] `pnpm prisma:generate`.

### Step 2 — Migración Supabase (DDL + RLS)
- [x] `supabase/migrations/2026061000001x_create_pools.sql` — tablas `pools` y `pool_memberships`, **índice único parcial** `UNIQUE(name) WHERE type='PUBLIC'` (BR-3.2), `CHECK(capacity BETWEEN 2 AND 100)`, FKs.
- [x] Políticas **RLS** (BR-3.28/29): lectura de pools públicos a autenticados; lectura de pool propio (miembro); inserción/actualización/borrado vía Server Actions con validación de ownership; membresías visibles para miembros del pool.

### Step 3 — Tipos y schemas
- [x] `src/features/pools/types.ts` *(ampliar)*: `MyPoolSummary`, `PoolDetail`, `PoolMemberSummary` (no tocar `PoolPreviewItem`).
- [x] `src/features/pools/schemas.ts`: `CreatePoolSchema` (name 3–60, type, capacity 2–100), `JoinByTokenSchema`.

### Step 4 — Servicios
- [x] `src/features/pools/services/invite-token.ts` — generar token único (~8 chars sin caracteres ambiguos).
- [x] `src/features/pools/services/competition-lock.ts` — `getCompetitionLockTime()` (env/config) + `isFrozen()` (BL-0, BR-3.20/21).

### Step 5 — Queries (lectura)
- [x] `src/features/pools/queries.ts` — `getMyPools(userId)` (activos+archivados), `getPoolDetail(poolId, userId)` (autoriza miembro), `listPublicPools({query, onlyWithCapacity, page})` (BL-8 → `PoolPreviewItem`).

### Step 6 — Server Actions (mutaciones BL-1..BL-8)
- [x] `src/features/pools/actions/`: `create-pool.ts` (BL-1), `join-public-pool.ts` (BL-2), `join-pool-by-token.ts` (BL-3), `kick-member.ts` (BL-4), `leave-pool.ts` (BL-5), `set-pool-archived.ts` (BL-6), `delete-pool.ts` (BL-7). Cada una valida autorización + gate de congelamiento + capacidad atómica.

### Step 7 — Integración borrado de cuenta (BL-9) — modifica Unit 1
- [x] `src/features/pools/actions/account-deletion.ts` — `getOwnedPoolsNeedingTransfer(userId)` y `transferOwnershipOnAccountDeletion(userId, assignments)` (transfiere / elimina si unipersonal, BR-3.22..3.25).
- [x] **Modificar** `src/features/auth/actions/delete-account.ts` — invocar la transferencia/limpieza de pools antes del soft-delete.
- [x] **Modificar** `src/features/auth/components/confirm-delete-modal.tsx` — paso de selección de nuevo owner por cada pool administrado con otros miembros (lista más antiguo→nuevo, F2).

### Step 8 — Páginas (App Router)
- [x] `src/app/pools/page.tsx` (mis pools), `new/page.tsx`, `discover/page.tsx`, `[id]/page.tsx`, `join/[token]/page.tsx`.

### Step 9 — Componentes de UI
- [x] `src/features/pools/components/`: `pool-card`, `create-pool-form`, `pool-search-bar`, `pool-directory-list`, `pool-preview-card`, `member-list`, `kick-button`, `invite-share` (copiar link/código + WhatsApp), `pool-actions`, `join-confirm`. `data-testid` estables.

### Step 10 — Cablear landing de Unit 2
- [x] **Modificar** `src/app/page.tsx` / `pool-preview.tsx` — alimentar `PoolPreview` con `listPublicPools` real (estado ready/empty/error).

### Step 11 — Gating de rutas
- [x] **Modificar** `src/proxy.ts` — `/pools` requiere sesión + perfil completo (no público).

### Step 12 — Tests
- [x] `competition-lock` (congelado/no según lockTime), `invite-token` (formato/unicidad), lógica de `create-pool`/`join` (capacidad, duplicado, congelado) y `transferOwnershipOnAccountDeletion` (transfer vs eliminar unipersonal) con Prisma mockeado.

### Step 13 — Documentación
- [x] `aidlc-docs/construction/unit-3-pools-membership/code/generation-summary.md`.

---

## Trazabilidad story → pasos
| Story | Pasos |
|---|---|
| US-4.1 Crear pool | 1, 2, 3, 4, 6, 8, 9 |
| US-4.2 Unirse | 5, 6, 8, 9, 10 |
| US-4.3 Expulsar (+congelamiento) | 4, 6 (kick), 12 |
| Integración borrado de cuenta | 7 |

## Notas
- Modificar **en sitio** los archivos de Unit 1/2 (delete-account, confirm-delete-modal, page.tsx, pool-preview, proxy.ts); nunca duplicar.
- Confirmar librerías externas con **Context7** si se añade alguna (no se prevén nuevas).
- `data-testid` estable; validación Zod compartida cliente/servidor; autorización server-side (BR-3.28).
- Total: **13 pasos**. Migraciones nuevas + 1 feature (`pools`) + 4 modificaciones de integración.
