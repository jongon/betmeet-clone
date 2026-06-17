# Unit 37 — Performance Fase 3 (Functional Design, light)

> Post-construcción (2026-06-17). Implementa los ítems diferidos de **Unit 22**
> (NFR-PERF-REFINE-22.1/22.4/22.5) y añade optimizaciones de cold-start y scoring.
> **No reinicia** etapas aprobadas. Construye sobre Units 22/26/27/35.
> Cubre la **Épica 37** / **NFR-PERF-REFINE-37**.

## 1. Contexto y causa raíz

El usuario reportó lentitud **transversal** con la app en Vercel (serverless) y DB en
Supabase, **misma región** (us-east-1 / iad1) y connection pooler activo. El análisis de
Unit 22 ya había concluido que el cuello de botella son **round-trips de red por request**
y **recomputación sin caché**, no índices faltantes. Esta unidad implementa los fixes
diferidos y cierra los gaps de cold-start/concurrencia y del camino de scoring.

Hallazgos confirmados (anclados a código):
- `src/proxy.ts` hacía `auth.getUser()` (round-trip a GoTrue) **+** un `SELECT ... profiles`
  por PostgREST en **cada** request → 1–2 saltos remotos serializados antes de renderizar.
- `getAuthUser` (`src/lib/supabase/current-user.ts`) hacía otro `getUser()` por render (layout).
- `getPoolLeaderboard` no estaba cacheado y traía la fila de perfil completa por miembro.
- `connection_limit` fijo en 3 → encolado bajo Fluid Compute concurrente.
- `getGlobalRankSnapshot` traía todos los perfiles con todos sus scores y sumaba en JS, 2× por partido puntuado.

## 2. Decisiones por requisito

| Req | Decisión |
|-----|----------|
| 37.1 | `getClaims()` (verificación local del JWT con signing keys asimétricas) en proxy y `getAuthUser`. Gates de onboarding/email leen claims (`onboarding_completed`, `email_verified`) inyectados por un Custom Access Token Hook. **Fail-open** ante claim ausente. `completeOnboarding` → `refreshSession()`. |
| 37.2 | `getPoolLeaderboard` cacheado por `poolId` (`unstable_cache` + `RANKINGS_TAG`), `isViewer` por request; `select` en vez de `include`. Mutaciones de membresía invalidan `RANKINGS_TAG`. |
| 37.3 | `DB_CONNECTION_LIMIT` (default 5); `serverExternalPackages`; `engines.node >= 24`. Dashboard (Operations): Vercel Fluid Compute + región; Supabase keys + hook. |
| 37.4 | `getGlobalRankSnapshot` con `groupBy _sum` en DB (conserva perfiles con 0 puntos). |

## 3. Seguridad

- `getClaims()` con keys asimétricas verifica la **firma** localmente: un token no puede forjarse sin la clave privada. Tradeoff aceptado: la revocación server-side se refleja en el siguiente refresh (~1h), no instantáneamente — aceptable porque la capa de acciones (`getOnboardedUserId` vía Prisma) es la defensa autoritativa de mutaciones.
- El hook corre como `supabase_auth_admin`; se le concede `EXECUTE` sobre la función y una policy de **solo-lectura** sobre `profiles`. Sin exposición de datos a roles de cliente (`REVOKE ... FROM authenticated, anon, public`).
- Gates fail-open ante claim ausente: solo afecta a tokens previos al hook (usuarios que ya tenían sesión, por tanto con email confirmado); no degrada la seguridad de tokens nuevos (claims explícitos).

## 4. Contratos / archivos

- `src/proxy.ts` — `getClaims()`; gates por claim; sin query PostgREST.
- `src/lib/supabase/current-user.ts` — `getAuthUser(): AuthUser` (`{ id, email, emailVerified }`).
- `src/features/profile/queries.ts` — `getOrCreateProfile` usa `user.emailVerified`.
- `src/features/profile/actions/complete-onboarding.ts` — `refreshSession()`.
- `src/features/scoring-rankings/queries.ts` — `getPoolLeaderboardRows` cacheado.
- `src/features/pools/actions/{leave-pool,kick-member,join-pool-by-token,join-public-pool}.ts` — `updateTag(RANKINGS_TAG)`.
- `src/features/notifications/services/ranking-events.ts` — `getGlobalRankSnapshot` con `groupBy`.
- `src/lib/prisma.ts`, `next.config.ts`, `package.json` — pooling/bundle/node.
- `prisma/migrations/20260617120000_auth_access_token_hook/migration.sql` — hook + grants + policy.

## 5. Verificación

- `pnpm test` (258/258) y `pnpm build` (tsc OK) verdes.
- Tests actualizados: `current-user.test.ts` (mock `getClaims`), `complete-onboarding.test.ts` (mock `refreshSession`), `join-public-pool.test.ts` (mock `updateTag`).
- Post-deploy (Operations): en logs de Supabase, una navegación autenticada **no** dispara `/auth/v1/user` ni `SELECT profiles` por request. Smoke de auth (login email/MFA, Google, onboarding de usuario nuevo, verify-email) y de leaderboard de pool tras join/leave/kick.

## 6. SKIP

NFR Requirements / NFR Design formales — embebidos arriba. Sin rutas nuevas ni cambios de
modelo de datos (solo función/policy del hook).
