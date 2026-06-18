# Functional Design (Light) — Unit 45: Permiso configurable de invitación por miembros en pools privados

> **Supersede note (2026-06-18)**: Unit 47 extiende el comportamiento de `membersCanInvite` para que aplique también a pools `PUBLIC`. Las siguientes reglas y decisiones de Unit 45 quedan **derogadas** y reemplazadas por Unit 47:
> - BR-45.1: "solo se usa/evalúa en `type = 'PRIVATE'"` → ahora aplica a ambos tipos.
> - BR-45.2: Switch en `CreatePoolForm` solo visible en `PRIVATE` → ahora visible en cualquier tipo.
> - BR-45.6: gate `isOwner || (PRIVATE && membersCanInvite)` → ahora `isOwner || membersCanInvite`.
> - BR-45.7: render condicional con `type === "PRIVATE"` → ahora sin restricción de tipo.
> - BR-45.8: `PoolSettingsCard` solo en PRIVATE → ahora en cualquier tipo.
> - Server action `updatePoolMembersCanInvite`: el guard `pool.type !== "PRIVATE"` queda eliminado.
> El diseño original se conserva como referencia; la implementación final de Unit 47 reemplaza las reglas listadas arriba.

## Stage

- **Unit**: Unit 45, refine post-construcción sobre Unit 3 (Pools), Unit 13 (Invitaciones Refine), Unit 44 (Autocompletar)
- **Stage**: Functional Design — COMPLETE / Approval Gate
- **Created**: 2026-06-18
- **Status**: Awaiting explicit approval before Code Generation Part 1

## Business Logic Model

### Edición del toggle en `/pools/[id]` (US-45.2)

```
Owner abre /pools/[id]
    └─ PoolSettingsCard (server component) recibe poolId + initialMembersCanInvite
        └─ renderiza <PoolSettingsCardClient initialMembersCanInvite={...} />
            └─ cliente ve Switch en estado `initialMembersCanInvite`
                ├─ click en Switch
                │   └─ useTransition + updatePoolMembersCanInvite({ poolId, membersCanInvite })
                │       ├─ éxito → toast (sonner) `pools.settings.saved`; Switch refleja el nuevo estado
                │       └─ error → FormError con el mensaje devuelto; Switch revierte al valor anterior
                └─ pending=true mientras se procesa → Switch disabled (no doble-click)
```

### Toggle al crear el pool (US-45.1)

```
Usuario en /pools/new con type="PRIVATE"
    └─ CreatePoolForm muestra Switch "Los miembros pueden invitar" (default true)
        ├─ submit() → createPool({ name, type, capacity, membersCanInvite })
        │   └─ persistir en `Pool.membersCanInvite` (default true si no se envia)
        └─ cambiar type a PUBLIC → Switch se oculta y resetea a true (no se persiste false en PUBLIC)
```

### Gate de invitación dirigida (BR-3.33, BR-3.34)

```
Usuario X intenta invitar a un usuario Y en pool P
    └─ createDirectedInvite({ poolId, target })
        ├─ getOnboardedUserId() → error si no
        ├─ validar input con CreateDirectedInviteSchema
        ├─ buscar pool (select: id, name, inviteToken, ownerId, type, membersCanInvite)
        ├─ [Gate ampliado Unit 45]
        │   ├─ si pool.ownerId === userId → permitir (BR-3.33, owner siempre puede)
        │   └─ si no (miembro no-owner):
        │       ├─ verificar PoolMembership → si no, "Debes ser miembro de la liga para invitar"
        │       └─ verificar pool.type === "PRIVATE" && pool.membersCanInvite === true
        │           ├─ sí → permitir (BR-3.34)
        │           └─ no → "El administrador no permite que los miembros inviten"
        ├─ resolveUserByTarget(target) → mismo flujo
        ├─ upsert/create PoolDirectedInvite → mismo flujo
        ├─ queueNotificationEvent → mismo flujo (solo si destinatario resuelto)
        └─ revalidatePath + return
```

### Gate UI en `/pools/[id]/page.tsx` (BR-3.33, BR-3.34)

```
PoolDetailPage renderiza <DirectedInviteForm /> condicionalmente
    └─ condición: pool.isOwner || (pool.type === "PRIVATE" && pool.membersCanInvite === true)
        ├─ true → renderiza <DirectedInviteForm poolId={pool.id} />
        └─ false → renderiza <p>{t.invite.membersBlockedHint}</p> ("Solo el administrador puede invitar")
```

## Domain Entities

### `UpdatePoolMembersCanInviteSchema` (Zod)

```typescript
/** Update pool membersCanInvite flag (FR-REFINE-45.4, BR-3.35). */
export const UpdatePoolMembersCanInviteSchema = z.object({
  poolId: z.string().uuid(),
  membersCanInvite: z.boolean(),
});

export type UpdatePoolMembersCanInviteInput = z.infer<typeof UpdatePoolMembersCanInviteSchema>;
```

### `CreatePoolSchema` (modificado)

```typescript
/** Pool creation input (US-4.1, BR-3.1/BR-3.3/BR-3.36). */
export const CreatePoolSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "El nombre debe tener al menos 3 caracteres")
    .max(60, "El nombre debe tener como máximo 60 caracteres"),
  type: z.enum(["PUBLIC", "PRIVATE"]),
  capacity: z
    .number()
    .int("La capacidad debe ser un número entero")
    .min(2, "El mínimo es 2 participantes")
    .max(100, "El máximo es 100 participantes"),
  membersCanInvite: z.boolean().default(true), // NUEVO (Unit 45, BR-3.36)
});
```

### `PoolDetail` (modificado)

```typescript
/** Full pool detail for the pool page. */
export interface PoolDetail {
  id: string;
  name: string;
  type: PoolType;
  capacity: number;
  memberCount: number;
  inviteToken: string;
  isOwner: boolean;
  isArchived: boolean;
  membersCanInvite: boolean; // NUEVO (Unit 45, FR-REFINE-45.5)
  members: PoolMemberSummary[];
}
```

### `MyPoolSummary` (modificado)

```typescript
/** A pool as shown in the current user's "my pools" list. */
export interface MyPoolSummary {
  id: string;
  name: string;
  type: PoolType;
  memberCount: number;
  capacity: number;
  isOwner: boolean;
  isArchived: boolean;
  membersCanInvite: boolean; // NUEVO (Unit 45, FR-REFINE-45.5)
}
```

## Business Rules

| Rule | Description |
|------|-------------|
| **BR-45.1** | `Pool.membersCanInvite` es `boolean NOT NULL DEFAULT TRUE`. Existe en todos los pools (PUBLIC y PRIVATE) pero solo se usa/evalúa en `type = "PRIVATE"`. |
| **BR-45.2** | En `CreatePoolForm`: el Switch "Los miembros pueden invitar" es visible **solo si** `type === "PRIVATE"`. Default `true`. Si el usuario cambia `type` a `PUBLIC`, el Switch se oculta y el valor se resetea a `true` (no se persiste `false` en PUBLIC). |
| **BR-45.3** | En `createPool`: el input `membersCanInvite` se persiste en `Pool.create({ ..., membersCanInvite })`. Si no se envía, se usa el default del schema (`true`). |
| **BR-45.4** | En `updatePoolMembersCanInvite({ poolId, membersCanInvite })`: (a) exige `getOnboardedUserId()`; (b) busca pool con `select: { id, ownerId }`; (c) si `pool.ownerId !== userId` → error "Solo el administrador puede cambiar esta configuración"; (d) `prisma.pool.update`; (e) `revalidatePath("/pools/"+id)`; (f) `logAuthEvent({ type: "POOL_SETTINGS_CHANGED", poolId: id, membersCanInvite })`; (g) `return { success: true, membersCanInvite }`. |
| **BR-45.5** | El cambio del toggle se aplica inmediatamente. No hay congelamiento ni ventana de edición restringida (consistente con FR-REFINE-23). El owner puede alternar el toggle cuantas veces quiera. |
| **BR-45.6** | En `createDirectedInvite`: gate ampliado final = `isOwner || (pool.type === "PRIVATE" && pool.membersCanInvite === true)`. Si no-owner y la condición falla → error "El administrador no permite que los miembros inviten". El `pool.findUnique` debe seleccionar `{ id, name, inviteToken, ownerId, type, membersCanInvite }`. |
| **BR-45.7** | En `/pools/[id]/page.tsx`: el `<DirectedInviteForm>` y el `<InviteShare>` (token/link/código) se renderizan condicionalmente según `pool.isOwner || (pool.type === "PRIVATE" && pool.membersCanInvite)`. Si la condición es `false`, se oculta también el `InviteShare` y se renderiza `<p>{t.invite.membersBlockedHint}</p>` en su lugar. Razonamiento: el invite token/link es un mecanismo de invitación; si el owner ha restringido el permiso de invitar para un miembro no-owner, ese miembro no debe tener acceso al token/link tampoco. |
| **BR-45.8** | El `PoolSettingsCard` se renderiza en `/pools/[id]` solo si `pool.isOwner === true && pool.type === "PRIVATE"`. En pools `PUBLIC` la tarjeta no se muestra (el toggle no aplica: los públicos no usan invitación dirigida, el directorio es la vía principal). La sección se titula `pools.settings.title` ("Configuración") y contiene el Switch descrito en BR-45.2 con descripción. |
| **BR-45.9** | `getPoolDetail` y `getMyPools` deben seleccionar `type` y `membersCanInvite` en sus queries Prisma para alimentar la UI y los gates. |

## Frontend Components

### `PoolSettingsCard` (NUEVO, server component)

**Path**: `src/features/pools/components/pool-settings-card.tsx`

```typescript
import { PoolSettingsCardClient } from "./pool-settings-card-client";

interface PoolSettingsCardProps {
  poolId: string;
  initialMembersCanInvite: boolean;
}

export function PoolSettingsCard({ poolId, initialMembersCanInvite }: PoolSettingsCardProps) {
  return <PoolSettingsCardClient poolId={poolId} initialMembersCanInvite={initialMembersCanInvite} />;
}
```

Razón: separar server y client component. El server component solo pasa props; la lógica interactiva (Switch, transiciones, toast) vive en el cliente.

### `PoolSettingsCardClient` (NUEVO, client component)

**Path**: `src/features/pools/components/pool-settings-card-client.tsx`

```typescript
"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormError } from "@/components/form-error";
import { Switch } from "@/components/ui/switch";
import { useDictionary } from "@/i18n/dictionary-provider";
import { updatePoolMembersCanInvite } from "../actions/update-pool-members-can-invite";

interface Props {
  poolId: string;
  initialMembersCanInvite: boolean;
}

export function PoolSettingsCardClient({ poolId, initialMembersCanInvite }: Props) {
  const t = useDictionary().pools;
  const [checked, setChecked] = useState(initialMembersCanInvite);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleChange(next: boolean) {
    setError(null);
    const previous = checked;
    setChecked(next); // optimistic
    startTransition(async () => {
      const result = await updatePoolMembersCanInvite({ poolId, membersCanInvite: next });
      if (result?.error) {
        setError(result.error);
        setChecked(previous); // rollback
        return;
      }
      toast.success(t.settings.saved);
    });
  }

  return (
    <section
      data-testid="pool-settings-card"
      className="rounded-lg border border-border bg-card p-4 space-y-3"
    >
      <header>
        <h2 className="text-base font-semibold">{t.settings.title}</h2>
        <p className="text-sm text-muted-foreground">{t.settings.subtitle}</p>
      </header>
      <FormError messages={error ? [error] : undefined} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{t.settings.membersCanInvite}</p>
          <p className="text-xs text-muted-foreground">{t.settings.membersCanInviteDescription}</p>
        </div>
        <Switch
          checked={checked}
          onCheckedChange={handleChange}
          disabled={pending}
          data-testid="pool-settings-members-can-invite-switch"
          aria-label={t.settings.membersCanInvite}
        />
      </div>
    </section>
  );
}
```

**Notas**:
- `useTransition` mantiene la UI responsiva mientras se ejecuta el server action.
- `optimistic update` con rollback en error.
- `sonner` para el toast (consistente con el resto de la app).
- `disabled` durante `pending` evita race conditions.
- `aria-label` para accesibilidad (ScreenReaders).

### `updatePoolMembersCanInvite` (NUEVO server action)

**Path**: `src/features/pools/actions/update-pool-members-can-invite.ts`

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { logAuthEvent } from "@/features/auth/services/log-event";
import { getOnboardedUserId } from "@/features/profile/queries";
import { prisma } from "@/lib/prisma";
import { UpdatePoolMembersCanInviteSchema } from "../schemas";

export async function updatePoolMembersCanInvite(input: unknown) {
  // Onboarding mandatory (FR-REFINE-16.1).
  const userId = await getOnboardedUserId();
  if (!userId) return { error: "Completa tu perfil para cambiar la configuración." };

  const parsed = UpdatePoolMembersCanInviteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const pool = await prisma.pool.findUnique({
    where: { id: parsed.data.poolId },
    select: { id: true, ownerId: true, type: true },
  });
  if (!pool) return { error: "Liga no encontrada" };
  if (pool.ownerId !== userId) {
    return { error: "Solo el administrador puede cambiar esta configuración" };
  }
  // El toggle solo aplica a pools PRIVATE. Los PUBLIC no usan invitación
  // dirigida (el directorio es la vía principal), por lo que el flag no tiene
  // efecto. Lo rechazamos para mantener la semántica coherente con la UI.
  if (pool.type !== "PRIVATE") {
    return { error: "Esta configuración solo aplica a ligas privadas" };
  }

  await prisma.pool.update({
    where: { id: pool.id },
    data: { membersCanInvite: parsed.data.membersCanInvite },
  });

  await logAuthEvent({
    type: "POOL_SETTINGS_CHANGED",
    userId,
    poolId: pool.id,
    membersCanInvite: parsed.data.membersCanInvite,
  });

  revalidatePath(`/pools/${pool.id}`);
  return { success: true, membersCanInvite: parsed.data.membersCanInvite };
}
```

**Notas**:
- Validación Zod de input (BR-45.4a).
- Búsqueda mínima del pool (`select: { id, ownerId, type }`) para minimizar data transfer y soportar el guard de `PRIVATE`.
- Gate owner-only server-side (BR-3.35, prevención IDOR).
- Guard de `type === "PRIVATE"` (defense in depth): aunque la UI solo renderiza el `PoolSettingsCard` para `pool.isOwner && pool.type === "PRIVATE"`, el server action rechaza explícitamente si el pool es `PUBLIC` para mantener la coherencia con la UI y prevenir uso por API.
- `logAuthEvent` para auditoría ligera (puede ser opcional si el helper no acepta el campo; ver §i18n/Security).
- `revalidatePath` para que la página refleje el cambio.

### `createPool` (modificado)

**Path**: `src/features/pools/actions/create-pool.ts`

```typescript
export async function createPool(input: { name: string; type: string; capacity: number; membersCanInvite?: boolean }) {
  const parsed = CreatePoolSchema.safeParse(input); // incluye membersCanInvite con default true
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  // ... onboarding check ...
  const { name, type, capacity, membersCanInvite } = parsed.data;
  // ... uniqueness check ...
  // ... inviteToken generation ...

  const pool = await prisma.$transaction(async (tx) => {
    const created = await tx.pool.create({
      data: { name, type, capacity, inviteToken, ownerId: userId, membersCanInvite },
    });
    await tx.poolMembership.create({ data: { poolId: created.id, userId } });
    return created;
  });
  // ... redirect ...
}
```

### `createDirectedInvite` (modificado, gate ampliado)

**Path**: `src/features/pools/actions/create-directed-invite.ts`

Cambios en el bloque de gate (líneas ~68-78 del archivo actual):

```typescript
const pool = await prisma.pool.findUnique({
  where: { id: parsed.data.poolId },
  select: {
    id: true,
    name: true,
    inviteToken: true,
    ownerId: true,
    type: true,
    membersCanInvite: true, // NUEVO (Unit 45)
  },
});
if (!pool) return { error: "Liga no encontrada" };

// Gate ampliado (BR-3.33, BR-3.34, BR-45.6):
if (pool.ownerId !== userId) {
  // Miembro no-owner: verificar membresía Y flag (si es PRIVATE)
  const membership = await prisma.poolMembership.findUnique({
    where: { poolId_userId: { poolId: pool.id, userId } },
    select: { userId: true },
  });
  if (!membership) return { error: "Debes ser miembro de la liga para invitar" };
  if (pool.type !== "PRIVATE" || !pool.membersCanInvite) {
    return { error: "El administrador no permite que los miembros inviten" };
  }
}
// owner → permitido sin más checks
```

### `CreatePoolForm` (modificado)

**Path**: `src/features/pools/components/create-pool-form.tsx`

Adiciones:
1. Nuevo state `membersCanInvite: boolean` (default `true`).
2. Render condicional del `<Switch>` solo si `type === "PRIVATE"` (BR-45.2).
3. Al cambiar `type` de `PRIVATE` a `PUBLIC`, resetear `membersCanInvite` a `true` (no se persiste `false` en PUBLIC).
4. Pasar `membersCanInvite` al `createPool`.

```tsx
const [membersCanInvite, setMembersCanInvite] = useState(true);

function handleTypeChange(next: PoolType) {
  setType(next);
  if (next === "PUBLIC") {
    setMembersCanInvite(true); // reset: PUBLIC no usa el flag
  }
}

function submit() {
  setError(null);
  startTransition(async () => {
    const result = await createPool({ name, type, capacity, membersCanInvite });
    if (result?.error) setError(result.error);
  });
}

// ... en el JSX, después del bloque "capacity":
{type === "PRIVATE" && (
  <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
    <div>
      <Label htmlFor="pool-members-can-invite">{t.membersCanInvite}</Label>
      <p className="text-xs text-muted-foreground">{t.membersCanInviteDescription}</p>
    </div>
    <Switch
      id="pool-members-can-invite"
      checked={membersCanInvite}
      onCheckedChange={setMembersCanInvite}
      data-testid="create-pool-members-can-invite"
    />
  </div>
)}
```

### `PoolDetailPage` (modificado)

**Path**: `src/app/(app)/pools/[id]/page.tsx`

Cambios:
1. Gate UI del `<DirectedInviteForm>` y del `<InviteShare>` (BR-45.7): ambos se renderizan solo si `canInvite` (mismo gate).
2. Render del `<PoolSettingsCard>` solo si `pool.isOwner && pool.type === "PRIVATE"` (BR-45.8).

```tsx
{/* Gate UI: InviteShare + DirectedInviteForm solo si canInvite */}
{canInvite && <InviteShare token={pool.inviteToken} />}
{(pool.isOwner || (pool.type === "PRIVATE" && pool.membersCanInvite)) ? (
  <DirectedInviteForm poolId={pool.id} />
) : (
  <p className="text-sm text-muted-foreground">{t.invite.membersBlockedHint}</p>
)}

{/* Settings card solo para el owner */}
{pool.isOwner && (
  <PoolSettingsCard
    poolId={pool.id}
    initialMembersCanInvite={pool.membersCanInvite}
  />
)}
```

### `getPoolDetail` (modificado)

**Path**: `src/features/pools/queries.ts`

Cambio en el `select` de `prisma.pool.findUnique`:

```typescript
const pool = await prisma.pool.findUnique({
  where: { id: poolId },
  select: {
    id: true,
    name: true,
    type: true,
    capacity: true,
    inviteToken: true,
    ownerId: true,
    membersCanInvite: true, // NUEVO (Unit 45, BR-45.9)
    memberships: {
      include: { user: true },
      orderBy: { joinedAt: "asc" },
    },
  },
});
```

Y en el return, añadir `membersCanInvite: pool.membersCanInvite`.

### `getMyPools` (modificado)

**Path**: `src/features/pools/queries.ts`

```typescript
const memberships = await prisma.poolMembership.findMany({
  where: { userId },
  include: {
    pool: {
      select: {
        id: true,
        name: true,
        type: true,
        capacity: true,
        ownerId: true,
        membersCanInvite: true, // NUEVO (Unit 45, BR-45.9)
        _count: { select: { memberships: true } },
      },
    },
  },
  orderBy: { joinedAt: "desc" },
});

return memberships.map((m) => ({
  // ... existing fields
  membersCanInvite: m.pool.membersCanInvite,
}));
```

### Plan de archivos

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `prisma/schema.prisma` | MODIFICAR | Añadir `membersCanInvite Boolean @default(true)` al `model Pool`. |
| `prisma/migrations/20260618000000_unit45_pool_members_can_invite/` | NUEVO | Migración DDL: `ALTER TABLE pools ADD COLUMN members_can_invite BOOLEAN NOT NULL DEFAULT TRUE`. |
| `src/features/pools/schemas.ts` | MODIFICAR | (1) Añadir `membersCanInvite: z.boolean().default(true)` a `CreatePoolSchema`. (2) Nuevo `UpdatePoolMembersCanInviteSchema` + `UpdatePoolMembersCanInviteInput`. |
| `src/features/pools/types.ts` | MODIFICAR | Añadir `membersCanInvite: boolean` a `PoolDetail` y `MyPoolSummary`. |
| `src/features/pools/queries.ts` | MODIFICAR | `getPoolDetail` y `getMyPools` seleccionan `type` y `membersCanInvite`. |
| `src/features/pools/actions/create-pool.ts` | MODIFICAR | Input con `membersCanInvite`; persiste en `Pool.create`. |
| `src/features/pools/actions/update-pool-members-can-invite.ts` | NUEVO | Server action con validación Zod, gate owner, persistencia, revalidate, log. |
| `src/features/pools/actions/create-directed-invite.ts` | MODIFICAR | Gate ampliado: `isOwner || (PRIVATE && membersCanInvite)`. `select` con `type` y `membersCanInvite`. |
| `src/features/pools/components/create-pool-form.tsx` | MODIFICAR | Switch opcional en `type === "PRIVATE"`. Reset al cambiar a PUBLIC. |
| `src/features/pools/components/pool-settings-card.tsx` | NUEVO | Server component wrapper. |
| `src/features/pools/components/pool-settings-card-client.tsx` | NUEVO | Client component con Switch, useTransition, sonner, FormError. |
| `src/app/(app)/pools/[id]/page.tsx` | MODIFICAR | Gate UI del `DirectedInviteForm` y del `InviteShare` (ambos bajo `canInvite`); mount del `PoolSettingsCard` (solo owner + PRIVATE). |
| `src/i18n/dictionaries/es.ts` | MODIFICAR | Añadir `pools.settings.*` y `pools.invite.membersBlockedHint`. |
| `src/i18n/dictionaries/en.ts` | MODIFICAR | Añadir `pools.settings.*` y `pools.invite.membersBlockedHint`. |
| `src/features/pools/actions/__tests__/update-pool-members-can-invite.test.ts` | NUEVO | Tests del server action. |
| `src/features/pools/actions/__tests__/create-pool.test.ts` | NUEVO | Tests con `membersCanInvite` (default + override). |
| `src/features/pools/actions/__tests__/create-directed-invite.test.ts` | MODIFICAR | Nuevos casos: non-owner blocked cuando `membersCanInvite=false`; non-owner allowed cuando `membersCanInvite=true`. |
| `src/features/pools/components/__tests__/create-pool-form.test.tsx` | NUEVO | Switch visible solo si PRIVATE, default true, reset al cambiar a PUBLIC. |
| `src/features/pools/components/__tests__/pool-settings-card.test.tsx` | NUEVO | Switch refleja valor inicial, optimistic update, toast en éxito, error rollback, disabled mientras pending. |
| `src/features/pools/__tests__/get-pool-detail.test.ts` | NUEVO | DTO expone `type` y `membersCanInvite`. |

### Sin cambios

- `src/features/pools/actions/join-public-pool.ts`, `join-pool-by-token.ts`, `kick-member.ts`, `leave-pool.ts`, `set-pool-archived.ts`, `delete-pool.ts`: no tocan invitaciones.
- `src/features/pools/actions/search-nicknames.ts` (Unit 44): el `nicknameBase` search no cambia.
- `src/features/pools/components/directed-invite-form.tsx` (Unit 44): el dropdown de autocompletar no cambia; solo cambia la condición de render en el padre.
- `src/features/notifications/`: push no cambia.
- Rutas: sin cambios.

## i18n

### Nuevas claves (ES + EN)

| Key | ES | EN |
|---|---|---|
| `pools.membersCanInvite` | "Los miembros pueden invitar" | "Members can invite" |
| `pools.membersCanInviteDescription` | "Permite que los miembros no administradores inviten a otros usuarios." | "Allow non-admin members to invite other users." |
| `pools.settings.title` | "Configuración" | "Settings" |
| `pools.settings.subtitle` | "Opciones de la liga que solo tú puedes cambiar." | "League options that only you can change." |
| `pools.settings.membersCanInvite` | "Los miembros pueden invitar" | "Members can invite" |
| `pools.settings.membersCanInviteDescription` | "Si lo desactivas, solo tú podrás invitar a otros jugadores." | "If you turn this off, only you can invite other players." |
| `pools.settings.saved` | "Configuración guardada" | "Settings saved" |
| `pools.invite.membersBlockedHint` | "Solo el administrador puede invitar en esta liga." | "Only the administrator can invite in this league." |

> **Nota**: `pools.membersCanInvite` y `pools.membersCanInviteDescription` se usan en `CreatePoolForm`. `pools.settings.*` se usan en `PoolSettingsCard`. `pools.invite.membersBlockedHint` se usa en `page.tsx` cuando el miembro no puede invitar. En `en.ts`, las claves se añaden tras el `...es.pools` para evitar duplicación y mantener el patrón actual de override.

## Out of Scope

- Migración de pools existentes con valor explícito `false` (no aplica; la migración es `DEFAULT TRUE`).
- Historial de cambios del toggle (no hay tabla de auditoría; solo `logAuthEvent`).
- Configuración granular por miembro (ej. "este miembro sí, este no"): no soportado. El toggle es global para el pool.
- Configuración por defecto en el directorio de pools públicos (no aplica; los públicos no usan invitación dirigida).
- Restricciones por tipo de partido o fase del torneo (no aplica; el toggle es por pool, no por partido).
- Rate limiting en el toggle (no necesario; server action owner-only, no es explotable).

## Security Baseline Compliance

| Rule | Status | Rationale |
|------|--------|-----------|
| SECURITY-01 | N/A | Sin cambios en autenticación. `getOnboardedUserId()` se exige en los nuevos server actions. |
| SECURITY-02 | N/A | Sin datos de pago. |
| SECURITY-03 | N/A | Sin secrets nuevas. |
| SECURITY-04 | N/A | Sin cambios en CSP. |
| SECURITY-05 | **COMPLIANT** | Todos los server actions validan input con Zod (`UpdatePoolMembersCanInviteSchema`, `CreatePoolSchema` ampliado con `membersCanInvite`). El Switch es client-side; el server action es la fuente de verdad. |
| SECURITY-06 | N/A | Sin operaciones criptográficas. |
| SECURITY-07 | N/A | Sin rate limiting requerido (server action de toggle owner-only; no es explotable). |
| SECURITY-08 | **COMPLIANT** | `updatePoolMembersCanInvite` valida `pool.ownerId === userId` server-side (prevención IDOR). `createDirectedInvite` mantiene su gate ampliado (membresía + flag). `createPool` no expone el flag a usuarios no autenticados. |
| SECURITY-09 | **COMPLIANT** | `logAuthEvent({ type: "POOL_SETTINGS_CHANGED" })` para auditoría ligera. |
| SECURITY-10 | N/A | Sin dependencias npm nuevas. |
| SECURITY-11 | N/A | Sin cambios en sesiones. |
| SECURITY-12 | N/A | Los payloads de push no cambian. |
| SECURITY-13 | N/A | Sin cambios en CSRF. |
| SECURITY-14 | N/A | Sin data exports. |
| SECURITY-15 | N/A | Sin cambios en backup/recovery. |

## Verification Plan

### `updatePoolMembersCanInvite` server action tests
- Owner puede cambiar `membersCanInvite` de `true` a `false` y viceversa.
- No-owner recibe error "Solo el administrador puede cambiar esta configuración".
- Pool inexistente retorna error "Liga no encontrada".
- Usuario sin onboarding completado recibe error.
- Input con `poolId` no UUID retorna error de validación.
- Input con `membersCanInvite` no booleano retorna error de validación.
- Pool `PUBLIC` (incluso siendo owner) recibe error "Esta configuración solo aplica a ligas privadas" — la acción NO persiste ni loguea.
- La acción persiste en BD (`prisma.pool.update` mockeado y verificado).
- `revalidatePath("/pools/[id]")` se llama.
- `logAuthEvent` se llama con tipo `POOL_SETTINGS_CHANGED`.

### `createPool` con flag
- Crear pool `PRIVATE` con `membersCanInvite: false` persiste el flag (`Pool.create` recibe `membersCanInvite: false`).
- Crear pool `PRIVATE` sin `membersCanInvite` (no enviado) persiste `true` (default Zod).
- Crear pool `PUBLIC` con `membersCanInvite: false` (forzado) persiste `true` (el form no envía `false` en PUBLIC; defensivo, en server el default gana).
- Validación: input sin `membersCanInvite` y type `PRIVATE` no falla la validación (default `true`).

### `createDirectedInvite` con flag (Unit 45 supersede de Unit 44)
- Owner puede invitar siempre, sin importar `membersCanInvite` (caso `false`).
- Miembro no-owner puede invitar si `PRIVATE && membersCanInvite: true` (caso por defecto).
- Miembro no-owner recibe error "El administrador no permite que los miembros inviten" si `PRIVATE && membersCanInvite: false`.
- Miembro no-owner recibe error "Debes ser miembro de la liga para invitar" si no es miembro (regresión preservada).
- `PUBLIC`: el flag se ignora en el gate; un no-miembro sigue recibiendo el error de membresía.
- `select` ampliado: `prisma.pool.findUnique` recibe `{ id, name, inviteToken, ownerId, type, membersCanInvite }`.

### `getPoolDetail` DTO
- El DTO expone `type` y `membersCanInvite` con los valores correctos de BD.
- Default `true` se refleja si la query no especifica lo contrario (migración con `DEFAULT TRUE`).

### `getMyPools` DTO
- El DTO expone `membersCanInvite` por pool.

### `CreatePoolForm` (client)
- Switch visible solo si `type === "PRIVATE"`.
- Default `true` al cargar.
- Al cambiar `type` de `PRIVATE` a `PUBLIC`, el Switch se oculta y `membersCanInvite` se resetea a `true`.
- El valor se envía en el `submit()`.

### `PoolSettingsCard` (client)
- Renderiza el Switch con `initialMembersCanInvite`.
- Click en Switch dispara `updatePoolMembersCanInvite` y refleja el estado optimistamente.
- En éxito: toast `settings.saved` aparece; Switch queda en el nuevo valor.
- En error: `FormError` con el mensaje; Switch revierte al valor anterior.
- Durante `pending`: Switch deshabilitado.
- `aria-label` configurado.

### `PoolDetailPage`
- `<DirectedInviteForm>` y `<InviteShare>` se renderizan si `canInvite = pool.isOwner || (PRIVATE && membersCanInvite)`.
- `<p>{t.invite.membersBlockedHint}</p>` se renderiza en el caso contrario (no se muestra el form ni el token/link).
- `<PoolSettingsCard>` se monta solo si `pool.isOwner && pool.type === "PRIVATE"`.

### i18n
- `pools.settings.*` (5 claves × 2 idiomas) presentes.
- `pools.invite.membersBlockedHint` (1 clave × 2 idiomas) presente.
- `pools.membersCanInvite*` (2 claves × 2 idiomas) presentes.

### Verificación estándar
- `pnpm exec tsc --noEmit` — 0 errores.
- `pnpm exec biome check src/features/pools/ src/app/(app)/pools/[id]/page.tsx src/i18n/dictionaries/` — limpio en archivos tocados.
- `pnpm exec eslint <mismos archivos>` — limpio.
- `pnpm test` — focused + full suite verde.
- `pnpm build` — OK.

## Artifact Changes After Functional Design Approval

| Artifact | Planned change (Code Gen Part 1) |
|---|---|
| `construction/plans/unit-45-pool-member-invites-permission-code-generation-plan.md` (NEW) | Plan de implementación con 14 pasos: schema + migración, types, schemas, queries, create-pool, update-pool-members-can-invite, create-directed-invite (gate), create-pool-form (Switch), pool-settings-card, page.tsx, i18n ES+EN, tests (5 archivos), verificación. |
| Application code (workspace root) | Schema Prisma + migración, `schemas.ts`, `types.ts`, `queries.ts`, `actions/create-pool.ts`, `actions/update-pool-members-can-invite.ts` (NEW), `actions/create-directed-invite.ts`, `components/create-pool-form.tsx`, `components/pool-settings-card.tsx` (NEW), `components/pool-settings-card-client.tsx` (NEW), `app/(app)/pools/[id]/page.tsx`, i18n ES+EN, 5 test files (3 nuevos + 2 modificados). |

## Approval Gate

Do not modify application code until Functional Design is explicitly approved.
