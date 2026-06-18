# Code Generation Plan — Unit 45: Permiso configurable de invitación por miembros en pools privados

## Stage

- **Unit**: Unit 45 (refine post-construcción sobre Unit 3, Unit 13, Unit 44)
- **Stage**: Code Generation Part 1 — Planning
- **Created**: 2026-06-18
- **Source of truth**: este plan es la única referencia para Code Generation Part 2. Cualquier desviación debe documentarse explícitamente.
- **Status**: Awaiting explicit approval before Code Generation Part 2

## Unit Context

- **Stories**: US-45.1 (toggle al crear pool privado) + US-45.2 (editar toggle en pool en progreso desde Configuración).
- **Dependencies**: Unit 3 (Pool model + `createPool` + `getPoolDetail` + `getMyPools` + `CreatePoolForm`), Unit 13 (gate de invitación dirigida en `createDirectedInvite`), Unit 44 (FR-REFINE-44.7 superseded por FR-REFINE-45.x).
- **Expected interfaces**: `updatePoolMembersCanInvite(input)` server action + `PoolSettingsCard`/`PoolSettingsCardClient` UI components + `getPoolDetail`/`getMyPools` DTO extendidos.
- **Database entities owned**: 1 columna nueva `pools.members_can_invite BOOLEAN NOT NULL DEFAULT TRUE`.
- **Service boundaries**: Pools feature (Unit 3) absorbe todo el trabajo; notifications/notifications feature intacto.

## Stories Traceability

| Story | Componente | Pasos del plan |
|-------|------------|----------------|
| US-45.1 | `CreatePoolForm` + `createPool` + `CreatePoolSchema` | Step 4, 6, 10 |
| US-45.2 | `PoolSettingsCard`/`PoolSettingsCardClient` + `updatePoolMembersCanInvite` | Step 7, 8, 9 |
| FR-REFINE-45.4 (BR-3.35) | `updatePoolMembersCanInvite` | Step 8 |
| FR-REFINE-45.5 (BR-3.33/3.34) | `createDirectedInvite` (gate ampliado) | Step 9 |
| FR-REFINE-45.5 (DTO) | `getPoolDetail`/`getMyPools` (select) | Step 5 |

## Numbered Steps

Cada paso es ejecutable de forma independiente y se marca `[x]` al completar.

### Step 1 — Schema + Migración Prisma
- [ ] `prisma/schema.prisma`: añadir `membersCanInvite Boolean @default(true) @map("members_can_invite")` al `model Pool` (debajo de `capacity`).
- [ ] Crear `prisma/migrations/20260618010000_unit45_pool_members_can_invite/migration.sql` con `ALTER TABLE "pools" ADD COLUMN "members_can_invite" BOOLEAN NOT NULL DEFAULT TRUE;`
- [ ] Verificar: `pnpm prisma:generate` OK (regenera cliente).

### Step 2 — Auth logger event type
- [ ] `src/lib/auth-logger.ts`: añadir `"pool.settings_changed"` al union `AuthEvent` (junto a `"admin.sync_triggered"`).

### Step 3 — Schemas Zod
- [ ] `src/features/pools/schemas.ts`:
  - `CreatePoolSchema`: añadir `membersCanInvite: z.boolean().default(true)` (al final).
  - Nuevo `UpdatePoolMembersCanInviteSchema = z.object({ poolId: z.string().uuid(), membersCanInvite: z.boolean() })`.
  - Exportar `UpdatePoolMembersCanInviteInput`.

### Step 4 — Types DTO
- [ ] `src/features/pools/types.ts`:
  - `MyPoolSummary`: añadir `membersCanInvite: boolean` (después de `isArchived`).
  - `PoolDetail`: añadir `membersCanInvite: boolean` (después de `isArchived`).

### Step 5 — Queries (select ampliado)
- [ ] `src/features/pools/queries.ts`:
  - `getMyPools`: en el `include.pool.select` añadir `type: true, membersCanInvite: true`. En el map retornar `membersCanInvite: m.pool.membersCanInvite`.
  - `getPoolDetail`: en `prisma.pool.findUnique` reemplazar `include: { memberships: ... }` por `select: { id, name, type, capacity, inviteToken, ownerId, membersCanInvite, memberships: { include: { user: true }, orderBy: { joinedAt: "asc" } } }`. En el return añadir `membersCanInvite: pool.membersCanInvite`.

### Step 6 — createPool (persistencia)
- [ ] `src/features/pools/actions/create-pool.ts`:
  - Ampliar el type del input: `input: { name: string; type: string; capacity: number; membersCanInvite?: boolean }`.
  - Extraer `membersCanInvite` de `parsed.data` (con default `true`).
  - En `prisma.pool.create` añadir `membersCanInvite` al `data`.

### Step 7 — createPoolForm (Switch en form)
- [ ] `src/features/pools/components/create-pool-form.tsx`:
  - State `membersCanInvite` con `useState<boolean>(true)`.
  - Reset a `true` cuando `type` cambia a `"PUBLIC"`.
  - Render condicional del bloque Switch solo si `type === "PRIVATE"`.
  - Pasar `membersCanInvite` al `createPool` en el `submit`.
  - `data-testid="create-pool-members-can-invite"`.

### Step 8 — updatePoolMembersCanInvite server action
- [ ] Crear `src/features/pools/actions/update-pool-members-can-invite.ts`:
  - `"use server"`.
  - `getOnboardedUserId()` → error si falta.
  - `UpdatePoolMembersCanInviteSchema.safeParse(input)` → error si inválido.
  - `prisma.pool.findUnique({ where: { id }, select: { id, ownerId, type } })` → error si no existe.
  - Gate owner: `if (pool.ownerId !== userId) return { error: "Solo el administrador puede cambiar esta configuración" }`.
  - **Guard de `type === "PRIVATE"`** (defense in depth, refine 2026-06-18): `if (pool.type !== "PRIVATE") return { error: "Esta configuración solo aplica a ligas privadas" }`.
  - `prisma.pool.update({ where: { id }, data: { membersCanInvite: parsed.data.membersCanInvite } })`.
  - `logAuthEvent("pool.settings_changed", { userId, poolId, membersCanInvite })`.
  - `revalidatePath("/pools/" + id)`.
  - Return `{ success: true, membersCanInvite }`.

### Step 9 — createDirectedInvite (gate ampliado)
- [ ] `src/features/pools/actions/create-directed-invite.ts`:
  - `prisma.pool.findUnique.select`: añadir `type: true, membersCanInvite: true`.
  - Tras el chequeo `if (!membership)`, añadir el gate ampliado (BR-3.34):
    - Si `pool.ownerId === userId` → continuar (owner siempre puede).
    - Si `pool.ownerId !== userId` y la membership existe:
      - Si `pool.type !== "PRIVATE" || !pool.membersCanInvite` → `return { error: "El administrador no permite que los miembros inviten" }`.
  - Si la membership NO existe, ya tenemos el error actual "Debes ser miembro de la liga para invitar" (regresión preservada).

### Step 10 — PoolSettingsCard (server + client)
- [ ] Crear `src/features/pools/components/pool-settings-card.tsx` (server component):
  - Props: `{ poolId: string; initialMembersCanInvite: boolean }`.
  - Renderiza `<PoolSettingsCardClient poolId={poolId} initialMembersCanInvite={initialMembersCanInvite} />`.
- [ ] Crear `src/features/pools/components/pool-settings-card-client.tsx` (client component):
  - `"use client"`.
  - Imports: `useState`, `useTransition` de react; `toast` de sonner; `FormError`; `Switch`; `useDictionary`; `updatePoolMembersCanInvite`.
  - State: `checked` (init `initialMembersCanInvite`), `error`, `pending` (useTransition).
  - `handleChange(next)`: optimistically `setChecked(next)`, `startTransition` → `updatePoolMembersCanInvite`; en éxito `toast.success(t.settings.saved)`; en error `setError(result.error)` + `setChecked(previous)`.
  - `data-testid="pool-settings-card"`, `data-testid="pool-settings-members-can-invite-switch"`.
  - `aria-label={t.settings.membersCanInvite}`.

### Step 11 — PoolDetailPage (gate UI + mount SettingsCard)
- [ ] `src/app/(app)/pools/[id]/page.tsx`:
  - Render condicional del `<InviteShare>` y del `<DirectedInviteForm>` (mismo gate `canInvite`):
    - Si `pool.isOwner || (pool.type === "PRIVATE" && pool.membersCanInvite)` → renderizar `<InviteShare token={pool.inviteToken} />` y `<DirectedInviteForm poolId={pool.id} />`.
    - Else → `<p className="text-sm text-muted-foreground">{t.invite.membersBlockedHint}</p>` (no se muestra ni el form ni el token/link).
  - Render del `<PoolSettingsCard>` solo si `pool.isOwner && pool.type === "PRIVATE"`:
    - `<PoolSettingsCard poolId={pool.id} initialMembersCanInvite={pool.membersCanInvite} />`.

> **Post-implementation refinement (2026-06-18, refine del usuario)**: el `PoolSettingsCard` se restringe además a `pool.type === "PRIVATE"` (los PUBLIC no usan el toggle). El `<InviteShare>` se une al mismo gate que el `DirectedInviteForm` (BR-45.7): si un miembro no-owner no puede invitar, tampoco debe ver el token/link/código de invitación. El server action `updatePoolMembersCanInvite` añade un guard defensivo: rechaza con `"Esta configuración solo aplica a ligas privadas"` si el pool es `PUBLIC`. Ver `aidlc-docs/audit.md` entrada "Post-Unit-45 — Fix PUBLIC pool gating".

### Step 12 — i18n dictionaries (ES + EN)
- [ ] `src/i18n/dictionaries/es.ts` (en `pools: { ... }`):
  - Renombrar `invite: "Invitación"` (string, ~línea 370) a `invitationTitle: "Invitación"`.
  - Añadir `invite: { membersBlockedHint: "Solo el administrador puede invitar en esta liga." }` (objeto anidado).
  - Añadir `membersCanInvite: "Los miembros pueden invitar"` y `membersCanInviteDescription: "Permite que los miembros no administradores inviten a otros usuarios."`.
  - Añadir `settings: { title: "Configuración", subtitle: "Opciones de la liga que solo tú puedes cambiar.", membersCanInvite: "Los miembros pueden invitar", membersCanInviteDescription: "Si lo desactivas, solo tú podrás invitar a otros jugadores.", saved: "Configuración guardada" }`.
- [ ] `src/i18n/dictionaries/en.ts` (en `pools: { ...es.pools, ... }`):
  - Renombrar el override de `invite` (string, ~línea 374) a `invitationTitle: "Invitation"`.
  - Añadir override de `invite: { membersBlockedHint: "Only the administrator can invite in this league." }`.
  - Añadir overrides de `membersCanInvite: "Members can invite"` y `membersCanInviteDescription: "Allow non-admin members to invite other users."`.
  - Añadir override de `settings: { title: "Settings", subtitle: "League options that only you can change.", membersCanInvite: "Members can invite", membersCanInviteDescription: "If you turn this off, only you can invite other players.", saved: "Settings saved" }`.

### Step 13 — Actualizar referencias a `t.invite` (string)
- [ ] `src/features/pools/components/invite-share.tsx`: línea 26, cambiar `{t.invite}` → `{t.invitationTitle}`.
- [ ] `src/app/(app)/pools/join/[token]/page.tsx`: línea 21, cambiar `{dictionary.pools.invite}` → `{dictionary.pools.invitationTitle}`.

### Step 14 — Tests (5 archivos)
- [ ] Crear `src/features/pools/actions/__tests__/update-pool-members-can-invite.test.ts` (NEW, ~9 casos):
  - Owner cambia true → false, persiste y emite `pool.settings_changed` log.
  - Owner cambia false → true, persiste y emite log.
  - No-owner recibe "Solo el administrador puede cambiar esta configuración".
  - Pool inexistente retorna "Liga no encontrada".
  - Usuario sin onboarding recibe error.
  - Input con `poolId` no UUID retorna error de validación.
  - Input con `membersCanInvite` no booleano retorna error de validación.
  - `revalidatePath` se llama con `/pools/{id}`.
  - **(refine 2026-06-18)** Pool `PUBLIC` (incluso siendo owner) recibe "Esta configuración solo aplica a ligas privadas" — NO persiste ni loguea.
- [ ] Crear `src/features/pools/actions/__tests__/create-pool.test.ts` (NEW, ~4 casos):
  - Crear pool `PRIVATE` con `membersCanInvite: false` persiste el flag.
  - Crear pool `PRIVATE` sin `membersCanInvite` (no enviado) persiste `true` (default Zod).
  - Crear pool `PUBLIC` con `membersCanInvite: false` (forzado) persiste `true` (default Zod en server).
  - Validación: input sin `membersCanInvite` y type `PRIVATE` no falla.
- [ ] Modificar `src/features/pools/actions/__tests__/create-directed-invite.test.ts` (~3 casos nuevos):
  - Owner puede invitar siempre, sin importar `membersCanInvite: false`.
  - Miembro no-owner puede invitar si `PRIVATE && membersCanInvite: true` (caso por defecto — ya existe, ajustar mock).
  - Miembro no-owner recibe error "El administrador no permite que los miembros inviten" si `PRIVATE && membersCanInvite: false`.
  - Miembro no-owner recibe error de membresía si no es miembro (regresión preservada — ya existe).
  - Ajustar mocks de `prisma.pool.findUnique` para incluir `type: "PRIVATE"` y `membersCanInvite: true/false` según el caso.
- [ ] Crear `src/features/pools/components/__tests__/create-pool-form.test.tsx` (NEW, ~4 casos):
  - Switch visible solo si `type === "PRIVATE"`.
  - Default `true` al cargar.
  - Al cambiar `type` de `PRIVATE` a `PUBLIC`, Switch se oculta y `membersCanInvite` se resetea a `true`.
  - El valor se envía en el `submit()` (verificar mock de `createPool`).
- [ ] Crear `src/features/pools/components/__tests__/pool-settings-card.test.tsx` (NEW, ~5 casos):
  - Renderiza el Switch con `initialMembersCanInvite`.
  - Click en Switch dispara `updatePoolMembersCanInvite` y refleja estado optimistamente.
  - En éxito: toast `settings.saved` aparece; Switch queda en el nuevo valor.
  - En error: `FormError` con el mensaje; Switch revierte al valor anterior.
  - Durante `pending`: Switch deshabilitado.

### Step 15 — Verificación
- [ ] `pnpm exec tsc --noEmit` — 0 errores.
- [ ] `pnpm exec biome check src/features/pools/ src/app/(app)/pools/[id]/page.tsx src/app/(app)/pools/join/[token]/page.tsx src/i18n/dictionaries/ src/lib/auth-logger.ts prisma/schema.prisma` — limpio.
- [ ] `pnpm exec eslint <mismos archivos>` — limpio.
- [ ] `pnpm exec vitest run src/features/pools/` — full + focused verde.
- [ ] `pnpm test` — full suite verde.
- [ ] `pnpm build` — OK.

## Files Summary

- **Modified (8)**: `prisma/schema.prisma`, `src/lib/auth-logger.ts`, `src/features/pools/schemas.ts`, `src/features/pools/types.ts`, `src/features/pools/queries.ts`, `src/features/pools/actions/create-pool.ts`, `src/features/pools/actions/create-directed-invite.ts`, `src/features/pools/components/create-pool-form.tsx`, `src/app/(app)/pools/[id]/page.tsx`, `src/i18n/dictionaries/es.ts`, `src/i18n/dictionaries/en.ts`, `src/features/pools/components/invite-share.tsx`, `src/features/pools/actions/__tests__/create-directed-invite.test.ts`.
- **Created (8)**: `prisma/migrations/20260618010000_unit45_pool_members_can_invite/migration.sql`, `src/features/pools/actions/update-pool-members-can-invite.ts`, `src/features/pools/components/pool-settings-card.tsx`, `src/features/pools/components/pool-settings-card-client.tsx`, `src/features/pools/actions/__tests__/update-pool-members-can-invite.test.ts`, `src/features/pools/actions/__tests__/create-pool.test.ts`, `src/features/pools/components/__tests__/create-pool-form.test.tsx`, `src/features/pools/components/__tests__/pool-settings-card.test.tsx`.

## Security Baseline Compliance

| Rule | Status | Rationale |
|------|--------|-----------|
| SECURITY-01 | N/A | `getOnboardedUserId()` exigido en el nuevo server action. |
| SECURITY-05 | COMPLIANT | Todos los inputs validados con Zod (`UpdatePoolMembersCanInviteSchema`, `CreatePoolSchema` ampliado con `membersCanInvite`). |
| SECURITY-08 | COMPLIANT | `updatePoolMembersCanInvite` valida `pool.ownerId === userId` server-side (IDOR prevention). `createDirectedInvite` mantiene su gate ampliado. |
| SECURITY-09 | COMPLIANT | `logAuthEvent("pool.settings_changed", ...)` para auditoría. |

## Approval Gate

Do not execute Code Generation Part 2 until this plan is explicitly approved.
