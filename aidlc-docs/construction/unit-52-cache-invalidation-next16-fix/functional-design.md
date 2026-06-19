# Unit 52 — Invalidación de caché corregida para Next.js 16 (`updateTag` → `revalidateTag`) (Functional Design, light)

**Tipo**: bug fix / refine post-construcción sobre **Unit 35** (invalidación inmediata tras mutaciones admin), con impacto en **Unit 22/27/37** (caches `unstable_cache`), **Unit 50/51** (crons de sync/dispatch) y las Server Actions de membresía/override (Units 3, 45, 47, 48).
**No reinicia** Units 1–51. Sin schema, migraciones, rutas nuevas, auth ni cambios al algoritmo de scoring.
**Añadida vía** AI-DLC `/aidlc:refine` (2026-06-19).

## 1. Síntoma reportado

> "En algunas páginas tengo que refrescar dos veces el navegador para ver los resultados actualizados. Me sucede en `/matches`: entro al sitio por primera vez y veo resultados antiguos, pero si refresco me salen los nuevos — y estoy seguro de que ya estaban actualizados."

El doble refresh es el patrón clásico de **stale-while-revalidate**: el primer request tras vencer la ventana de tiempo sirve el valor stale (y regenera en background); el segundo ya sirve el valor fresco.

## 2. Causa raíz (Next.js 16)

Las vistas de resultados se sirven desde funciones `unstable_cache` con `revalidate: 300` y tags de invalidación por evento:

| Cache (`unstable_cache`) | Vista | Tag |
|---|---|---|
| `getStaticFixture` | `/matches` | `COMPETITION_FIXTURE_TAG` |
| `getGlobalRankingRows` | `/rankings` | `RANKINGS_TAG` |
| `getPoolLeaderboardRows` | `/pools/[id]/leaderboard` | `POOL_LEADERBOARD_TAG_PREFIX`, `RANKINGS_TAG` |

Unit 35 (2026-06-17) eligió **`updateTag`** como mecanismo de invalidación "inmediata / read-your-own-writes". En Next.js 16 eso tiene dos consecuencias que rompen la frescura:

1. **`updateTag` solo es válido dentro de un Server Action.** Llamado desde un **Route Handler** lanza el error `E872` ("updateTag can only be called from within a Server Action. … use revalidateTag instead"). El cron de sync automático (`/api/cron/sync/route.ts`, Unit 50/51) invoca `revalidateResultViews()` desde un Route Handler; la llamada **lanzaba en cada corrida** y quedaba tragada por su propio `try/catch` ("best-effort"). Resultado: el camino que más actualiza `/matches` (resultados/marcadores en vivo del cron) **nunca invalidaba** el cache del fixture.
2. Sin invalidación efectiva, el fixture sólo se refrescaba por su ventana temporal `revalidate: 300`, que es **stale-while-revalidate** → primer request stale, segundo fresco → **doble refresh**.

> Las **Server Actions** admin (`forceMatchResult`, `revertMatchOverride`, `triggerSync` — `"use server"`) sí ejecutaban `updateTag` sin lanzar, por eso el síntoma se notaba sobre todo en el flujo **automático** (cron), no en mutaciones manuales del admin.

### Bug secundario (leaderboard de pool)

`getPoolLeaderboardRows` está tagueado con el **prefijo desnudo** `POOL_LEADERBOARD_TAG_PREFIX` (`"pool-leaderboard-"`), pero `resetPredictionOverride` invalidaba `` `${POOL_LEADERBOARD_TAG_PREFIX}${poolId}` `` (con sufijo de pool). Los strings **nunca coinciden**, así que esa invalidación específica jamás impactaba el leaderboard cacheado (sólo lo salvaba el `RANKINGS_TAG` compartido en otras acciones).

## 3. Política corregida

| ID | Regla |
|---|---|
| BR-52.1 | Las entradas `unstable_cache` se invalidan con **`revalidateTag(tag, "max")`**, que funciona tanto en Server Actions como en Route Handlers. `updateTag` queda prohibido para estos caches (es Server-Action-only y lanza `E872` en Route Handlers). |
| BR-52.2 | El segundo argumento `"max"` reproduce la purga inmediata on-demand del `revalidateTag` clásico (el modo de un solo argumento quedó deprecado en Next.js 16). |
| BR-52.3 | El cron de sync (`/api/cron/sync`) debe poder invalidar fixture/rankings sin lanzar; tras el fix, `revalidateResultViews()` ya no arroja desde el Route Handler. El `try/catch` "best-effort" se conserva como defensa, pero deja de ser la causa de staleness. |
| BR-52.4 | La invalidación del leaderboard de pool usa el **mismo string** con que se tagueó el cache (`POOL_LEADERBOARD_TAG_PREFIX` desnudo), de modo que `resetPredictionOverride` realmente lo expira. |
| BR-52.5 | No cambia el cálculo de puntos, el modelo de datos ni el contrato de UI; sólo cambia la frescura de lectura tras writes. Se conserva `revalidatePath` en cada acción. |

## 4. Alcance del cambio (código)

Sustitución `updateTag(tag)` → `revalidateTag(tag, "max")` en todos los call sites que invalidan caches `unstable_cache`:

- `src/features/admin/services/revalidate-result-views.ts` — `COMPETITION_FIXTURE_TAG`, `RANKINGS_TAG` (este helper lo usan el cron y las 3 acciones admin).
- `src/features/pools/actions/kick-member.ts`, `join-public-pool.ts`, `leave-pool.ts`, `join-pool-by-token.ts` — `RANKINGS_TAG`.
- `src/features/predictions/actions/reset-prediction-override.ts` — `POOL_LEADERBOARD_TAG_PREFIX` (además se corrige el string al prefijo desnudo, BR-52.4).
- Comentarios de `cache-tags.ts` (competition y scoring-rankings) actualizados a `revalidateTag`.

Fuera de alcance: migrar a la API `"use cache"` / `cacheTag` / `cacheComponents`; cambiar las ventanas `revalidate: 300`; tocar `export const revalidate = 60` de `/matches` (inerte porque la página es dinámica por `cookies`).

## 5. Verificación

- `pnpm exec tsc --noEmit` → 0 errores.
- Biome + ESLint sobre los archivos tocados → limpio.
- Vitest: `revalidate-result-views.test.ts` (asserta `revalidateTag(tag, "max")`), `join-public-pool.test.ts` (mock actualizado), `trigger-sync.test.ts` (camino admin). Suite completa **377/377** con `DATABASE_URL` provisto.

## 6. Security Baseline Compliance

| Regla | Estado | Razón |
|---|---|---|
| SECURITY-08 | Compliant | Las acciones conservan sus guards (`getAdminUserId`/membresía); el cambio sólo altera el mecanismo de invalidación de caché, no la autorización. |
| SECURITY-05 | N/A | No hay nuevo input ni endpoints. |
| SECURITY-01/02/03/04/06/07/09–15 | N/A | Sin cambios de infra, auth, red, deps, logging sensible ni datos. |

No hay hallazgos bloqueantes.
