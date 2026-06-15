# Unit 26 — Performance Fase 1: Quick Wins (NFR-PERF-REFINE-26)

> Refine post-construcción (2026-06-15) vía AI-DLC refine. **Cambios de query,
> dedup, paralelización, pool y schema** de bajo riesgo y alto impacto (~30min).
> **No reinicia** etapas aprobadas. Cubre la **Épica 25** (US-25.1). Deriva del
> análisis de performance extendido (2026-06-15) que encontró problemas más
> profundos que los cubiertos por Unit 22 (P0/P1/P2 ya implementados: dedup
> `getUser`, fixture cache, ranking cache).

## 1. Intención del usuario

Solicitud:
> *"Sí quiero que implementes la Fase 1, Luego la Fase 2"*

La app presenta latencia de 2-3s por request en navegación (medida en Vercel,
región `iad1`, contra Supabase `us-east-1`). El análisis de hoy identificó 9
cuellos de botella adicionales a los ya cubiertos por Unit 22. Este documento
cubre los 5 de Fase 1 (quick wins, bajo riesgo, sub-30min).

## 2. Causas y diagnóstico

Unit 22 (2026-06-14, `construction/unit-22-performance-recommendations/`) cubrió:
- **P0**: Dedup `getUser()` con `React.cache()` — **HECHO**
- **P1**: `unstable_cache` sobre fixture estático — **HECHO**
- **P2**: `unstable_cache` sobre ranking global — **HECHO**

Pero la latencia siguió en 2-3s. El análisis extendido de hoy encontró:

| # | Hallazgo | Archivo:línea | Impacto |
|---|----------|---------------|---------|
| 1 | `getProfile()` sin `select` — devuelve 20+ columnas, llamado en layout + AppHeader + pages | `src/features/profile/queries.ts:81` | ~100ms/query |
| 2 | Sin `React.cache()` en `getProfile()` — se ejecuta 2-3x por request | `src/features/profile/queries.ts` | ~200ms acumulado |
| 3 | Queries secuenciales en `/pools/[id]` sin `Promise.all()` | `src/app/(app)/pools/[id]/page.tsx:23-27` | ~300ms acumulado |
| 4 | `connection_limit=1` serializa todas las queries Prisma | `src/lib/prisma.ts:39-41` | +100-200ms en requests multi-query |
| 5 | FK indexes faltantes `homeTeamId`/`awayTeamId` en Match | `prisma/schema.prisma` | ~100ms por nested loop join |

## 3. Decisión

**Implementar los 5 cambios de Fase 1 como Unit 26.** Son independientes entre
sí, de bajo riesgo, y atacan las causas principales de la latencia residual
post-Unit 22. Sin cambios funcionales: los mismos datos, misma UI, mismo
comportamiento.

## 4. Trazabilidad requisito → cambio

| FR-PERF-26 | Descripción | Archivo(s) | Tipo | Riesgo |
|------------|-------------|------------|------|--------|
| 26.1 | `getProfile()` con `select` mínimo | `src/features/profile/queries.ts` | Query | Bajo |
| 26.2 | `getProfile()` dedup con `React.cache()` | `src/features/profile/queries.ts` | Dedup | Bajo |
| 26.3 | `Promise.all()` en `/pools/[id]` | `src/app/(app)/pools/[id]/page.tsx` | Query | Bajo |
| 26.4 | `connection_limit` 1→3 | `src/lib/prisma.ts` | Infra | Bajo |
| 26.5 | `@@index([homeTeamId])` + `@@index([awayTeamId])` | `prisma/schema.prisma` + migración | Schema | Bajo |

## 5. Diseño detallado por historia

### FR-PERF-26.1 — `select` en `getProfile()`

**Estado actual** (`src/features/profile/queries.ts:81`):
```ts
const profile = await prisma.profile.findUnique({ where: { id: user.id } });
```
Devuelve la fila completa: id, nicknameBase, nicknameDiscriminator, avatarUrl,
avatarSource, verificationStatus, onboardingCompleted, locale, deletedAt,
createdAt, updatedAt, nicknameUpdatedAt, nicknameChangeCount, y otras.

**Cambio**: usar `select` para devolver solo las columnas que los consumidores
usan. Los consumidores son:
- `AppHeader` → nicknameBase, nicknameDiscriminator, avatarUrl, verificationStatus
- `(app)/layout.tsx` → onboardingCompleted
- `settings/layout.tsx` → igual que AppHeader + locale + avatarSource
- `settings/profile/page.tsx` → misma fila completa para el formulario
- `settings/security/page.tsx` → verificationStatus
- `delete-account.ts` → id

**Decisión**: crear un `select` base que cubra el caso más común (AppHeader +
layout) y exponer un `getProfileForSettings()` completo para las páginas de
settings que necesitan todos los campos. El `select` base incluye: `id`,
`nicknameBase`, `nicknameDiscriminator`, `avatarUrl`, `avatarSource`,
`verificationStatus`, `onboardingCompleted`, `locale`, `deletedAt`.

**Contrato**:
```ts
// queries.ts — antes
export async function getProfile(): Promise<Profile | null> {
  const { user } = await getAuthUser();
  if (!user) return null;
  return prisma.profile.findUnique({ where: { id: user.id } });
}

// queries.ts — después
const PROFILE_SELECT = {
  id: true, nicknameBase: true, nicknameDiscriminator: true,
  avatarUrl: true, avatarSource: true, verificationStatus: true,
  onboardingCompleted: true, locale: true, deletedAt: true,
} as const;

export const getProfile = cache(async (): Promise<ProfileView | null> => {
  const { user } = await getAuthUser();
  if (!user) return null;
  return prisma.profile.findUnique({
    where: { id: user.id },
    select: PROFILE_SELECT,
  }) as Promise<ProfileView | null>;
});
```

El tipo `ProfileView` reemplaza al `Profile` completo en los consumidores que
solo usaban el subconjunto. `getProfileForSettings()` (sin cache, `select`
completo) se usa en settings/profile y settings/security.

### FR-PERF-26.2 — `React.cache()` sobre `getProfile()`

**Cambio**: envolver `getProfile()` con `cache()` de React (import de
`"react"`). Esto deduplica la query Prisma dentro del mismo render: si
`(app)/layout.tsx`, `AppHeader` y `matches/page.tsx` llaman `getProfile()`,
solo se ejecuta **una** query Prisma.

Ya existe el patrón en `src/lib/supabase/current-user.ts` (`getAuthUser`).

**Interacción con 26.1**: el `cache()` se aplica sobre la versión con `select`.
`getProfileForSettings()` NO lleva `cache()` porque solo se llama desde una
página de settings (nunca desde layout + page simultáneamente).

### FR-PERF-26.3 — `Promise.all()` en `/pools/[id]`

**Estado actual** (`src/app/(app)/pools/[id]/page.tsx:23-27`):
```ts
const pool = await getPoolDetail(id);
const leaderboard = await getPoolLeaderboard(id, userId);
```

`getPoolLeaderboard` no depende del resultado de `getPoolDetail` — usa `id` y
`userId` directamente. Ejecutarlas secuencialmente duplica la latencia de BD.

**Cambio**:
```ts
const [pool, leaderboard] = await Promise.all([
  getPoolDetail(id),
  getPoolLeaderboard(id, userId),
]);
```

### FR-PERF-26.4 — `connection_limit` 1→3

**Estado actual** (`src/lib/prisma.ts:39-41`):
```ts
const pooled = sanitized.includes("?connection_limit=")
  ? sanitized
  : `${sanitized}${sanitized.includes("?") ? "&" : "?"}connection_limit=1`;
```

**Cambio**: `connection_limit=1` → `connection_limit=3`. En serverless, con
queries paralelas (26.3) y múltiples componentes haciendo lecturas, 3 conexiones
permiten concurrencia real sin riesgo de agotar el pool de Supabase (pgBouncer
en modo transacción multiplexa a backend connections).

### FR-PERF-26.5 — FK indexes en Match

**Schema change** (`prisma/schema.prisma`, modelo `Match`):
```diff
 model Match {
   // ... campos existentes ...
   homeTeamId         String    @db.Uuid
   awayTeamId         String    @db.Uuid
   // ...

+  @@index([homeTeamId])
+  @@index([awayTeamId])
 }
```

Generar migración con `prisma migrate dev --name unit26_match_fk_indexes`.
Aplicar en prod con `prisma migrate deploy` (direct connection :5432).

**Impacto**: toda query de fixture (`getStaticFixture`, `getAdminMatches`,
`score-sweeper`) hace `include: { homeTeam: true, awayTeam: true }`. Sin índice,
PostgreSQL ejecuta sequential scan + nested loop join para cada match. Con
índices, el join usa index scan. Para 104 partidos el impacto es modesto pero
acumulativo con otras queries.

## 6. Plan de archivos (Code Generation)

```
src/
├── features/
│   └── profile/
│       ├── queries.ts           # MODIFICAR: select + cache
│       └── types.ts             # MODIFICAR (si se añade ProfileView)
├── lib/
│   └── prisma.ts                # MODIFICAR: connection_limit 1→3
└── app/
    └── (app)/
        └── pools/
            └── [id]/
                └── page.tsx     # MODIFICAR: Promise.all

prisma/
├── schema.prisma                # MODIFICAR: @@index en Match
└── migrations/
    └── <timestamp>_unit26_match_fk_indexes/
        └── migration.sql        # NUEVO
```

## 7. NFR / Seguridad

- **Seguridad**: sin cambios en autorización ni validación. Security Baseline
  intacto.
- **Compatibilidad**: `PrismaPg` soporta `connection_limit` como parámetro de
  connection string. Los índices son aditivos y no afectan queries existentes.
- **Rollback**: los índices se dropean con `DROP INDEX`. `connection_limit`
  revierte al valor 1. El `select` y `Promise.all` son reversibles vía git.

## 8. Verificación

| Paso | Comando / criterio |
|------|--------------------|
| Generar Prisma | `pnpm prisma:generate` OK |
| TypeScript | `tsc --noEmit` 0 errores |
| Lint | `pnpm lint` (ESLint) OK |
| Format | `pnpm check` (Biome) OK |
| Tests | `pnpm test` (Vitest) — suite completa verde, sin regresiones |
| Build | `pnpm build` OK |
| Migración | `prisma migrate dev` crea la migración; `migrate status` = applied |
| Latencia | TTFB en Vercel Analytics: objetivo <1s en `/matches`, `/pools/[id]`, `/rankings` |

## 9. Dependencias

- **Unit 22** (Performance Recommendations): Unit 26 extiende el análisis de
  Unit 22 con hallazgos adicionales. No depende de Unit 22 para implementación
  (cambios en archivos distintos).
- **Unit 3** (Pools): FR-PERF-26.3 toca `pools/[id]/page.tsx` pero solo cambia
  la forma de llamar a las queries, no su lógica.
- **Unit 1** (Foundation): FR-PERF-26.1/26.2 modifican `getProfile()` que es
  usado por AppHeader, layout y settings. El contrato de retorno se preserva
  (mismas propiedades, mismo comportamiento).

## 10. Épica 25 — Historia de usuario

- **US-25.1**: Como usuario de la aplicación, quiero que las pantallas
  principales carguen en <1s, para navegar sin esperas de 2-3s. Criterios de
  aceptación: `getProfile()` usa `select` + dedup, `/pools/[id]` corre queries
  en paralelo, `connection_limit=3`, FK indexes en Match. Suite verde, build OK,
  TTFB <1s.
