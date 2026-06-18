# Units of Work

## Decomposition Strategy

The application remains a single Next.js monolith deployed to Vercel. Units are logical development slices inside the monolith, not independently deployable services.

## Code Organization Strategy

Use a hybrid structure:

```text
src/
├── app/                         # Next.js App Router routes
├── components/                  # shared UI primitives and shadcn/ui components
├── features/                    # domain feature modules
│   ├── auth/
│   ├── profile/
│   ├── ux-education/
│   ├── competition/
│   ├── pools/
│   ├── predictions/
│   ├── scoring/
│   └── admin/
├── lib/                         # shared utilities, env, validation, logging
├── generated/                   # generated Prisma client
└── types/                       # shared app types when not feature-local
```

Feature modules should own their server actions, schemas, services, and feature-specific components. Shared primitives stay in `src/components` and `src/lib`.

## Unit 1: Foundation - Auth, Profile, Nickname, Avatar

**Goal**: Enable users to authenticate and establish a public identity.

**Responsibilities**:
- Supabase Auth SSR setup.
- Email/password, Google OAuth, passkeys/MFA integration points.
- Profile creation linked to Supabase `auth.users`.
- Verification state: unverified, verified, administrator.
- Classic `nickname#1234` discriminator.
- Avatar source: Google photo, default avatar set, Supabase Storage upload.

**Primary Deliverable**: User can sign up, log in, complete profile, and see their public identity.

## Unit 2: UX Education and Onboarding

**Goal**: Make the rules and first-run experience understandable.

**Responsibilities**:
- Public rules summary and authenticated full Rules Center.
- Onboarding flow for nickname, avatar, rules, pool action, first next step.
- Contextual scoring explanations and in-app cues.
- Landing explanation of quiniela, pools, and scoring.

**Primary Deliverable**: User understands how to play before making predictions.

## Unit 3: Pools and Membership

**Goal**: Allow verified users to create, discover, join, and manage pools.

**Responsibilities**:
- Public/private pool creation.
- Public pool directory with search/filter.
- Invite links/codes for private pools.
- Capacity limit up to 100.
- Multiple pool membership per user.
- Pool admin member removal before first match only.

**Primary Deliverable**: First milestone from user answer: user can sign up, complete profile, and create or join a pool.

## Unit 4: Competition Data and API Sync

**Goal**: Provide the tournament, fixture, teams, and match states needed for predictions.

**Responsibilities**:
- World Cup-like seed/demo data for development and tests.
- Competition, phase, team, match, and match result models.
- football-data.org adapter as default provider (era API-Football; migrado en Unit 25).
- Sync v1 manual (server action admin); Supabase Edge scheduled jobs como scaffold/cron a futuro.
- Provider sync logs and error states.

**Primary Deliverable**: Fixture and match states are available without relying on manual setup.

## Unit 5: Predictions and Match Locking

**Goal**: Allow users to predict matches safely before kickoff.

**Responsibilities**:
- Submit/update score predictions before match start.
- Server-authoritative kickoff lock.
- Knockout penalty winner option only on tied predictions.
- Immutable prediction records once locked.

**Primary Deliverable**: User can predict available matches with correct lock behavior.

## Unit 6: Scoring and Pool Rankings

**Goal**: Calculate points and show pool standings.

**Responsibilities**:
- Deterministic scoring engine.
- Exact score 5 points.
- If not exact, correct winner/draw adds 2 points.
- If not exact, each matched team goal count adds 1 point and stacks with the winner/draw points.
- Penalty winner bonus +1 in knockout.
- Pool-only leaderboard.
- Tied users share winner/rank state with no tiebreakers.

**Primary Deliverable**: Scores are computed before full leaderboard UI polish, then shown per pool.

## Unit 7: Admin and Observability

**Goal**: Provide global administrators operational visibility and fallback controls.

**Responsibilities**:
- Build late after core user flows.
- Show sync status and sync failures.
- Show how public and private pools are progressing.
- Global-admin-only manual result override.
- Trigger recalculation after overrides.
- Audit events for sensitive admin actions.
- Full observability can mature after MVP.

**Primary Deliverable**: Admin can inspect system state and safely correct match result issues.

## Unit 8: Design System and UI Polish

**Goal**: Give the product a distinctive, modern, accessible visual identity backed by a robust, themeable design system — without rewriting feature components.

**Responsibilities**:
- Added post-construction via `/aidlc-refine` (cross-cutting; does not change Units 1–7 behavior).
- Three-layer token architecture (primitive → semantic → component) in `src/app/globals.css`, building on the existing `@theme inline` + CSS-variable setup.
- Two orthogonal theming axes: brand/personality (`data-theme`: `deportivo` default | `moderno` | `premium`) and color scheme (`.dark`: light | dark), so the visual personality is switchable without touching components.
- Default brand: "deportivo/enérgico" identity (energetic palette + display typography aligned to the football domain).
- Brand selector (context + `data-theme` on `<html>` + anti-FOUC script) alongside the existing `next-themes` light/dark toggle.
- Component variant refinements (`src/components/ui/*`) only where new tokens require it; polish of anchor screens (landing, pools, matches/predictions, rankings).
- Accessibility: AA contrast across all brand × scheme combinations, visible focus, keyboard-navigable theme/brand controls.

**Primary Deliverable**: A coherent, themeable UI where the brand personality and light/dark scheme can switch at runtime, with no regression to the 111 passing tests.

## Unit 9: Transactional Email

**Goal**: Formalize how the application sends email — keep the sending code/configuration in the repo while the live templates are hosted "elsewhere" (Supabase) — without adding email infrastructure to the stack.

**Responsibilities**:
- Added post-construction via `/aidlc-refine` (2026-06-11); cross-cutting; does not change Units 1–8 behavior.
- Channel: Supabase Auth with **Resend configured as Custom SMTP**. No new npm dependencies; the send triggers are the existing Supabase SDK calls in `src/features/auth/actions/` (`sign-up`, `forgot-password`, `change-email`).
- Auth email templates versioned in the repo at `supabase/templates/*.html`, wired via `supabase/config.toml` `[auth.email.template.<type>]` (`content_path` + `subject`). Supabase hosts/sends them; the source lives here and is reviewed in PRs.
- Brand-aligned HTML (Unit 8 identity), self-contained inline styles for email-client compatibility.
- Environments: dev uses the `resend.dev` sandbox; production requires a verified domain in Resend (DKIM/SPF/DMARC) — an Operations prerequisite.
- Business/notification emails (pool invites, results/points, reminders, kick, sync alerts) are a documented **backlog catalog** (FR-EMAIL-01 Group B); they would require the Resend SDK and are out of the "only what's needed" MVP scope. Cron-triggered ones (reminders, digest, ranking, alerts) must send from a job, not inline.

**Primary Deliverable**: Auth emails sent via Supabase + Resend SMTP with repo-versioned templates, plus a complete proposed catalog of all project emails — with no runtime change and no regression to the passing tests.

## Unit 10: Web Push Notifications

**Goal**: Let users opt into low-cost web push notifications and control which event types they receive.

**Responsibilities**:
- Added post-construction after Unit 9 was reserved for transactional email; additive and does not restart approved Units 1–9.
- Web Push subscription lifecycle: request permission, register service worker, store VAPID subscription, revoke/deactivate devices.
- User notification preferences for match start, match finish, pool invitation, global ranking improvement, and live goal events.
- Notification event log/outbox to deduplicate sends from repeated sync/scoring runs.
- Integrations with Unit 3 pool invitations, including new directed invitations by nickname/email while preserving existing link/code invites; Unit 4 match status/score changes; and Unit 6 global ranking movement.
- Provider adapter with v1 baseline `standard-web-push`; OneSignal/FCM/Novu remain future adapters, not required for MVP.

**Primary Deliverable**: A verified user can enable browser push, select notification types, and receive deduplicated event notifications without paid push infrastructure.

## Unit 11: App Shell & Navigation

**Goal**: Give authenticated users (and admins) a consistent global chrome that surfaces session identity, profile/security access, theme/brand switching, and sign-out — across the whole app.

**Responsibilities**:
- Added post-construction via `/aidlc-plan`; UI-only and additive; does not restart approved Units 1–10.
- Introduce a route-group layout (`src/app/(app)/layout.tsx`) or shared `AppHeader` mounted on authenticated routes (`/matches`, `/pools`, `/rules`, `/settings/*`) and admin (`/admin/*`). Not mounted on `(auth)` or `/onboarding/*`.
- Session indicator (avatar + nickname) and a user menu: profile (`/settings/profile`), security (`/settings/security`), admin link gated by `verificationStatus === "ADMIN"`, and sign-out (existing `signOut()` action).
- Primary navigation with active state (`aria-current`); responsive collapse on mobile.
- Mount existing `ThemeToggle` and `BrandToggle` inside the app chrome (no duplicated theme/auth logic).
- Admin context affordance + return-to-app; admin gate (`notFound()`) preserved.

**Reuses (no new abstractions)**: `signOut()`, `ThemeToggle`, `BrandToggle`, `Avatar`, `getProfile()`/`getDisplayNickname()`, `verificationStatus`, Unit 8 brand tokens. No schema/API changes. `src/proxy.ts` untouched.

**Primary Deliverable**: On every authenticated route (including admin), the user can see they are signed in and can switch theme/brand, open profile/security, and sign out from a consistent header.

## Unit 24: Internacionalización y Selector de Idioma

**Goal**: Convertir la aplicación en una experiencia bilingüe español/inglés, con español por defecto, sin mezclar copys y sin cambiar las URLs existentes.

**Responsibilities**:
- Added post-construction via `/aidlc-refine` (2026-06-15); transversal y aditivo; does not restart approved Units 1–23.
- Ampliar `src/i18n` de `es` único a `es` + `en`, manteniendo `es` como fuente del tipo `Dictionary` y default de producto.
- Mantener la estrategia de Unit 2 **Opción A**: i18n sin prefijo `[locale]`; no crear rutas `/es/*` ni `/en/*`.
- Persistir preferencia de idioma en cookie `locale` para SSR sin flash y en `profiles.locale` para sincronización cross-device.
- Añadir selector de idioma en `UserMenu` y `Settings/Profile`, conservando la ruta actual al cambiar idioma.
- Externalizar toda copy visible hardcoded a diccionarios tipados: auth, onboarding, settings, pools, predictions, competition, admin, notifications, app pages, nav/theme/brand y mensajes/errores.
- Traducir el Centro de Reglas MDX: mantener `content/rules/es/*.mdx` y crear `content/rules/en/*.mdx` con frontmatter compatible.
- Respetar CF-5 y los préstamos naturales: `email`, `passkey`, `nickname`, `Google`, `WebAuthn`, `TOTP`, `push`/`web push` se conservan; `Pool` visible sigue siendo **Liga** en español.

**Primary Deliverable**: El usuario puede alternar entre español e inglés desde la app; toda la UI y el Centro de Reglas se renderizan en el idioma activo, con URLs estables y sin mezcla de copy.

## Unit 25: Sync con football-data.org

**Goal**: Reemplazar el stub `ApiFootballProvider` por un provider real contra football-data.org, manteniendo el contrato `CompetitionProvider` existente.

**Responsibilities**:
- Added post-construction via `/aidlc:refine` (2026-06-15); aditivo y no reinicia Units 1–24.
- Implementar `FootballDataProvider` contra `GET /v4/competitions/WC/matches?season=2026` con `X-Auth-Token` (`FOOTBALL_DATA_KEY`).
- Mapear cada match del API a `NormalizedMatch`/`NormalizedTeam` (status vía `mapFootballDataStatus`, marcadores `score.fullTime.* ?? null`, fase vía `stageToPhaseName`).
- Filtrar por scope (`FIXTURES`/`LIVE_STATUS`/`RESULTS`/`FULL`) con `status`/`dateFrom`/`dateTo`; traducir 429 → `RATE_LIMITED`.
- El orquestador escribe `provider="FOOTBALL_DATA"` en `ProviderSyncRun`; sin cambios de schema, migraciones ni rutas.

**Primary Deliverable**: La sincronización admin trae fixtures y resultados reales desde football-data.org a través del adapter, sin tocar el orquestador ni el schema.

## Unit 26: Performance Fase 1 — Quick Wins

**Goal**: Reducir latencia de navegación de 2-3s a <1s con cambios de bajo riesgo y alto impacto sobre el perfil del usuario, la paralelización de queries, la conexión a BD y los índices del fixture.

**Responsibilities**:
- Added post-construction via AI-DLC refine (2026-06-15); aditivo y no reinicia etapas aprobadas.
- `getProfile()` retorna solo columnas necesarias con `select` y se deduplica por render con `React.cache()`, eliminando lecturas redundantes en layout `(app)` + AppHeader + pages.
- `/pools/[id]` ejecuta `getPoolDetail` y `getPoolLeaderboard` en `Promise.all()` en lugar de secuencial.
- El pool de conexiones `@prisma/adapter-pg` sube `connection_limit` de 1 a 3, permitiendo concurrencia de queries dentro del mismo request por el pooler de Supabase (:6543).
- Índices en `Match.homeTeamId` y `Match.awayTeamId` aceleran los JOINs del fixture (presentes en cada carga de `/matches` y admin).
- Sin cambios de schema salvo la migración de los dos `@@index`; sin nuevas columnas ni tablas.

**Primary Deliverable**: Las pantallas principales cargan en <1s (desde 2-3s). Suite de tests verde, build OK, sin cambios funcionales visibles.

## Unit 27: Performance Fase 2 — Estructural

**Goal**: Reducir latencia de navegación a <300ms con cambios estructurales: estrategia de caché en `/matches`, índices en Profile/ProviderSyncRun, eliminación de N+1 y dedup de queries frecuentes.

**Responsibilities**:
- Added post-construction via AI-DLC refine (2026-06-15); aditivo y no reinicia etapas aprobadas.
- `/matches` reemplaza `force-dynamic` por `revalidate` con TTL corto, apoyándose en el fixture cacheado de Unit 22 (tag `competition-fixture`) y manteniendo predicciones por-usuario frescas con `cookies()`.
- Índice parcial en `Profile.deletedAt` (WHERE `deleted_at IS NULL`) acelera `getGlobalRankSnapshot()` y `checkNicknameAvailability()`.
- Índice en `ProviderSyncRun(scope, status, finishedAt)` + refactor del N+1 del admin dashboard (6 queries secuenciales → 1 query con GROUP BY o carga agrupada).
- `React.cache()` sobre `getMyPools()` y `getPoolDetail()` para dedup por render.
- Sin cambios de schema salvo las dos migraciones de `@@index`; sin nuevas columnas ni tablas.

**Primary Deliverable**: La navegación se siente instantánea (<300ms TTFB). Suite de tests verde, build OK, sin cambios funcionales visibles.

## Unit 28: Persistencia de matches en sync-orchestrator

**Goal**: Hacer que la sincronización persista los partidos en la BD (el orquestador buscaba resultados pero no guardaba matches), separando el seed de estructura del de matches.

**Responsibilities**:
- Added post-construction via `/aidlc:build` (2026-06-16); aditivo y no reinicia Units 1–27.
- `syncMatchesToDB()` identifica cada match por `providerMatchId` (UPDATE si existe); CREATE solo de `SCHEDULED`/`LIVE` nuevos; SKIP de `FINISHED`/`POSTPONED`/`CANCELLED` inexistentes (no importar resultados históricos en BD fresca).
- Resolver fase por nombre (`buildPhaseMap()` + `findActiveCompetition()`); UPDATE de status + marcadores; notificaciones de inicio/fin best-effort; `itemsUpdated` = matches procesados.
- Extraer `seedCompetitionStructure()` de `seedWorldCup2026()` (backward-compat) para sembrar estructura sin matches; fix de `homeFifaCode`/`awayFifaCode` para `tla` null/vacío en knockout.
- Sin nuevas tablas/columnas ni rutas; cambio acotado al orquestador y al script de seed.

**Primary Deliverable**: Al sincronizar, los partidos quedan creados/actualizados en la BD y disponibles para el fixture y el scoring.

## Unit 29: Seed de partidos desde football-data.org con snapshot

**Goal**: Que `pnpm prisma:seed:competition` siembre los partidos desde football-data.org (solo los que faltan por ocurrir, idempotente), con un snapshot commiteado como respaldo offline.

**Responsibilities**:
- Added post-construction via `/aidlc:start` (2026-06-16); aditivo y no reinicia Units 1–28. Construye sobre Unit 25 (`FootballDataProvider`) y Unit 28 (`syncMatchesToDB`, `seedCompetitionStructure`).
- Nuevo `seedMatchesFromFootballData()` (`services/seed-matches.ts`): 1 llamada `fetch("FULL", { windowKey: "seed-full" })` (toda la competición); reescribe el snapshot `seed/snapshots/world-cup-2026-fixtures.json`; persiste vía `runCompetitionSync` (idempotente por `providerMatchId`, create-only `SCHEDULED`/`LIVE` → solo partidos pendientes).
- Fallback: API caída + snapshot → siembra desde snapshot con warning; sin API ni snapshot → falla.
- Scope `FULL` (no `FIXTURES`) para no perder los partidos `TIMED`; el filtro por estado lo hace el persist.
- Elimina el seed estático incorrecto (`WORLD_CUP_2026_MATCHES`, `seedWorldCup2026()`, `upsertMatch`). Knockouts en fase de grupos se registran con equipos `null` (TBD). Sin schema, migraciones ni rutas.

**Primary Deliverable**: El seed registra los partidos pendientes del Mundial 2026 desde football-data.org de forma idempotente, con respaldo en snapshot cuando la API no está disponible.

## Unit 31: "Revertir a la API" también revierte el puntaje de los usuarios

**Goal**: Que al revertir un override manual en el admin panel se reviertan también los puntos que los usuarios ganaron con ese resultado.

**Responsibilities**:
- Added post-construction via `/aidlc:start` (2026-06-16); aditivo y no reinicia Units 1–30. Refine sobre Unit 7 (Admin) + Unit 6 (Scoring).
- `revertMatchOverride` (`features/admin/actions/revert-override.ts`) limpia el resultado manual (`homeScore`/`awayScore`/`homePenaltyScore`/`awayPenaltyScore`/`winnerTeamId` → `null`, `status` → `SCHEDULED`) además de los flags de override; `scoreMatch()` encuentra el partido no-scoreable y elimina los `PredictionScore` (BR-6.7) → puntos revertidos. El próximo sync repuebla el resultado real.
- Diálogo de confirmación en `RevertOverrideButton` (reusa `Dialog` de base-ui) porque la acción es destructiva.
- Sin schema, migraciones ni rutas; sin snapshot del resultado API previo (se limpia, no se restaura).

**Primary Deliverable**: Revertir un override deja el partido en `SCHEDULED` sin resultado y sin puntos asociados, devolviendo el control a la API.

## Unit 34: Códigos FIFA en `/admin/matches`

**Goal**: Que el panel `/admin/matches` identifique los partidos con códigos de 3 letras (`BRA vs ARG`) en lugar de nombres largos.

**Responsibilities**:
- Added post-construction via refine (2026-06-16); UI-only y no reinicia Units 1–33. Refine sobre Unit 7 (Admin) y reutiliza la decisión de Unit 4/CF-3 (`Team.fifaCode` como código futbolístico de 3 letras).
- Renderizar la etiqueta admin del partido con `homeTeam.fifaCode` / `awayTeam.fifaCode` en formato `XXX vs YYY` para filas y diálogos de override/reversión.
- Preservar placeholders existentes cuando un lado no tenga equipo resuelto; sin cambios de schema, rutas, scoring, seed ni sync.

**Primary Deliverable**: Los admins ven partidos como `BRA vs ARG` en `/admin/matches`, con fallback correcto para cruces TBD.

## Unit 35: Invalidación inmediata de caché tras mutaciones admin

**Goal**: Que después de forzar, revertir o sincronizar resultados desde admin, las vistas de usuario (`/matches`, `/rankings`, `/pools` y rankings de liga) muestren datos actualizados en la siguiente navegación/refresco normal, sin requerir dos refreshes.

**Responsibilities**:
- Added post-construction via AI-DLC refine (2026-06-17); bug fix sobre Unit 7/31 + caches de Unit 22/27. No reinicia Units 1–34.
- Centralizar la invalidación de datos afectados por resultados/scoring en un helper compartido para acciones admin.
- Reemplazar semántica stale-while-revalidate (`revalidateTag(tag, "max")`) por expiración inmediata (`updateTag`) en Server Actions admin donde se necesita read-your-own-writes.
- Revalidar rutas de usuario afectadas: `/matches`, `/rankings`, `/pools`, `/pools/[id]` y `/pools/[id]/leaderboard`, además de rutas admin existentes.
- Sin schema, migraciones, rutas nuevas ni cambios de scoring matemático.

**Primary Deliverable**: Mutaciones admin de resultados invalidan fixture/rankings/rutas dependientes inmediatamente y eliminan el síntoma de doble refresh.

## Unit 36: Scoring acumulativo por ganador y goles acertados

**Goal**: Ajustar la regla matemática de scoring para que, salvo marcador exacto, los puntos por resultado correcto y por goles acertados se sumen.

**Responsibilities**:
- Added post-construction via AI-DLC refine (2026-06-17); cambio de reglas sobre Units 2/6. No reinicia Units 1–35.
- Mantener exact score = 5 como caso máximo/base histórico.
- Si no hay exacto, sumar 2 puntos por ganador/empate correcto + 1 punto por cada equipo cuyo gol coincida.
- Conservar bonus de penales +1 adicional cuando aplique.
- Actualizar calculadora educativa, copy de reglas y desgloses visibles/persistidos para mostrar componentes acumulados.
- Sin schema/migraciones por defecto; evaluar solo si el desglose actual no puede representar componentes.

**Primary Deliverable**: `BRA 2-1 ARG` vs predicción `BRA 3-2 ARG` puntúa 3 (2 ganador + 1 gol), y la UI explica esa suma.

## Unit 37: Performance Fase 3 — Implementación de diferidos de Unit 22

**Goal**: Eliminar los round-trips de auth por request y la recomputación sin caché que Unit 22 dejó diferidos, más cold-start y scoring.

**Responsibilities**:
- Added post-construction via AI-DLC refine (2026-06-17); implementa NFR-PERF-REFINE-22.1/22.4/22.5. No reinicia Units 1–36.
- `getClaims()` (verificación local del JWT) en `proxy.ts` y `getAuthUser`; gates por claims de un Custom Access Token Hook (`email_verified`, `onboarding_completed`); fail-open ante claim ausente; `refreshSession()` tras onboarding.
- Caché del leaderboard de pool por `poolId` + `RANKINGS_TAG`, sin over-fetch; invalidación en mutaciones de membresía.
- `DB_CONNECTION_LIMIT` (default 5), `serverExternalPackages`, `engines.node >= 24`; config de dashboard (Operations).
- `getGlobalRankSnapshot` con `groupBy _sum` en DB.

**Primary Deliverable**: una navegación autenticada normal deja de hacer round-trips a GoTrue/PostgREST por request; migración del hook (`20260617120000_auth_access_token_hook`).

## Unit 38: Gestión de passkeys desde Perfil → Seguridad

**Goal**: Permitir a los usuarios listar, eliminar y registrar passkeys desde `/settings/security`, llenando el gap entre el diseño original de Unit 1 (RULE-SEC-02, WF-13) y la implementación actual.

**Responsibilities**:
- Added post-construction via AI-DLC refine (2026-06-17); implementa FR-REFINE-38.1…38.4. No reinicia Units 1–37.
- Listar passkeys del usuario con `supabase.auth.passkey.list()` (API nativa, CF-10).
- Eliminar passkeys con confirmación y `supabase.auth.passkey.delete(id)`.
- Registrar nuevos passkeys desde Seguridad usando `supabase.auth.registerPasskey()` (reutiliza mecanismo del onboarding de Unit 20).
- Sección de passkeys integrada en la página `/settings/security` existente, bajo la sección de TOTP MFA (sistemas independientes; TOTP no se toca).
- Sin schema, migraciones ni rutas nuevas.
- Copy i18n (`es`/`en`) para la sección de gestión de passkeys.

**Primary Deliverable**: el usuario ve sus passkeys registrados en `/settings/security`, puede eliminar los que ya no use, y puede registrar nuevos sin volver al onboarding.

## Unit 39: Sync — unique constraint conflict en `Team.providerTeamId`

**Goal**: Eliminar el `@unique` de `Team.providerTeamId` para que el sync de football-data.org deje de fallar con "Unique constraint failed on the fields: (`provider_team_id`)" cuando el API devuelve el mismo ID numérico para equipos con distinto `fifaCode`.

**Responsibilities**:
- Added post-construction via AI-DLC refine (2026-06-17); implementa FR-REFINE-39.1…39.3. No reinicia Units 1–38.
- Remover `@unique` de `providerTeamId` en `prisma/schema.prisma`.
- Crear migración Prisma: `DROP INDEX IF EXISTS "teams_provider_team_id_key"`.
- Sin cambios de código: `upsertTeam` ya usa `fifaCode` como llave correcta.
- `providerTeamId` nunca se usa como llave de búsqueda en el código; es metadata informacional.
- Sin cambios de UI, rutas, scoring, predicciones ni auth.
- Security Baseline intacto: cambio de modelo de datos, no de autenticación/autorización.

**Primary Deliverable**: el sync desde `/admin` se completa sin errores de unique constraint en `provider_team_id`.

## Unit 40: Contraste del selector de tipo de sync en `/admin` dark mode

**Goal**: Corregir el contraste del selector de tipo/scope de sincronización en `/admin` para que todas las opciones sean legibles en modo oscuro.

**Responsibilities**:
- Added post-construction via AI-DLC refine (2026-06-17); implementa FR-REFINE-40.1…40.2. No reinicia Units 1–39.
- Ajustar estilos del `<select data-testid="admin-sync-scope">` y sus `<option>` para usar tokens de fondo/texto compatibles con light/dark.
- Mantener intactos los scopes (`FIXTURES`, `LIVE_STATUS`, `RESULTS`, `FULL`), el scope por defecto y la llamada a `triggerSync()`.
- Sin schema, migraciones, rutas, sync logic, providers, scoring, predicciones ni auth.
- Security Baseline intacto: no cambia el gate admin ni las acciones server-side.

**Primary Deliverable**: en `/admin`, el selector de sync es legible en modo oscuro tanto cerrado como con el menú de opciones abierto.

## Unit 41: Predicciones visibles dentro del pool

**Goal**: Los participantes de un pool pueden ver las predicciones de otros miembros para partidos que ya comenzaron, agrupadas por jornada.

**Responsibilities**:
- Added post-construction via AI-DLC refine (2026-06-17); implementa FR-REFINE-41.1…41.5 / US-41.1. No reinicia Units 1–40.
- Nueva query Prisma `getPoolMemberPredictions(poolId)`: lee `Prediction` + `PredictionScore` para todos los miembros del pool, filtrada por `Match.kickoffAt <= now` (partidos ya comenzados). Gate de membresía vía `getCurrentUserId()`.
- Nuevo server component `PoolPredictionsView`: agrupa por día, renderiza tabla (filas=miembros, columnas=partidos, celdas=goles+puntos). Adaptable a mobile con scroll horizontal.
- Integración en `/pools/[id]`: nueva pestaña "Predicciones" en los Tabs existentes (junto a Clasificación y Miembros).
- Claves i18n ES+EN bajo `pools.predictions.*` para labels de pestaña, encabezados de jornada, indicadores "sin predicción" y "pendiente de scoring".
- Sin schema, migraciones, rutas nuevas, ni cambios en el modelo de datos. Reutiliza `Prediction`, `PredictionScore`, `Match`, `PoolMembership` y `Profile`.
- Security Baseline intacto: query server-authoritative; gate de membresía existente sin cambios.

**Primary Deliverable**: Pestaña "Predicciones" funcional en `/pools/[id]` mostrando las predicciones de todos los miembros para partidos pasados/en curso.

## Unit 42: Agrupación de partidos por día local del usuario

**Goal**: Corregir `/matches` para que los encabezados de día reflejen la fecha local del usuario, no el día UTC del kickoff.

**Responsibilities**:
- Added post-construction via AI-DLC refine (2026-06-17); implementa FR-REFINE-42.1…42.5 / US-42.1. No reinicia Units 1–41.
- Actualizar el criterio de `groupFixtureByDay` para derivar `dayKey` y label desde una timezone explícita del usuario, con fallback seguro si no está disponible.
- Mantener el orden cronológico por `kickoffAt` absoluto y el bucket `Fecha por confirmar` para partidos sin fecha.
- Alinear el filtro de partidos anteriores de Unit 30 con el mismo día local.
- Alinear la agrupación por jornada de Unit 41 con el mismo criterio local que `/matches`.
- Sin schema, migraciones, rutas nuevas, sync, scoring, admin ni auth.

**Primary Deliverable**: Un partido que para el usuario ocurre a las 01:00 del 18 de junio aparece bajo el bloque del 18 de junio en `/matches`, y las vistas dependientes por jornada usan el mismo criterio.

## Unit 43: Web Push — Onboarding step + dispatch en sync admin

**Goal**: Permitir al usuario activar web push desde el onboarding y asegurar que las notificaciones encoladas por la sincronización admin se despachen automáticamente.

**Responsibilities**:
- Added post-construction via AI-DLC refine (2026-06-18); implementa FR-REFINE-43.1…43.2 / US-43.1…43.2. No reinicia Units 1–42.
- Añadir paso "Notificaciones" en el onboarding entre reglas y passkey (nickname → avatar → reglas → notificaciones → passkey), reutilizando el panel de notificaciones existente (`NotificationSettingsPanel`).
- El paso es skippable; si el navegador no soporta web push o faltan VAPID keys, muestra mensaje informativo y solo permite continuar.
- Al activar desde onboarding, los 5 tipos de notificación se inicializan activados por defecto.
- Llamar `dispatchPendingNotifications()` al final de `triggerSync()` (tras `scoreFinishedUnscoredMatches()`) para drenar el outbox de `NotificationEvent`.
- El dispatch es best-effort: no revierte sync ni scoring si falla.
- Sin schema, migraciones, rutas nuevas ni nuevos tipos de `NotificationEventType`.
- Sin cambios en `emitMatchNotificationEvents`, `sync-orchestrator.ts`, `match-events.ts` ni `dispatcher.ts` (solo se añade la llamada al dispatcher).
- Copy i18n (`es`/`en`) para el paso de notificaciones del onboarding bajo `onboarding.notifications*`.
- Security Baseline intacto: el dispatch es server-side con VAPID privada; los payloads son mínimos.

**Primary Deliverable**: El usuario puede activar web push durante el onboarding, y los eventos de partido encolados por sync se despachan automáticamente sin intervención manual.

## Unit 44: Autocompletar nickname al invitar a una liga

**Goal**: Agilizar la invitación dirigida a jugadores mostrando sugerencias de nickname mientras el owner escribe.

**Responsibilities**:
- Added post-construction via AI-DLC refine (2026-06-18); implementa FR-REFINE-44.1…44.7 / US-44.1. No reinicia Units 1–43.
- Nuevo server action `searchNicknames(query: string)` que busca perfiles activos por `nicknameBase` con `startsWith` case-insensitive, devolviendo hasta 8 resultados con `id`, `nicknameBase`, `nicknameDiscriminator` y `avatarPath`.
- Nuevo componente cliente `NicknameAutocomplete` (o integración directa en `DirectedInviteForm`) con debounce ≈250ms, dropdown de sugerencias con avatar + nickname formateado.
- El autocompletar se activa solo si el texto tiene ≥ 2 caracteres y no contiene `@` (email).
- Al seleccionar una sugerencia, el input se rellena con el nickname exacto y el dropdown se cierra.
- Cambio de permisos: **cualquier miembro del pool** (no solo el owner) puede invitar. Gate UI (`pool.isOwner` → membresía) y gate server-side (`pool.ownerId !== userId` → membresía) se relajan.
- Sin cambios en `resolveUserByTarget`, `PoolDirectedInvite` ni el flujo de push.
- Sin schema, migraciones ni rutas nuevas.
- Security Baseline intacto: `searchNicknames` solo devuelve datos públicos de perfil (nickname, avatar); sin exponer emails ni relaciones.

**Primary Deliverable**: El owner de una liga escribe parte del nickname y ve sugerencias en un dropdown; al seleccionar una, el campo se rellena automáticamente con el nickname completo listo para invitar.

## Recommended Implementation Sequence

1. Unit 1: Foundation - Auth, Profile, Nickname, Avatar
2. Unit 2: UX Education and Onboarding
3. Unit 3: Pools and Membership
4. Unit 4: Competition Data and API Sync
5. Unit 5: Predictions and Match Locking
6. Unit 6: Scoring and Pool Rankings
7. Unit 7: Admin and Observability
8. Unit 8: Design System and UI Polish (post-construction refine; cross-cutting)
9. Unit 9: Transactional Email (post-construction refine; cross-cutting; no new deps)
10. Unit 10: Web Push Notifications (post-construction refine; event-driven; free baseline)
11. Unit 11: App Shell & Navigation (post-construction refine; UI-only; reuses existing auth/theme/profile primitives)
12. Unit 24: Internacionalización y Selector de Idioma (post-construction refine; transversal; no URL locale prefix)
13. Unit 25: Sync con football-data.org (post-construction refine; provider adapter; sin schema)
14. Unit 26: Performance Fase 1 — Quick Wins (post-construction refine; query/cache/indexes/pool; <1s target)
15. Unit 27: Performance Fase 2 — Estructural (post-construction refine; cache/indexes/N+1/dedup; <300ms target)
16. Unit 28: Persistencia de matches en sync-orchestrator (post-construction; orquestador persiste matches; sin schema)
17. Unit 29: Seed de partidos desde football-data.org con snapshot (post-construction; el seed puebla partidos pendientes desde la API con respaldo offline; sin schema)
18. Unit 30: Filtro de "partidos anteriores" en /matches (post-construction refine; UI-only; client-side toggle; sin schema)
19. Unit 31: "Revertir a la API" también revierte el puntaje de los usuarios (post-construction refine; admin/scoring; sin schema)
20. Unit 34: Códigos FIFA en `/admin/matches` (post-construction refine; UI-only; sin schema)
21. Unit 35: Invalidación inmediata de caché tras mutaciones admin (post-construction refine; cache consistency; sin schema)
22. Unit 36: Scoring acumulativo por ganador y goles acertados (post-construction refine; reglas de scoring; sin schema por defecto)
23. Unit 37: Performance Fase 3 — diferidos de Unit 22 (post-construction refine; auth `getClaims`/hook, caché de leaderboard de pool, pooling/cold-start, scoring snapshot; migración del access-token hook)
24. Unit 38: Gestión de passkeys desde Perfil → Seguridad (post-construction refine; UI/auth; lista/elimina/registra passkeys en `/settings/security`; sin schema ni rutas nuevas)
25. Unit 39: Sync — unique constraint conflict en `Team.providerTeamId` (post-construction refine; schema fix; remueve `@unique` en `providerTeamId`; migración DDL-only; sin cambios de código)
26. Unit 40: Contraste del selector de tipo de sync en `/admin` dark mode (post-construction refine; UI-only; sin schema ni rutas nuevas)
27. Unit 41: Predicciones visibles dentro del pool (post-construction refine; aditivo; query + componente + integración en `/pools/[id]`; sin schema, migraciones ni rutas nuevas)
28. Unit 42: Agrupación de partidos por día local del usuario (post-construction refine; timezone/day grouping en `/matches` + dependencias Unit 30/41; sin schema, migraciones ni rutas nuevas)
29. Unit 43: Web Push — Onboarding step + dispatch en sync admin (post-construction refine; onboarding + dispatch trigger; sin schema, migraciones ni rutas nuevas)
30. Unit 44: Autocompletar nickname en invitación dirigida (post-construction refine; UI/new server action; autocompletar nickname mientras se escribe en `DirectedInviteForm`; sin schema, migraciones ni rutas nuevas)

## Security Notes

- Units 1, 3, 5, 6, and 7 contain sensitive writes and must define validation, authorization, and RLS boundaries.
- Unit 5 and Unit 6 must preserve immutable prediction/scoring data for future crypto betting.
- Unit 7 must require audit reasons for manual result overrides.
- Unit 10 must never expose private pool, prediction or ranking data through push payloads; payloads stay minimal and links re-authorize on open.
