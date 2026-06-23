# Functional Design — Unit 63: Estado «ya unido» en `/pools/discover`

> Refine post-construcción (2026-06-23) vía `/aidlc:refine`. **Plan presentado y aprobado antes de ejecutar** (decisión vía AskUserQuestion: estado «ya unido» = botón **outline «Ir a la liga»** que navega a `/pools/[id]` —frente a badge+link o botón con label de estado—; reusa la key i18n existente `goToPool`). Refine sobre **Unit 3** (Pools and Membership — `listPublicPools`, `PoolPreviewItem`, `PoolPreviewCard`) y **Unit 13** (FR-REFINE-13.6 «ya miembro» como estado informativo post-clic). **No reinicia** etapas aprobadas (Units 1–62 intactas; Unit 62 es una épica planificada no implementada, independiente de Unit 63).

## Traceability

| ID | Source | Description |
|----|--------|-------------|
| FR-REFINE-63.1 | requirements | El directorio público `/pools/discover` anota `isMember` por pool para el usuario actual y el card muestra «Ir a la liga» (no «Unirme») en los pools a los que ya pertenece. Extiende FR-REFINE-13.6 a un estado **proactivo pre-clic**. |
| US-63.1 | stories | Como miembro de una liga pública, ver «Ir a la liga» en el directorio en vez de «Unirme» para no confundirme ni hacer un clic inútil. |

## 1. Contexto y causa raíz

**Brecha de UX, no de datos ni de autorización.** El flujo de «ya miembro» ya está cubierto **reactivamente** por Unit 13 (FR-REFINE-13.6): `joinPublicPool` (`src/features/pools/actions/join-public-pool.ts:39`) devuelve `{ alreadyMember: true, poolId }` en vez de un error, y `PoolPreviewCard` muestra un mensaje informativo + enlace «Ir a la liga» **después** de que el usuario pulsa «Unirme».

Pero el directorio `/pools/discover` **no anota** si el usuario actual ya es miembro de cada pool listado:

1. `listPublicPools` (`src/features/pools/queries.ts:95`) hace un `prisma.pool.findMany` con `_count` de memberships, **sin** consultar la membresía del usuario actual.
2. `PoolPreviewItem` (`src/features/pools/types.ts:8`) no tiene campo `isMember`.
3. `PoolPreviewCard` (`src/features/pools/components/pool-preview-card.tsx:63`) renderiza **siempre** el botón «Unirme» (salvo pool lleno).

Consecuencia: un usuario ve «Unirme» en pools a los que ya pertenece y solo descubre que ya es miembro **al pulsar** —un clic inútil que debería ser innecesario.

**Decisión de UI (AskUserQuestion)**: botón **outline «Ir a la liga»** que reemplaza «Unirme» (frente a un badge «Ya estoy unido» + link aparte, o un botón con label de estado). Reusa la key i18n existente `goToPool` («Ir a la liga»/«Go to league»); **sin** nuevas keys i18n.

## 2. Business Rules

### BR-63.1 — Anotación `isMember` server-side
`listPublicPools` anota cada `PoolPreviewItem` con `isMember: boolean` = si el usuario actual tiene una `PoolMembership` para ese pool. La anotación se calcula en el **servidor** (la página `/pools/discover` es un Server Component) con una **única** query batched (`prisma.poolMembership.findMany({ where: { userId, poolId: { in: [...] } } })`) → un `Set<string>` de `poolId`s → `isMember = memberPoolIds.has(p.id)`. No hay N+1 (una query de memberships por página de directorio, no una por pool).

### BR-63.2 — Usuario anónimo
Si `getCurrentUserId()` devuelve `null` (no autenticado), todas las pools se anotan `isMember: false` y **no** se ejecuta la query de memberships. El directorio público es alcanzable por usuarios autenticados (gate del proxy), pero la query es defensiva ante un `null`.

### BR-63.3 — Directorio vacío
Si `listPublicPools` devuelve cero pools (búsqueda sin resultados, etc.), **no** se ejecuta la query de memberships (no hay pools que anotar). Optimización menor pero real.

### BR-63.4 — Card: rama «ya miembro»
`PoolPreviewCard`, cuando `pool.isMember === true`, renderiza un **botón outline** «Ir a la liga» (`<Link>` con `buttonVariants({ variant: "outline" })}`) que navega a `/pools/${pool.id}`. **No** renderiza el botón «Unirme» ni el área de error/info del flujo de join. **No** invoca `joinPublicPool`.

### BR-63.5 — Card: rama «no miembro» (sin cambios)
Cuando `pool.isMember === false`, el card conserva el comportamiento de Unit 13/23: botón «Unirme» (o «Lleno» deshabilitado si `memberCount >= capacity`), flujo `join()` → `joinPublicPool`, redirección al éxito (FR-REFINE-13.5), y el mensaje informativo `alreadyMember` + enlace «Ir a la liga» como **red de seguridad reactiva** ante una race (p. ej. el usuario se unió en otra pestaña y la anotación `isMember` quedó stale hasta el siguiente `router.refresh()`).

### BR-63.6 — Sin cambios en la action ni en el modelo de autorización
`joinPublicPool` **no se modifica**. Su contrato `{ success } | { alreadyMember } | { error }` se conserva intacto (BR-13.6). La autorización y el guard de capacidad siguen server-side en la action. `isMember` es solo una **pista de presentación**; nunca autoriza ni deniega un join — un clic en «Unirme» de un pool stale-ya-miembro sigue funcionando y recibe `alreadyMember`.

## 3. Business Logic Model

### BL-63.1 — `PoolPreviewItem` (tipo)
`src/features/pools/types.ts`: añade `isMember: boolean` a la interfaz `PoolPreviewItem`. Es el único consumidor de `listPublicPools` además de `PoolDirectoryList`/`PoolPreviewCard` (verificado: no hay otras construcciones de `PoolPreviewItem` en el código base).

### BL-63.2 — `listPublicPools` (query)
`src/features/pools/queries.ts`. Tras el `prisma.pool.findMany` existente:
```ts
const userId = await getCurrentUserId();
const memberPoolIds = new Set<string>(
  userId && pools.length > 0
    ? (await prisma.poolMembership.findMany({
        where: { userId, poolId: { in: pools.map((p) => p.id) } },
        select: { poolId: true },
      })).map((m) => m.poolId)
    : [],
);
```
Luego `isMember: memberPoolIds.has(p.id)` en el `.map`. Reusa `getCurrentUserId` ya importado en el mismo archivo (lo usan `getMyPools`/`getPoolDetail`). El filtro `onlyWithCapacity` se aplica **después** de la anotación (sin cambios en su comportamiento).

### BL-63.3 — `PoolPreviewCard` (componente)
`src/features/pools/components/pool-preview-card.tsx`. Importa `Link` de `next/link` y `buttonVariants` de `@/components/ui/button`. En el JSX, rama por `pool.isMember`:
- **true** → `<Link className={buttonVariants({ variant: "outline" })} href={`/pools/${pool.id}`} data-testid={`go-to-pool-${pool.id}`}>{t.goToPool}</Link>`.
- **false** → `<Button onClick={join} disabled={!hasCapacity || pending} data-testid={`join-public-pool-${pool.id}`}>…</Button>` (sin cambios) + el área `FormError`/`info` (red de seguridad, solo en esta rama).

`useRouter` se conserva (lo usa la rama `info` y `join()` al éxito).

## 4. Contratos / cambios de código

| Archivo | Cambio |
|---|---|
| `src/features/pools/types.ts` | **MODIFIED** — `isMember: boolean` en `PoolPreviewItem`. |
| `src/features/pools/queries.ts` | **MODIFIED** — `listPublicPools` anota `isMember` con query batched; skip si anónimo o directorio vacío. |
| `src/features/pools/components/pool-preview-card.tsx` | **MODIFIED** — rama `pool.isMember` → botón outline «Ir a la liga» (`Link`); rama no-miembro sin cambios; importa `Link` + `buttonVariants`. |
| `src/features/pools/__tests__/list-public-pools.test.ts` | **NEW** — anotación `isMember` (miembro/no-miembro, anónimo → todos false, directorio vacío → sin lookup, `onlyWithCapacity` tras anotación). |
| `src/features/pools/components/__tests__/pool-preview-card.test.tsx` | **NEW** — «Ir a la liga» cuando `isMember`, «Unirme» cuando no, no invoca `joinPublicPool` si miembro, «Lleno» deshabilitado. |

**Sin** cambios en: `join-public-pool.ts` (action), `pool-directory-list.tsx` (solo pasa el tipo ya extendido), `discover/page.tsx` (ya pasaba los items), i18n (reusa `goToPool`), schema, migraciones, rutas, server actions ni middleware.

## 5. Security Baseline Compliance

| Regla | Estado | Razón |
|---|---|---|
| SECURITY-01 (input) | COMPLIANT | Sin nueva superficie de input; `isMember` se deriva server-side de `getCurrentUserId` + `PoolMembership`. |
| SECURITY-08 (autorización) | COMPLIANT | `isMember` es solo **presentación**; nunca autoriza ni deniega. El gate de acceso al directorio y el `joinPublicPool` (capacidad, unicidad, `ALREADY_MEMBER`) se mantienen intactos. Reusa `getCurrentUserId` existente. |
| SECURITY-13 (confidencialidad) | COMPLIANT | La membresía de un usuario en pools **públicos** no es información sensible (los pools públicos son descubribles por diseño); `isMember` solo refleja la membresía del **propio** usuario actual. Sin fuga de datos de otros usuarios. |
| Secrets | COMPLIANT | Sin secretos nuevos; reusa la conexión Prisma existente. |

## 6. Verificación

| Check | Método |
|---|---|
| Tipos | `tsc --noEmit` 0 (los 2 errores de `pool-live-now-banner.test.tsx` son preexistentes de Unit 61, no relacionados). |
| Lint/format | Biome limpio (5 archivos tocados), ESLint 0. |
| Unit tests | `list-public-pools.test.ts` (4: anotación miembro/no-miembro, anónimo, vacío, capacity), `pool-preview-card.test.tsx` (4: «Ir a la liga»/«Unirme»/no-join/«Lleno»), regresión `join-public-pool.test.ts` (6, sin cambios). **Suite pools 129/129** (+8 nuevos). |
| Build | `pnpm build` OK. |
| Manual | `/pools/discover` logueado — los pools a los que ya perteneces muestran «Ir a la liga» y al pulsar van a `/pools/[id]`; los que no muestran «Unirme»; un pool lleno ajeno muestra «Lleno» deshabilitado. |

## 7. Out of Scope

- Badge explícito «Ya estoy unido» además del botón (alternativa descartada por el usuario).
- Nueva key i18n (se reusa `goToPool`).
- Invalidar `isMember` en tiempo real tras unirse en otra pestaña (la anotación se refresca en el siguiente `router.refresh()`/navegación; la rama reactiva `alreadyMember` cubre la race).
- Directorio para usuarios anónimos (el proxy gatea a login; la query es defensiva).
- `isMember` en `MyPoolSummary` o `PoolDetail` (redundante — esas vistas ya filtran por membresía).
