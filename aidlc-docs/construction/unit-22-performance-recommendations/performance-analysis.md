# Unit 22 — Recomendaciones de Performance · Análisis (grounded)

> Refine post-construcción (2026-06-14). **Análisis / recomendación**, no una
> implementación aprobada. **No reinicia** ninguna etapa ni Unit 1–21. Responde a la
> solicitud del usuario: *"Quiero saber qué recomendaciones de performance me das para
> esta aplicación, a veces la noto lenta."* Cubre la **Épica 21** (US-21.1) y el NFR
> **NFR-PERF-REFINE-22**.
>
> Cada hallazgo está anclado a código real (archivo:línea). La **implementación queda
> diferida** hasta que el usuario priorice (ver §5). No hay cambios de código en esta
> solicitud.

## 1. Método

Se trazaron las rutas calientes que se renderizan en cada navegación autenticada
(middleware → layout del grupo `(app)` → page → queries) y la capa de datos
(Prisma + Supabase Auth). El esquema (`prisma/schema.prisma`) ya está **bien
indexado** (FK, `@@unique`, `@@index` en `status`, `kickoffAt`, `userId`, etc.), así
que la lentitud **no** viene de índices faltantes sino de **round-trips de red por
request** y de **trabajo recomputado sin caché**.

## 2. Hallazgo principal (P0) — 3 round-trips a Supabase Auth por navegación

`supabase.auth.getUser()` **hace una llamada de red al servidor de Auth (GoTrue)**
para validar el JWT en *cada* invocación (no lee la cookie localmente). En una sola
carga de `/matches` se llama **tres veces, en secuencia**:

| # | Origen | Llamada | Archivo |
|---|--------|---------|---------|
| 1 | Middleware | `supabase.auth.getUser()` | `src/proxy.ts:67` |
| 2 | Layout `(app)` | `getProfile()` → `getUser()` | `src/app/(app)/layout.tsx:18` → `src/features/profile/queries.ts:77` |
| 3 | Page | `getCurrentUserId()` → `getUser()` | `src/app/(app)/matches/page.tsx:10` → `src/features/pools/services/session.ts:6` |

Tres viajes de ida y vuelta **serializados** a GoTrue antes de que la página empiece
a renderizar. Con latencia de red típica a Supabase (50–150 ms c/u) esto solo ya
añade **150–450 ms** de TTFB en cada navegación — la causa más probable de "a veces
la noto lenta". En rutas auth-only se suma una 4.ª llamada,
`mfa.getAuthenticatorAssuranceLevel()` (`src/proxy.ts:109`).

**Recomendaciones (en orden de impacto/esfuerzo):**

1. **Deduplicar `getUser()` dentro de un render con `cache()` de React.** ✅
   **IMPLEMENTADO (2026-06-14).** Nuevo `src/lib/supabase/current-user.ts` exporta
   `getAuthUser = cache(async () => createClient().auth.getUser())`. Los consumidores
   del render-path (`getProfile`, `getOrCreateProfile`, `getOnboardedUserId` en
   `features/profile/queries.ts`; `getCurrentUserId` en
   `features/pools/services/session.ts`) lo usan, de modo que las llamadas #2 y #3
   colapsan en **una sola** por render. Devuelve el `User` completo para conservar
   `email_confirmed_at` (lo usa `getOrCreateProfile`). Verificado: tsc 0, Biome/ESLint
   limpios, 182/182 tests (+2 `current-user.test.ts`), `next build` OK.
2. ⏸ **DIFERIDO (bloqueado por Operations).** **Usar `getClaims()` en lugar de
   `getUser()` donde solo se necesita el `id`/claims.**
   Con las *asymmetric JWT signing keys* de Supabase, `getClaims()` **verifica el JWT
   localmente** (sin viaje a GoTrue) y devuelve el `sub` (user id) y demás claims.
   `getCurrentUserId` (solo necesita el id) es candidato directo; ya quedó deduplicado
   por `cache()` (#1), así que migrarlo a `getClaims()` solo ayuda **además** de las
   llaves asimétricas.
   **Dos bloqueos verificados contra el código de auth-js 2.108.1:**
   (a) `getClaims()` solo evita el round-trip cuando el proyecto usa llaves de firma
   **asimétricas** (con HS256 simétrico cae a una llamada de red) → toggle de
   **Operations**; (b) el middleware **no** puede migrar tal cual: usa
   `user.email_confirmed_at` (`proxy.ts:78`) y **`email_confirmed_at` NO es un claim
   del JWT** (`JwtPayload` de auth-js solo trae `sub`, `email`, `aal`, `session_id`,
   …). Para migrar el middleware haría falta exponer `email_confirmed_at` como **claim
   custom** vía un Access Token Hook. `getUser()` se reserva para el estado fresco del
   servidor.
3. El middleware sigue necesitando construir el cliente SSR para **refrescar la cookie
   de sesión**, pero la *validación* puede ser local (claims) en vez de remota.

> Nota: el middleware corre en **todas** las requests que matchea
> `src/proxy.ts:147` (excluye estáticos e imágenes), así que cada `getUser` ahí pesa
> en toda navegación, no solo en las páginas de datos.

## 3. Hallazgo P1 — Doble gate de onboarding + perfil leído dos veces

Cada página del grupo `(app)` lee el flag de onboarding/perfil **dos veces** por dos
caminos de datos distintos:

- Middleware: `supabase.from("profiles").select("onboarding_completed")` vía PostgREST
  (`src/proxy.ts:128`).
- Layout `(app)`: `getProfile()` → `prisma.profile.findUnique` vía Postgres directo
  (`src/app/(app)/layout.tsx:18`).

La duplicación es **intencional** (defensa en profundidad; el middleware es fail-open
ante caída de la data-API — ver memoria `proxy-gate-fail-open-on-data-api-error`, y el
gate de Prisma es la línea confiable). Pero cuesta **dos lecturas de BD por página**.

**Recomendaciones:**

1. Mantener las dos capas (la decisión de fail-open es correcta), pero **envolver
   `getProfile()` en `cache()` de React** para que el layout y cualquier page/acción
   que lo vuelva a pedir en el mismo render compartan una sola query Prisma.
2. La lectura PostgREST del middleware puede seguir siendo `select("onboarding_completed")`
   (mínima, ya lo es) — no ampliar el `select`.

## 4. Hallazgo P1 — Fixture completo, sin caché y `force-dynamic`

`/matches` declara `export const dynamic = "force-dynamic"`
(`src/app/(app)/matches/page.tsx:7`) y `getFixtureWithMyPredictions`
(`src/features/predictions/queries.ts:133`) carga **toda la competición** en cada
visita: todas las fases → todos los partidos (104 en el Mundial) → `homeTeam`,
`awayTeam` **y `phase` por partido** → las predicciones+score del usuario. Es **una
sola query** (bien: sin N+1), pero el payload estático (fases/partidos/equipos) se
recomputa y re-serializa en **cada** carga.

**Recomendaciones:**

1. **Separar lo estático de lo por-usuario.** ✅ **IMPLEMENTADO (2026-06-14).** Nuevo
   `getStaticFixture` (privado en `predictions/queries.ts`) envuelto en
   `unstable_cache` con tag `competition-fixture` (constante en
   `features/competition/cache-tags.ts`) y `revalidate: 300` de backstop. Devuelve un
   DTO **serializable** (`kickoffAt` ya es ISO string en `MatchView`), por lo que
   sobrevive el borde del caché. `getFixtureWithMyPredictions` ahora lee ese fixture
   cacheado y le adjunta **solo** las predicciones del usuario (query pequeña
   `prisma.prediction.findMany({ where: { userId }, select: … })` + `Map` por
   `matchId`); el `merge` (elegibilidad vs `now`, lock, puntos) se computa en memoria
   por request. Invalidación por evento con `revalidateTag("competition-fixture",
   "max")` (SWR; la forma de 1 argumento está deprecada en Next 16.2.9) desde las tres
   rutas que escriben partidos en contexto de request: `triggerSync` (sync admin),
   `forceResult` y `revertOverride` (override/revert manual). `/matches` se mantiene
   `force-dynamic` (las predicciones por-usuario y las cookies lo hacen dinámico de
   todos modos); lo que cambia es que la **query pesada del fixture ya no toca la BD
   por request** sino que se sirve del Data Cache compartido entre usuarios.
2. **Eliminar el `include: { phase: true }` redundante por partido.** ✅
   **IMPLEMENTADO.** `getStaticFixture` ya no incluye `phase` por partido; el
   `phaseType` se propaga desde la fase padre al hacer el `merge`
   (`toPredictionMatchView(m, prediction, phase.type, now)`).

> Verificado: tsc 0, Biome/ESLint limpios, **186/186 tests** (+4
> `prediction-match-view.test.ts`), `next build` OK (24 rutas).

## 5. Hallazgo P2 — Rankings: agregación sin filtro ni caché

`getGlobalRanking` ejecuta `prisma.predictionScore.groupBy({ by: ["userId"], _sum })`
**sobre toda la tabla `PredictionScore`, sin filtro** y en cada carga de la página de
rankings (`src/features/scoring-rankings/queries.ts:25`). Crece con `usuarios × 104
partidos`. Lo mismo aplica, en menor escala, al leaderboard por pool
(`queries.ts:70-75`).

**Recomendaciones:**

1. **Cachear el ranking global** con `unstable_cache` + tag `rankings`, e
   **invalidarlo con `revalidateTag('rankings', 'max')`** tras cada recálculo de
   puntajes. ✅ **IMPLEMENTADO (2026-06-14).** `getGlobalRankingRows` (privado en
   `scoring-rankings/queries.ts`) envuelto en `unstable_cache` (tag `rankings` en
   `scoring-rankings/cache-tags.ts`, backstop 300s). Como el cómputo es
   **independiente del viewer** (el único campo por-usuario es `isViewer`),
   `getGlobalRanking(viewerId)` lee las filas cacheadas y solo aplica `isViewer` en
   memoria. Invalidación en las tres acciones que escriben scores vía `scoreMatch`
   (único escritor de `PredictionScore`): `triggerSync` (sweeper), `forceResult` y
   `revertOverride`. El `groupBy` sin filtro sobre toda la tabla deja de correr por
   visita.
2. **Leaderboard de pool por `poolId`**: ⏸ **NO cacheado (decisión de alcance).** A
   diferencia del global, su query ya está **acotada** (≤100 miembros, filtrada por
   `poolId`/`userId` con índices) y su correctitud exige invalidar también en **cambios
   de membresía** (join/leave/expulsión/crear pool) — varios sitios más y riesgo de
   listas de miembros stale. Coste/beneficio desfavorable frente al global; se deja
   para una iteración futura si se vuelve hot.
3. Opcional a mayor escala: materializar `totalPoints` por usuario (columna/vista) y
   actualizarlo en el recompute, evitando el `groupBy` por completo.

> Verificado: tsc 0, Biome/ESLint limpios, **186/186 tests** (el suite existente
> `global-ranking.test.ts` pasa con `unstable_cache` stubbeado a passthrough),
> `next build` OK.

## 6. Hallazgo P2 — Pooling de conexiones en producción

`.env.example` recomienda *"Use the transaction pooler in hosted Supabase/production"*
pero el ejemplo muestra **puerto 5432** (conexión directa) tanto en `DATABASE_URL`
como en `DIRECT_URL`. En despliegue serverless, abrir una conexión directa a Postgres
por invocación es lento y agota conexiones.

**Recomendación (Operations):** en prod, `DATABASE_URL` debe apuntar al **transaction
pooler de Supabase (puerto 6543, `?pgbouncer=true`)** y `DIRECT_URL` (5432) reservarse
solo para migraciones/CLI (ver memoria `prisma-migrations-need-supabase`). El adapter
`PrismaPg` (`src/lib/prisma.ts:39`) es compatible; solo es cuestión de la URL del
entorno. Verificar el valor real en el entorno de producción.

## 7. Hallazgos P3 (menores)

- **`isFrozen()` repetido** en `getPoolDetail` (`src/features/pools/queries.ts:74`,
  y por-pool en `getMyPools:25`): envolver en `cache()` de React para no recomputarlo
  por render.
- **Imágenes/avatares:** confirmar uso de `next/image` con `sizes` correctos en las
  tarjetas de partido y avatares (los avatares por defecto ya usan
  `unstable_cache` en `getDefaultAvatars`, `src/features/profile/queries.ts:7`).
- **Queries secuenciales independientes:** revisar oportunidades de `Promise.all`
  donde dos lecturas no dependen entre sí (la mayoría de los pares actuales **sí** son
  dependientes, p. ej. membership → totals, así que el margen es pequeño).

## 8. Prioridad recomendada

| Prio | Acción | Esfuerzo | Impacto en latencia |
|------|--------|----------|---------------------|
| **P0** | ✅ **HECHO** — `cache()` sobre el "usuario actual" (dedup `getUser` por render) | bajo | alto |
| **P0** | ⏸ Migrar validación a `getClaims()` (JWT local) en middleware + `getCurrentUserId` | medio (requiere llaves asimétricas en Supabase **+** claim custom `email_confirmed_at`) | alto |
| **P1** | `cache()` sobre `getProfile()` | bajo | medio |
| **P1** | ✅ **HECHO** — Cachear fixture estático con tag + invalidar en sync/override; quitar `phase` redundante | medio | alto en `/matches` |
| **P2** | ✅ **HECHO** (global) — Cachear ranking global con tag, invalidar en recompute. Leaderboard de pool: diferido (query acotada + invalidación por membresía) | medio | alto en `/rankings` |
| **P2** | Confirmar transaction pooler (6543) en prod | bajo (Operations) | medio |
| **P3** | `cache()` sobre `isFrozen()`; revisar `next/image`/`Promise.all` | bajo | bajo |

## 9. Verificación propuesta (si se implementa)

- **Medición antes/después**: contar llamadas a `getUser`/`getClaims` por request
  (logs o instrumentación) y medir TTFB de `/matches` y `/rankings`.
- Mantener verde la suite (`tsc` 0, Biome, ESLint, `pnpm test`) y `next build`.
- Confirmar que la invalidación por tag funciona: tras un sync/recompute, el fixture y
  los rankings reflejan los nuevos datos sin esperar a un TTL.
- Operations: verificar la URL del pooler en prod y (si se adopta `getClaims`) las
  llaves de firma asimétricas en el proyecto Supabase.

## 10. Épica 21 — Historia de usuario

- **US-21.1**: Como usuario de la aplicación, quiero que las pantallas autenticadas
  (especialmente `/matches` y `/rankings`) carguen rápido, para usar la app sin notar
  lentitud. Criterio de aceptación (NFR-PERF-REFINE-22): reducir los round-trips de
  auth por navegación de 3 a 1 y servir el fixture/rankings estables desde caché
  invalidada por evento (sync/recompute) en lugar de recomputarlos por request.
