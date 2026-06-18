# Functional Design (Light) — Unit 44: Autocompletar nickname al invitar a una liga

## Stage

- **Unit**: Unit 44, refine post-construcción sobre Unit 3 (Pools), Unit 10 (Directed Invites), Unit 13 (Invitaciones Refine)
- **Stage**: Functional Design — COMPLETE / Approval Gate
- **Created**: 2026-06-18
- **Status**: Awaiting explicit approval before Code Generation Part 1

## Business Logic Model

### Autocompletar en `DirectedInviteForm`

```
Usuario escribe en el campo "target"
    ├─ texto >= 2 chars AND no contiene "@"
    │   └─ debounce 250ms → POST searchNicknames(query)
    │       ├─ loading → spinner en dropdown
    │       ├─ resultados → dropdown con sugerencias (avatar + base#discriminator)
    │       │   ├─ ArrowDown / ArrowUp → mover highlightIndex
    │       │   ├─ Enter / Click → setTarget(sugerencia.nickname), cerrar dropdown
    │       │   └─ Escape → cerrar dropdown
    │       └─ sin resultados → dropdown vacío / sin mostrar
    ├─ texto < 2 chars OR contiene "@"
    │   └─ sin autocompletar (comportamiento actual)
    └─ submit() → mismo comportamiento (createDirectedInvite con target manual)
```

### Cambio de permisos: any-member

```
createDirectedInvite({ poolId, target })
    ├─ getOnboardedUserId() → si no → error "Completa tu perfil..."
    ├─ validar input con CreateDirectedInviteSchema
    ├─ buscar pool (select: id, name, inviteToken, ownerId)
    ├─ [NUEVO] verificar membresía: poolMembership.findUnique({ poolId, userId })
    │   └─ si no es miembro → error "Debes ser miembro de la liga para invitar"
    ├─ resolveUserByTarget(target) → mismo comportamiento
    ├─ upsert/create invite → mismo comportamiento
    ├─ queueNotificationEvent → mismo comportamiento
    └─ revalidatePath + return
```

## Domain Entities

### `SearchNicknameResult`

```typescript
/** Public profile summary for nickname autocomplete (FR-REFINE-44.1–44.6). */
export interface SearchNicknameResult {
  userId: string;
  nicknameBase: string;
  nicknameDiscriminator: string;
  avatarUrl: string | null;
}
```

### `SearchNicknameSchema` (Zod)

```typescript
export const SearchNicknameSchema = z.object({
  query: z
    .string()
    .trim()
    .min(2, "Mínimo 2 caracteres")
    .max(30, "Demasiado largo")
    .regex(/^[a-zA-Z0-9_-]+$/, "Solo letras, números, guiones y guiones bajos"),
});
```

## Business Rules

| Rule | Description |
|------|-------------|
| **BR-44.1** | `searchNicknames(query)` acepta >=2 caracteres, solo base de nickname (regex `[a-zA-Z0-9_-]+`), sin `#` ni `@`. |
| **BR-44.2** | Consulta Prisma: `profile.findMany` con `nicknameBase: { startsWith: query, mode: "insensitive" }`, `deletedAt: null`, `take: 8`, orden `nicknameBase asc, nicknameDiscriminator asc`. |
| **BR-44.3** | Devuelve solo datos públicos: `userId`, `nicknameBase`, `nicknameDiscriminator`, `avatarUrl`. Sin emails, sin auth.users. |
| **BR-44.4** | Dropdown en `DirectedInviteForm`: visible si `target.length >= 2 && !target.includes("@")` y hay resultados de `searchNicknames`. |
| **BR-44.5** | Debounce de 250ms client-side antes de llamar al server action. Loading spinner miniatura en el dropdown mientras se consulta. |
| **BR-44.6** | Navegación con teclado: ArrowDown/ArrowUp mueven `highlightIndex` (circular: -1 → -1 si vacío, 0..n-1 con wrap). Enter selecciona el ítem resaltado. Escape cierra el dropdown. Click en un ítem lo selecciona. |
| **BR-44.7** | Seleccionar una sugerencia escribe `base#discriminator` en el input y cierra el dropdown. El botón "Invitar" y `submit()` no cambian su comportamiento. |
| **BR-44.8** | **Cualquier miembro del pool puede invitar**, no solo el owner. Gate UI: `pool.isOwner` → siempre visible (el page ya gatea por membresía). Gate server-side: `pool.ownerId !== userId` → verificar `PoolMembership.findUnique({ poolId_userId })`. **SUPERSEDED por Unit 45 (2026-06-18) — ver FR-REFINE-45.2 / FR-REFINE-45.3 / BR-3.33 / BR-3.34**: el comportamiento "cualquier miembro puede invitar" se mantiene como **default** (`Pool.membersCanInvite = true`), pero el owner puede restringirlo. Gate server-side final: `isOwner || (pool.type === "PRIVATE" && pool.membersCanInvite === true)`. Gate UI final: `isOwner || (pool.type === "PRIVATE" && pool.membersCanInvite)`. El code-gen plan de Unit 44 (Steps 4-5) se ajusta para condicionar el gate al flag; el comportamiento end-to-end queda en línea con Unit 45. |
| **BR-44.9** | **Auto-invitación bloqueada**. Si el `invitedUserId` resuelto coincide con el `userId` del inviter, se retorna error "No puedes invitarte a ti mismo." antes de persistir. |
| **BR-44.10** | **El usuario actual no aparece en el autocompletar**. `searchNicknames` obtiene `getCurrentUserId()` y excluye ese ID del `where` de Prisma (`id: { not: userId }`). Si no hay sesión, no se aplica filtro. |

## Frontend Components

### `DirectedInviteForm` (modificado)

**Contrato server side**: recibe `poolId: string` como prop. Sin cambios en la firma.

**Nuevo estado**:
- `suggestions: SearchNicknameResult[]` — resultados de la búsqueda.
- `showDropdown: boolean` — si el dropdown está visible.
- `highlightIndex: number` — índice resaltado en el dropdown (-1 = ninguno).
- `loading: boolean` — si está esperando respuesta del server action.

**Nuevo comportamiento** (además del existente):
1. `useEffect` con debounce 250ms sobre `target`: si `target.length >= 2 && !target.includes("@")`, llama `searchNicknames(target)`; si `<2` o contiene `@`, limpia sugerencias y cierra dropdown.
2. Dropdown posicionado debajo del `<Input>` (absolute, z-10, mismo ancho, max-h con scroll) con `<ul>` de sugerencias.
3. Render de sugerencia: `<img>` 24px avatar + `<span>base#discriminator</span>`.
4. `onKeyDown` en el `<Input>` para ArrowDown/ArrowUp/Enter/Escape.
5. `onClick` en cada `<li>` → `setTarget`, cierra dropdown.
6. Loading spinner (componente miniatura) mientras `loading === true`.
7. `onBlur` con timeout (para permitir click en sugerencia) → cierra dropdown.

### `searchNicknames` (NUEVO server action)

**Path**: `src/features/pools/actions/search-nicknames.ts`

```typescript
"use server";
import { prisma } from "@/lib/prisma";
import { SearchNicknameSchema } from "../schemas";
import type { SearchNicknameResult } from "../types";

export async function searchNicknames(input: unknown): Promise<SearchNicknameResult[] | { error: string }> {
  const parsed = SearchNicknameSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Búsqueda inválida" };

  const profiles = await prisma.profile.findMany({
    where: {
      nicknameBase: { startsWith: parsed.data.query, mode: "insensitive" },
      deletedAt: null,
    },
    select: { id: true, nicknameBase: true, nicknameDiscriminator: true, avatarUrl: true },
    orderBy: [{ nicknameBase: "asc" }, { nicknameDiscriminator: "asc" }],
    take: 8,
  });

  return profiles.map((p) => ({
    userId: p.id,
    nicknameBase: p.nicknameBase,
    nicknameDiscriminator: p.nicknameDiscriminator,
    avatarUrl: p.avatarUrl,
  }));
}
```

**Nota**: `getOnboardedUserId()` no se exige — `searchNicknames` es una consulta pública de datos públicos de perfil (mismo nivel que `listPublicPools`). No filtra por sesión, no expone datos sensibles.

### Cambio de permisos en `createDirectedInvite`

**Path**: `src/features/pools/actions/create-directed-invite.ts`

Cambio en línea 73: reemplazar la guarda de owner por guarda de membresía:

```typescript
// ANTES:
if (pool.ownerId !== userId) return { error: "Solo el administrador puede invitar" };

// DESPUÉS:
const membership = await prisma.poolMembership.findUnique({
  where: { poolId_userId: { poolId: pool.id, userId } },
  select: { userId: true },
});
if (!membership) return { error: "Debes ser miembro de la liga para invitar" };
```

### Cambio de permisos en `page.tsx`

**Path**: `src/app/(app)/pools/[id]/page.tsx`

Línea 97: cambiar gate UI de owner a siempre visible (el page ya devuelve `notFound()` para no-miembros):

```tsx
// ANTES:
{pool.isOwner && <DirectedInviteForm poolId={pool.id} />}

// DESPUÉS:
<DirectedInviteForm poolId={pool.id} />
```

### Plan de archivos

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/features/pools/types.ts` | MODIFICAR | Añadir `SearchNicknameResult` type. |
| `src/features/pools/schemas.ts` | MODIFICAR | Añadir `SearchNicknameSchema` (Zod). |
| `src/features/pools/actions/search-nicknames.ts` | NUEVO | Server action de búsqueda de nicknames. |
| `src/features/pools/components/directed-invite-form.tsx` | MODIFICAR | Dropdown de autocompletar + debounce + teclado. |
| `src/features/pools/actions/create-directed-invite.ts` | MODIFICAR | Gate owner → membresía (línea 73). |
| `src/app/(app)/pools/[id]/page.tsx` | MODIFICAR | Gate UI `pool.isOwner` → siempre visible (línea 97). |
| `src/features/pools/actions/__tests__/search-nicknames.test.ts` | NUEVO | Tests del server action. |
| `src/features/pools/actions/__tests__/create-directed-invite.test.ts` | MODIFICAR | Actualizar caso "non-owner" → "non-member". |
| `src/features/pools/components/__tests__/directed-invite-form.test.tsx` | NUEVO | Tests del dropdown (debounce, teclado, selección). |
| `src/i18n/dictionaries/{es,en}.ts` | SIN CAMBIOS | Reutiliza `invitePlaceholder`, `inviteAria`. |

### Sin cambios

- `prisma/schema.prisma` — sin migraciones.
- `src/features/pools/services/session.ts` — sin cambios.
- `src/features/notifications/` — sin cambios.
- `src/i18n/` — sin nuevas claves.
- Rutas — sin cambios.

## i18n

Sin nuevas claves i18n. El placeholder `invitePlaceholder` (existente) y el aria-label `inviteAria` (existente) se reutilizan. El mensaje de error del server action `searchNicknames` usa texto inline (error de validación, no visible al usuario final en flujo normal).

## Out of Scope

- Búsqueda por discriminator parcial (solo base de nickname).
- Búsqueda asíncrona con abort controller (la query es rápida: take 8, `startsWith` con índice implícito en `nicknameBase`).
- Extracción a componente `NicknameAutocomplete` independiente (diferido; se extraerá si el dropdown crece en complejidad).
- Rate limiting (query acotada a take 8, debounce client-side de 250ms).

## Security Baseline Compliance

| Rule | Status | Rationale |
|------|--------|-----------|
| SECURITY-01 | N/A | Sin cambios en autenticación. |
| SECURITY-02 | N/A | Sin datos de pago. |
| SECURITY-03 | N/A | Sin secrets nuevas. |
| SECURITY-04 | N/A | Sin cambios en CSP. |
| SECURITY-05 | COMPLIANT | `searchNicknames` valida input con Zod (min 2, regex `[a-zA-Z0-9_-]+`, max 30). El dropdown usa datos ya validados. |
| SECURITY-06 | N/A | Sin operaciones criptográficas. |
| SECURITY-07 | N/A | Sin rate limiting requerido (take 8, debounce 250ms). |
| SECURITY-08 | COMPLIANT | `searchNicknames` solo expone datos públicos (nickname, avatar). No emails, no auth.users. `createDirectedInvite` mantiene gate de autorización (membership + onboarded). |
| SECURITY-09 | N/A | Sin logging nuevo. |
| SECURITY-10 | N/A | Sin dependencias npm nuevas. |
| SECURITY-11 | N/A | Sin cambios en sesiones. |
| SECURITY-12 | N/A | Sin cambios en payloads de push. |
| SECURITY-13 | N/A | Sin cambios en CSRF. |
| SECURITY-14 | N/A | Sin data exports. |
| SECURITY-15 | N/A | Sin cambios en backup/recovery. |

## Verification Plan

### `searchNicknames` server action tests
- Query de 2 chars retorna resultados coincidentes (mock `profile.findMany`).
- Query de 1 char retorna error de validación.
- Query con `#` retorna error de validación.
- Query con `@` retorna error de validación.
- Query vacía retorna error de validación.
- Resultados ordenados alfabéticamente por `nicknameBase` y `nicknameDiscriminator`.
- Max 8 resultados (`take: 8`).
- Perfiles con `deletedAt != null` excluidos.
- Case-insensitive ("pepe" matchea "Pepe", "PEPE").
- Sin resultados retorna `[]`.

### `createDirectedInvite` cambio de permisos tests
- Miembro no-owner puede crear invitación (antes rechazado con "Solo el administrador puede invitar").
- No-miembro recibe error "Debes ser miembro de la liga para invitar".
- Owner sigue pudiendo invitar (es miembro).
- Usuario sin onboarding completado sigue recibiendo error igual que antes.

### `DirectedInviteForm` dropdown tests
- Escribir 2+ chars llama `searchNicknames` tras debounce.
- Escribir <2 chars no muestra dropdown.
- Escribir texto con `@` no muestra dropdown.
- Seleccionar sugerencia con click escribe `base#discriminator` en el input.
- Navegar con ArrowDown/ArrowUp resalta sugerencias.
- Enter selecciona la sugerencia resaltada.
- Escape cierra el dropdown.
- Loading spinner visible durante la consulta.
- El botón "Invitar" y `submit()` no cambian su comportamiento.

### Verificación estándar
- `pnpm exec tsc --noEmit` — 0 errores.
- `pnpm exec biome check src/features/pools/` — limpio en archivos tocados.
- `pnpm exec eslint src/features/pools/` — limpio en archivos tocados.
- `pnpm test` — focused + full suite verde.
- `pnpm build` — OK.
