# Unit 27 — Performance Fase 2: Estructural (NFR-PERF-REFINE-27)

> Refine post-construcción (2026-06-15) vía AI-DLC refine. **Cambios
> estructurales** de cache, schema y queries (~1h). **No reinicia** etapas
> aprobadas. Cubre la **Épica 26** (US-26.1). Completa el plan de optimización
> de performance iniciado con Unit 22 (análisis + P0/P1/P2) y Unit 26 (Fase 1).

## 1. Intención del usuario

Solicitud:
> *"Sí quiero que implementes la Fase 1, Luego la Fase 2"*

Tras Unit 26 (Fase 1, target <1s), Unit 27 apunta a latencia <300ms con
cambios estructurales: estrategia de caché en `/matches`, índices en Profile y
ProviderSyncRun, eliminación de N+1 en admin y dedup de queries frecuentes.

## 2. Causas y diagnóstico

El análisis extendido de performance (2026-06-15) identificó estos cuellos de
botella estructurales adicionales:

| # | Hallazgo | Archivo:línea | Impacto |
|---|----------|---------------|---------|
| 1 | `force-dynamic` en `/matches` fuerza cold start en cada request | `src/app/(app)/matches/page.tsx:9` | 500ms-1s |
| 2 | `Profile.deletedAt` sin índice — seq scan en `getGlobalRankSnapshot()` | `prisma/schema.prisma` + `ranking-events.ts:7` | >1s en tablas grandes |
| 3 | Admin N+1: 6 queries secuenciales por SYNC_SCOPE | `src/features/admin/queries.ts:44-51` | ~300ms |
| 4 | `ProviderSyncRun` index inservible: `(provider, scope, status)` vs query `scope`+`status` | `prisma/schema.prisma` | ~200ms |
| 5 | Queries frecuentes sin `React.cache()`: `getMyPools`, `getPoolDetail` | `src/features/pools/queries.ts` | ~100ms duplicado |

## 3. Decisión

**Implementar los 4 cambios de Fase 2 como Unit 27.** Complementan Unit 26:
cubren cache strategy, schema indexes y dedup de queries que Unit 26 no tocó
por tener mayor complejidad o requerir cambios de estrategia (ej. `force-dynamic`
→ `revalidate`).

## 4. Trazabilidad requisito → cambio

| FR-PERF-27 | Descripción | Archivo(s) | Tipo | Riesgo |
|------------|-------------|------------|------|--------|
| 27.1 | `force-dynamic` → `revalidate` en `/matches` | `src/app/(app)/matches/page.tsx` | Config | Medio |
| 27.2 | `@@index` parcial en `Profile.deletedAt` | `prisma/schema.prisma` + migración | Schema | Bajo |
| 27.3 | `@@index([scope, status, finishedAt])` + refactor N+1 | `prisma/schema.prisma` + `admin/queries.ts` | Schema + Query | Medio |
| 27.4 | `React.cache()` sobre `getMyPools()` y `getPoolDetail()` | `src/features/pools/queries.ts` | Dedup | Bajo |

## 5. Diseño detallado por historia

### FR-PERF-27.1 — Reemplazar `force-dynamic` en `/matches`

**Estado actual** (`src/app/(app)/matches/page.tsx:9`):
```ts
export const dynamic = "force-dynamic";
```

**Problema**: `force-dynamic` inhabilita toda caché de RSC payload y CDN. Cada
request a `/matches` fuerza una invocación serverless completa (cold start
incluido). Aunque Unit 22 cacheó el fixture con `unstable_cache` (tag
`competition-fixture`), la respuesta HTTP y el RSC payload se regeneran por
request.

**Cambio**: usar `export const revalidate = 60` (o un TTL apropiado). La página
sigue siendo dinámica (lee `cookies()` para el tema y locale, y
`getFixtureWithMyPredictions` para las predicciones del usuario), pero el RSC
payload puede cachearse en el CDN de Vercel por 60s. El fixture estático ya
está cacheado por Unit 22 (tag `competition-fixture`, backstop 300s); las
predicciones del usuario se revalidan como máximo cada 60s.

**Tradeoff**: las predicciones del usuario pueden mostrar datos de hasta 60s
de antigüedad. Dado que `/matches` es una vista de consulta (no de edición) y
las predicciones se editan desde la misma página pero con server actions
(refrescan el caché vía `revalidatePath`), el tradeoff es aceptable.

**Alternativa considerada**: ISR con `generateStaticParams` para el path único
`/matches` — descartada porque la página es por-usuario (predicciones) y no
hay path params. `revalidate` segment-level es el mecanismo correcto de Next.js
para este caso.

**Invalidación anticipada**: mantener `revalidatePath('/matches')` en
`savePrediction` (ya existe) para que tras guardar una predicción la página se
regenere fresco sin esperar el TTL.

### FR-PERF-27.2 — Índice parcial en `Profile.deletedAt`

**Estado actual**: `Profile` no tiene índice en `deletedAt`.

**Query afectada** (`src/features/scoring-rankings/services/ranking-events.ts`):
```ts
const rows = await prisma.profile.findMany({
  where: { deletedAt: null },
  select: { id: true, predictionScores: { select: { totalPoints: true } } }
});
```
Se ejecuta en cada `scoreMatch()` (cada partido puntuado). Para N usuarios,
escanea toda la tabla `Profile` secuencialmente. Con una base de usuarios
moderada (>1000) esto puede tomar >1s.

**Cambio**: agregar un **índice parcial** en `Profile.deletedAt`:
```prisma
model Profile {
  // ... campos existentes ...
  deletedAt           DateTime? @map("deleted_at") @db.Timestamptz()
  // ...

  @@index([deletedAt])
}
```

PostgreSQL puede optimizar `WHERE deleted_at IS NULL` con un índice parcial.
Como Prisma no soporta sintaxis de índice parcial directamente, se usa un
`@@index` estándar y PostgreSQL lo usa eficientemente para la condición
`IS NULL`. En una migración futura se puede refinar con SQL raw si el
optimizador no elige el index scan.

**Migración**: `prisma migrate dev --name unit27_profile_deleted_at_index`.

### FR-PERF-27.3 — Índice en ProviderSyncRun + refactor N+1

**Estado actual** — Admin N+1 (`src/features/admin/queries.ts:44-51`):
```ts
const latestByScope = await Promise.all(
  SYNC_SCOPES.map((scope) =>
    prisma.providerSyncRun.findFirst({
      where: { scope, status: "SUCCESS" },
      orderBy: { finishedAt: "desc" },
    })
  )
);
```
6 queries secuenciales (una por scope). El índice existente
`@@index([provider, scope, status])` no puede usarse eficientemente porque la
query filtra por `scope` + `status` sin `provider` (primera columna del índice).

**Cambio A (schema)**: agregar `@@index([scope, status, finishedAt])`:
```prisma
model ProviderSyncRun {
  // ... campos existentes ...
  @@index([scope, status, finishedAt])
}
```
Migración: `prisma migrate dev --name unit27_provider_sync_run_scope_index`.

**Cambio B (query)**: reemplazar el N+1 con una sola query:
```ts
const runs = await prisma.providerSyncRun.findMany({
  where: {
    scope: { in: SYNC_SCOPES },
    status: "SUCCESS",
  },
  orderBy: { finishedAt: "desc" },
});

// Agrupar en memoria por scope, tomar el más reciente de cada uno
const latestByScope = new Map<string, ProviderSyncRun>();
for (const run of runs) {
  if (!latestByScope.has(run.scope)) {
    latestByScope.set(run.scope, run);
  }
}
```

Con el índice `(scope, status, finishedAt)`, PostgreSQL ejecuta un index scan
para cada scope distinto y devuelve todas las filas `SUCCESS` ordenadas por
`finishedAt`. En memoria se toma solo la primera (la más reciente) por scope —
más rápido que 6 round-trips de red.

### FR-PERF-27.4 — `React.cache()` sobre queries frecuentes

**Queries objetivo**:

| Query | Archivo | Consumidores |
|-------|---------|-------------|
| `getMyPools()` | `src/features/pools/queries.ts` | `/pools` page, `PoolSwitcher` |
| `getPoolDetail(id)` | `src/features/pools/queries.ts` | `/pools/[id]` page, `PoolHeader` |

**Cambio**:
```ts
export const getMyPools = cache(async (userId: string) => {
  return prisma.poolMembership.findMany({ ... });
});

export const getPoolDetail = cache(async (poolId: string) => {
  return prisma.pool.findUnique({ ... });
});
```

**Nota**: `React.cache()` deduplica llamadas con los mismos argumentos dentro
del mismo render. Si `/pools/[id]/page.tsx` y `PoolHeader` (componente
compartido) llaman `getPoolDetail(id)`, solo se ejecuta una query. El `cache()`
es por-request y se limpia al terminar el render.

`getMyPools` actualmente **no** está cacheada y se llama desde la página
`/pools` + potencialmente desde el layout. Con `cache()`, una sola query
Prisma por request.

## 6. Plan de archivos (Code Generation)

```
src/
├── app/
│   └── (app)/
│       └── matches/
│           └── page.tsx                    # MODIFICAR: force-dynamic → revalidate
├── features/
│   ├── pools/
│   │   └── queries.ts                     # MODIFICAR: React.cache() en getMyPools/getPoolDetail
│   └── admin/
│       └── queries.ts                     # MODIFICAR: refactor N+1 → single query
prisma/
├── schema.prisma                          # MODIFICAR: @@index en Profile.deletedAt + ProviderSyncRun
└── migrations/
    ├── <ts>_unit27_profile_deleted_at_index/
    │   └── migration.sql                  # NUEVO
    └── <ts>_unit27_provider_sync_run_scope_index/
        └── migration.sql                  # NUEVO
```

## 7. NFR / Seguridad

- **Seguridad**: sin cambios en autorización ni validación. Security Baseline
  intacto. El índice en `Profile.deletedAt` no expone datos (solo acelera una
  query existente).
- **Compatibilidad**: `revalidate` es una directiva estándar de Next.js 16.
  Los índices son aditivos. `React.cache()` no cambia contratos de retorno.
- **Rollback**: índices se dropean. `revalidate` revierte a `force-dynamic`.
  `cache()` se remueve de las funciones.

## 8. Verificación

| Paso | Comando / criterio |
|------|--------------------|
| Generar Prisma | `pnpm prisma:generate` OK |
| Migración | `prisma migrate dev` crea dos migraciones; `migrate status` = applied |
| TypeScript | `tsc --noEmit` 0 errores |
| Lint | `pnpm lint` (ESLint) OK |
| Format | `pnpm check` (Biome) OK |
| Tests | `pnpm test` (Vitest) — suite completa verde, sin regresiones |
| Build | `pnpm build` OK |
| Latencia | TTFB en Vercel Analytics: objetivo <300ms en todas las páginas |
| Caché | Verificar que `/matches` devuelve `x-vercel-cache: HIT` tras primer request |
| Admin | Verificar que `/admin` carga en una sola query de ProviderSyncRun (no 6) |

## 9. Dependencias

- **Unit 26** (Performance Fase 1): Unit 27 asume que Unit 26 ya fue
  implementada (connection_limit=3, FK indexes, select en getProfile). Las
  queries de admin y pools se benefician del connection pool ampliado.
- **Unit 22** (Performance Recommendations): Unit 27 se apoya en el fixture
  cache (`competition-fixture`) y ranking cache (`rankings`) de Unit 22. Sin
  esos caches, `revalidate` en `/matches` tendría menos impacto.
- **Unit 6** (Scoring): FR-PERF-27.2 acelera `getGlobalRankSnapshot()` que se
  ejecuta en `scoreMatch()` (Unit 6).
- **Unit 7** (Admin): FR-PERF-27.3 toca el dashboard de admin (Unit 7).

## 10. Épica 26 — Historia de usuario

- **US-26.1**: Como usuario de la aplicación, quiero que la navegación se sienta
  instantánea (<300ms) en todas las pantallas. Criterios de aceptación:
  `/matches` sin `force-dynamic` (usa `revalidate`), índice en
  `Profile.deletedAt`, índice en `ProviderSyncRun` + sin N+1 en admin, dedup
  de `getMyPools` y `getPoolDetail`. Suite verde, build OK, TTFB <300ms.
