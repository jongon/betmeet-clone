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
- **Superseded (Unit 45, 2026-06-18)**: FR-REFINE-44.7 ("cualquier miembro puede invitar") queda reemplazado por el modelo configurable de la **Unit 45**. El cambio de Unit 44 sigue vigente como **default** (`membersCanInvite = true`), pero ahora el owner puede restringir el permiso. El code-gen plan de Unit 44 se ajusta para condicionar el gate al flag cuando se implemente Unit 45.

**Primary Deliverable**: El owner de una liga escribe parte del nickname y ve sugerencias en un dropdown; al seleccionar una, el campo se rellena automáticamente con el nickname completo listo para invitar.

## Unit 45: Permiso configurable de invitación por miembros en pools privados

**Goal**: Permitir al owner de un pool **privado** decidir si los miembros (no-owner) pueden invitar a otros usuarios, configurando el permiso al crear el pool y pudiendo cambiarlo en cualquier momento desde la página del pool.

**Responsibilities**:
- Added post-construction via AI-DLC refine (2026-06-18); implementa FR-REFINE-45.1…45.5 / US-45.1, US-45.2. No reinicia Units 1–44.
- **Schema**: nueva columna `Pool.membersCanInvite Boolean @default(true)` con migración Prisma `20260618000000_unit45_pool_members_can_invite`. La columna existe en todos los pools (PUBLIC y PRIVATE) pero solo se usa/evalúa en PRIVATEs; pools existentes quedan con `true` (default, preserva el comportamiento de Unit 44).
- **Permisos refinados**: el owner del pool siempre puede invitar. Los miembros no-owner solo pueden invitar si `pool.type === "PRIVATE" && pool.membersCanInvite === true`. En pools `PUBLIC` el flag no aplica (no usan invitación dirigida). Supersede explícito de `FR-REFINE-44.7`: ya no es "cualquier miembro puede invitar sin condiciones", sino "el owner decide".
- **UI en `/pools/[id]`**: nueva sección "Configuración" visible solo para el owner, con un Switch "Los miembros pueden invitar" enlazado al server action `updatePoolMembersCanInvite`. El `DirectedInviteForm` (de Unit 44) se condiciona a `isOwner || (pool.type === "PRIVATE" && pool.membersCanInvite)`. En pools donde el flag es `false`, los miembros no-owner ven un mensaje informativo "Solo el administrador puede invitar en esta liga".
- **UI en `/pools/new`**: el `CreatePoolForm` (Unit 3) gana un Switch "Los miembros pueden invitar" visible solo si `type === "PRIVATE"`, default `true`. Se persiste en `Pool.membersCanInvite` al crear el pool.
- **Server actions**: `updatePoolMembersCanInvite({ poolId, membersCanInvite })` (NUEVO, valida owner, persiste, revalida `/pools/[id]`). Modificación a `createPool` (NUEVO input `membersCanInvite`). Modificación a `createDirectedInvite` (gate ampliado: `isOwner || (type === "PRIVATE" && membersCanInvite)`).
- **i18n**: nuevas claves `pools.settings.{title,membersCanInvite,membersCanInviteDescription,saved,membersBlockedHint}` (ES+EN).
- **Sin** cambios en `resolveUserByTarget`, `PoolDirectedInvite`, push, scoring, predicciones, auth, sync, admin.
- **Sin** nuevas rutas: la sección "Configuración" se renderiza dentro de `/pools/[id]`.
- Security Baseline intacto: `updatePoolMembersCanInvite` valida `pool.ownerId === userId` server-side; el Switch de la UI es puramente cosmético.

**Primary Deliverable**: El owner de un pool privado ve un Switch "Los miembros pueden invitar" en `/pools/[id]` (sección Configuración) y en el formulario de creación; al cambiarlo, la UI y el server action se actualizan inmediatamente para reflejar quién puede invitar a quién. **Supersedido parcialmente por Unit 47** (el toggle ahora aplica también a pools `PUBLIC`).

## Unit 47 — Extensión del permiso de invitación a pools públicos (refine sobre Unit 45)

- **Dependencias**: Unit 45 (columna `Pool.membersCanInvite`, `PoolSettingsCard`, `updatePoolMembersCanInvite`, `CreatePoolForm`, `createDirectedInvite`, `page.tsx` gate UI), Unit 44 (autocompletar nickname), Unit 3 (Pools), Unit 13 (Invitaciones Refine).
- **Alcance**: eliminar la restricción `type === "PRIVATE"` de todos los gates y condiciones de renderizado del toggle `membersCanInvite`. El toggle, el `PoolSettingsCard`, el `CreatePoolForm` Switch y los gates de `createDirectedInvite`/UI aplican a cualquier tipo de pool (`PUBLIC` y `PRIVATE`). El gate se simplifica a `isOwner || membersCanInvite`.
- **Sin** cambios de schema ni migraciones (la columna ya existe desde Unit 45 con `DEFAULT TRUE`).
- **Sin** nuevas rutas ni componentes (se modifican componentes existentes).
- **Sin** nuevas claves i18n (se reutilizan las de Unit 45).
- Security Baseline intacto: los gates owner-only y de membresía se mantienen server-side.

**Primary Deliverable**: El owner de cualquier pool (público o privado) controla quién puede invitar mediante el toggle `membersCanInvite`. Los miembros de un pool público pueden invitar a otros si el owner lo permite, igual que en pools privados.

## Unit 48 — Predicciones con override por pool (refine sobre Units 3, 5, 6, 41)

- **Dependencias**: Unit 3 (membresía para validar `poolId`), Unit 5 (modelo `Prediction`, `savePrediction`), Unit 6 (scoring, leaderboard), Unit 41 (vista de predicciones en pool).
- **Alcance**: añadir columna `poolId` (nullable FK → Pool) al modelo `Prediction` con partial unique indexes. Permitir guardar predicciones pool-scoped desde `/pools/[id]` (tab Predicciones). Resolver override-vs-global en vistas de pool y leaderboard. Botón "Usar predicción global" para resetear override. `/matches` sin cambios (siempre global).
- **Schema**: migración Prisma para `poolId` + 2 partial unique indexes (`UNIQUE WHERE pool_id IS NULL` y `UNIQUE WHERE pool_id IS NOT NULL`).
- **Sin** nuevas rutas (se modifica `/pools/[id]` existente).
- **Sin** cambios en `/matches`, sync, admin, auth, onboarding, notificaciones.
- Security Baseline intacto: validación de membresía server-side en `savePrediction` cuando se provee `poolId`.

**Primary Deliverable**: Miembros de un pool pueden ajustar su predicción para ese pool sin afectar su predicción global. El leaderboard del pool calcula puntos usando overrides donde existen, con fallback a predicciones globales. El ranking global solo considera predicciones globales.

## Unit 49 — Performance hardening de scoring-rankings (refine sobre Units 6, 37, 48)

- **Dependencias**: Unit 6 (scoring/leaderboard), Unit 37 (caché de leaderboard), Unit 48 (override por pool, `Prediction.poolId`).
- **Alcance**: tres arreglos quirúrgicos de eficiencia en la capa de queries/servicios, sin cambio de comportamiento observable: (1) `getGlobalRankingRows` agrega en SQL con `groupBy` + `_sum` (una fila por usuario) en vez de sumar en JS todas las filas; (2) `getPoolLeaderboardRows` resuelve override-vs-global en O(n) con un `Set` de overrides en vez del `.some()` O(n²); (3) `scoreMatch` persiste el partido con un único `INSERT ... ON CONFLICT` atómico (`$executeRaw` + `Prisma.sql`/`Prisma.join`) en vez de N upserts en transacción.
- **Sin** schema, migraciones, rutas, i18n ni cambios en `computeScore`/`ScoringRuleSet`.
- Security Baseline intacto: `INSERT` parametrizado (RULE-SEC-04), misma conexión/rol y RLS que el upsert previo, membresía de viewer conservada.

**Primary Deliverable**: El ranking global y el leaderboard de pool escalan con muchos usuarios sin cambiar resultados; el scoring de un partido se escribe en una sola operación atómica e idempotente.

## Unit 50 — Sync & Scoring automáticos (Crons) (refine que resuelve FR-06)

**Goal**: Automatizar el sync de partidos (football-data.org) y el cálculo de puntos para que se ejecuten de forma programada, sin que el admin tenga que pulsar "Sincronizar ahora" manualmente.

**Responsibilities**:
- Added post-construction via AI-DLC refine (2026-06-18); implementa FR-REFINE-50.1…50.4 / US-50.1, US-50.2. Resuelve `FR-06` (TBD). No reinicia Units 1–49.
- **Scheduler**: Supabase **pg_cron + pg_net** golpea `POST /api/cron/sync?scope=<SCOPE>` en cadencia tiered (UTC): `LIVE_STATUS` `*/2`, `RESULTS` `*/5`, `FIXTURES` `0 6`, `CLEANUP` `0 4`. URL base y secreto desde **Supabase Vault** (`app_base_url`, `sync_trigger_secret`).
- **Ruta**: nueva `src/app/api/cron/sync/route.ts` (`runtime = "nodejs"`), guard `x-sync-secret` vs `SYNC_TRIGGER_SECRET` (mismo patrón que `/api/notifications/dispatch`). `401` sin secreto, `400` scope inválido, `502` fallo de sync.
- **Orquestación compartida**: nuevo servicio `runScheduledSync(scope, { source })` reusado por `triggerSync` (admin, `manual`) y la ruta cron (`cron`). Encadena `runCompetitionSync` → `scoreFinishedUnscoredMatches` → best-effort `dispatchPendingNotifications`; `CLEANUP` → `cleanupOldSyncRuns`. Respeta el lock de Unit 4 y los guards de Unit 46.
- **Ahorro de cuota**: `hasActiveMatchWindow()` hace short-circuit del tier `LIVE_STATUS` cuando no hay partidos en vivo/inminentes (solo en el cron, no en el manual).
- **Migración**: `…_unit50_cron_sync_scoring` instala los jobs de forma idempotente y defensiva (no-op donde pg_cron/pg_net no existen, p. ej. local/CI). **Sin** cambios de schema en tablas de la app.
- **Sin** cambios en el motor de scoring, el proveedor, `/matches`, auth, onboarding ni la UI. El sync manual de `/admin` se conserva como fallback.
- Security Baseline intacto: ruta guarded por secreto, secreto/URL en Vault (no en el repo), reusa autorización/RLS existente del orquestador.

**Primary Deliverable**: Los marcadores en vivo y los puntos se actualizan solos en cadencia tiered; el admin ya no necesita sincronizar manualmente (aunque puede, como fallback).

## Unit 52 — Invalidación de caché corregida para Next.js 16 (`updateTag` → `revalidateTag`)

**Goal**: Eliminar el doble refresh en `/matches` (y `/rankings`, leaderboards) corrigiendo el mecanismo de invalidación de los caches `unstable_cache` para que funcione también desde el cron de sync.

**Responsibilities**:
- Added post-construction via AI-DLC refine (2026-06-19); bug fix sobre Unit 35 (mecanismo de invalidación), con impacto en Unit 22/27/37 (caches) y Unit 50/51 (crons). No reinicia Units 1–51.
- **Causa raíz**: Unit 35 usó `updateTag`, que en Next.js 16 es **Server-Action-only** y lanza `E872` desde un Route Handler. El cron `POST /api/cron/sync` (Route Handler) llamaba `revalidateResultViews()` → `updateTag` lanzaba → tragado por su `try/catch` "best-effort" → el fixture nunca se invalidaba por el camino automático → `/matches` stale hasta vencer `revalidate: 300` (stale-while-revalidate = doble refresh).
- **Fix**: `updateTag(tag)` → `revalidateTag(tag, "max")` (válido en Server Actions y Route Handlers; `"max"` = purga inmediata on-demand) en `revalidate-result-views.ts`, `kick-member`, `join-public-pool`, `leave-pool`, `join-pool-by-token` y `reset-prediction-override`.
- **Bug secundario corregido**: `reset-prediction-override` invalidaba `` `${POOL_LEADERBOARD_TAG_PREFIX}${poolId}` ``, que nunca coincidía con el tag desnudo con que se cachea el leaderboard; ahora usa `POOL_LEADERBOARD_TAG_PREFIX`.
- Sin schema, migraciones, rutas nuevas ni cambios de scoring/UI. Conserva `revalidatePath` y los guards de cada acción.

**Primary Deliverable**: Tras un sync (manual o automático) o una mutación de membresía/override, `/matches`, `/rankings` y los leaderboards muestran datos frescos en el **primer** refresco; desaparece el doble refresh.

## Unit 56 — Grilla de predicciones del pool acotada a la fecha de ingreso (refine sobre Unit 41/48; continúa Unit 55)

**Goal**: Que la pestaña "Predicciones" del pool no muestre la predicción heredada del global ni sus puntos para los partidos previos al ingreso de cada miembro, alineando la grilla con el leaderboard del pool (Unit 55).

**Responsibilities**:
- Added post-construction via AI-DLC refine (2026-06-20); sobre Unit 41 (grilla de predicciones) y Unit 48 (override); hermano de Unit 53 (celdas `hidden`) y continuación de Unit 55. No reinicia Units 1–55.
- Cálculo en la capa de vista: `buildDayGroups` computa por celda `preJoin = col.kickoffAt < m.joinedAt` (datos ya disponibles en `members.joinedAt` y `matches.kickoffAt`); si pre-ingreso, vacía la celda y marca `preJoin: true`. El componente renderiza `CalendarOff` + `pools.predictions.notInPoolYet`.
- `preJoin` y `hidden` (Unit 53) son mutuamente excluyentes (pasado vs futuro). Sin enmascarado server-side (dato pasado, ya visible tras el kickoff). Columnas/días se conservan; aplica a todos incl. el viewer.

**Files**: `src/features/pools/components/pool-predictions-view-helpers.ts`, `pool-predictions-view.tsx`, `src/i18n/dictionaries/{es,en}.ts`, `components/__tests__/pool-predictions-view.test.tsx`. Sin schema, migraciones, rutas ni cambios en la query.

**Stages**: Functional Design EXECUTE (`construction/unit-56-pool-predictions-prejoin/functional-design.md`), Code Generation EXECUTE, Build and Test EXECUTE; SKIP Reverse Engineering, Units Generation, NFR Requirements/Design, Infrastructure.

---

## Unit 55 — Leaderboard del pool acotado a la membresía (refine sobre Unit 6/48; efectiviza Unit 23)

**Goal**: Que el leaderboard de cada pool muestre solo el puntaje acumulado dentro del pool — los partidos jugados tras el ingreso de cada miembro — en vez de heredar el total global completo. El ranking global no cambia.

**Responsibilities**:
- Added post-construction via AI-DLC refine (2026-06-20); sobre Unit 6 (Scoring/Rankings) y Unit 48 (override por pool). Hace efectiva la "consecuencia natural" prometida por Unit 23 (membresía sin congelamiento). No reinicia Units 1–54.
- Causa raíz: `getPoolLeaderboardRows` ya resolvía override-sobre-global por (miembro, partido) pero sumaba todos los scores sin filtrar por `PoolMembership.joinedAt` → el total del pool quedaba igual al global para quien predecía en global desde antes de unirse.
- Cambio: en `getPoolLeaderboardRows`, `select` de membership con `joinedAt` y de `predictionScore` con `prediction.match.kickoffAt`; el bucle descarta filas con `kickoff == null || kickoff < joinedAt` (ambas ramas) antes de la resolución override/global. Consistente con el dedup (mismo `kickoffAt` para global y override); recién llegados en 0; DTO `LeaderboardRow` sin cambios (transparente, DD-48.3).
- `getGlobalRankingRows`/`getGlobalRanking` y el wrapper `getPoolLeaderboard` (gate de membresía + viewer) no cambian.

**Files**: `src/features/scoring-rankings/queries.ts`, `src/features/scoring-rankings/__tests__/pool-leaderboard.test.ts`. Sin schema, migraciones, rutas ni i18n.

**Stages**: Functional Design EXECUTE (`construction/unit-55-pool-leaderboard-membership-scoped/functional-design.md`), Code Generation EXECUTE, Build and Test EXECUTE; SKIP Reverse Engineering, Units Generation, NFR Requirements/Design, Infrastructure.

---

## Unit 54 — Renombrar pool con confirmación (refine sobre Unit 3/45)

**Goal**: Permitir que el administrador (dueño) cambie el nombre de su liga desde el panel de Configuración, con una confirmación explícita antes de aplicar el cambio.

**Responsibilities**:
- Added post-construction via AI-DLC refine (2026-06-20); aditivo sobre Unit 3 (entidad `Pool`, autorización por `ownerId`) y Unit 45 (panel "Configuración" en `/pools/[id]`). No reinicia Units 1–53.
- Nueva server action `renamePool` calcada de `updatePoolMembersCanInvite`: `getOnboardedUserId` → `RenamePoolSchema.safeParse` (trim, 3–60, igual que `CreatePoolSchema`) → fetch `{ id, ownerId, name }` → guard `ownerId === userId` (BR-54.1) → `prisma.pool.update({ data: { name } })` → `logAuthEvent("pool.settings_changed", { renamedTo })` → `revalidatePath('/pools/[id]')` + `revalidatePath('/pools')`. Sin restricción de `type` (BR-54.3).
- UI: sección de renombrado + diálogo de confirmación `«viejo» → «nuevo»` (Cancelar/Confirmar) en `pool-settings-card-client.tsx`, modelado en `confirm-delete-modal.tsx`. El gate del card en `page.tsx` se abre de `isOwner && PRIVATE` a `isOwner`; el toggle `membersCanInvite` interno queda condicionado a PRIVATE.
- i18n es/en (`pools.settings.rename*`). Sin schema, migraciones ni rutas nuevas (`Pool.name` ya existe). No invalida `RANKINGS_TAG` (el nombre no afecta rankings).

**Primary Deliverable**: El dueño de cualquier liga (PUBLIC o PRIVATE) puede renombrarla desde `/pools/[id]`, confirmando el cambio en un diálogo; el nuevo nombre se refleja en `/pools` y `/pools/[id]`.

---

## Unit 58 — Resultados en vivo vía Supabase Realtime, websockets (refine sobre Unit 50/52; UI de Unit 30/41/48/57)

**Goal**: Que los marcadores de `/matches` y la grilla de Predicciones de `/pools` se actualicen en vivo (sin recarga manual) cuando el cron/admin actualiza un resultado, usando WebSockets.

**Dependencias**: Unit 50 (sync/scoring por cron escribe `Match`), Unit 52 (`revalidateResultViews` con `revalidateTag(tag,"max")`), Unit 41/48/53/56 (grilla de pools), Unit 57 (lock en vivo del form). No reinicia Units 1–57.

**Alcance**:
- Transporte: **Supabase Realtime Broadcast** (un servidor WebSocket propio no es viable en Vercel serverless; `postgres_changes` exigiría replicación lógica + RLS sobre `Match`). El servidor emite `results-updated` por el endpoint REST de Realtime **después** de invalidar la caché, en los 4 puntos de mutación (`api/cron/sync`, `force-result`, `revert-override`, `trigger-sync`).
- Cliente: hook `useLiveResults` (`createClient()` browser → canal `live-results`) → `router.refresh()` con debounce 1 s; resiliente si falta env. Consumido por `/matches` y `/pools`. En `/pools` se añade marcador en vivo + badge LIVE a la cabecera de columna (`MatchColumn.homeScore/awayScore`).
- `router.refresh()` (no patch en cliente): el broadcast solo señaliza; el servidor recalcula scoring/puntos.

**Sin** schema, migraciones, replicación lógica ni RLS sobre `Match`; **sin** nuevas server actions ni rutas. Acción operativa: verificar Realtime habilitado en Supabase.

**Files**: `src/features/competition/{live-results-channel.ts, services/broadcast-results-updated.ts (+test), hooks/use-live-results.ts}`, `src/app/api/cron/sync/route.ts`, `src/features/admin/actions/{force-result,revert-override,trigger-sync}.ts`, `src/features/predictions/components/matches-fixture-view.tsx`, `src/features/pools/components/{pool-predictions-view.tsx,pool-predictions-view-helpers.ts}`.

**Stages**: Functional Design EXECUTE (`construction/unit-58-live-results-realtime/functional-design.md`), Code Generation EXECUTE, Build and Test EXECUTE; Infrastructure light (canal Realtime; sin cambios de tabla); SKIP Reverse Engineering, Units Generation, NFR Requirements/Design pesado.

**Primary Deliverable**: `/matches` y la grilla de Predicciones de `/pools` se actualizan en vivo por WebSocket cuando cambia un resultado, sin recarga manual.

## Unit 59 — El último partido del día sigue visible hasta 1h antes del siguiente (refine sobre Unit 30/42)

**Goal**: Tras la medianoche local, mantener visible en la vista principal de `/matches` el último horario del día más reciente hasta 1h antes del siguiente kickoff, en vez de ocultar el bloque entero de golpe.

**Dependencias**: Unit 30 (filtro de partidos pasados, corte por día), Unit 42 (día local), Unit 57 (`useKickoffTick`). No reinicia Units 1–58.

**Alcance**:
- Transform puro `selectLingeringLastSlot(pastDays, currentDays, now)`: toma el día pasado más reciente, conserva todos los partidos de su último `kickoffAt`, y los mantiene visibles hasta `siguienteKickoff − 1h`. "Siguiente" = menor kickoff futuro con fecha; si TBD o inexistente, sin corte.
- Render: el último horario se pinta bajo el encabezado de su propio día, arriba de `currentDays`; se excluye del día dentro de "Ver partidos anteriores" para no duplicar. `useKickoffTick([cutoff])` lo hace desaparecer en vivo al llegar el corte.
- Decisiones vía AskUserQuestion: todos los del último horario (no uno); siguiente = el inmediato (TBD ⇒ sin corte); ubicación bajo su propia fecha.

**Sin** schema, migraciones, rutas, server actions ni i18n; `partitionDaysByToday` sin modificar.

**Files**: `src/features/predictions/services/fixture-by-day.ts` (`selectLingeringLastSlot`), `src/features/predictions/components/matches-fixture-view.tsx`, `src/features/predictions/__tests__/select-lingering-last-slot.test.ts` (NEW).

**Stages**: Functional Design EXECUTE (`construction/unit-59-matches-last-match-linger/functional-design.md`), Code Generation EXECUTE, Build and Test EXECUTE; SKIP Reverse Engineering, Units Generation, NFR Requirements/Design, Infrastructure.

**Primary Deliverable**: en `/matches`, el último partido del día permanece accesible durante el hueco hasta el siguiente partido sin abrir "Ver partidos anteriores".

## Unit 60 — Partidos duplicados (27/28 jun) eliminados + bandera de Uruguay corregida (reparación de datos; refine sobre Unit 4/5)

**Goal**: Reparar el **estado de datos** de la DB: dejar una sola fila de equipo Uruguay con bandera correcta y eliminar los partidos duplicados del 27/28 jun (con sus predicciones enlazadas), sin cambiar código de la app ni schema.

**Dependencias**: Unit 4 (Competition Data — `teams`/`matches`), Unit 5 (Predictions — cascade `match_id`). No reinicia Units 1–59.

**Alcance**:
- `consolidateUruguay`: re-apunta toda referencia FK del equipo `URU` huérfano (`/flags/uru.svg`, inexistente) a la canónica `URY` (`/flags/uy.svg`) —`matches.home/away/winner_team_id`, `predictions.penalty_winner_team_id`— y borra la huérfana.
- `dedupeMatches`: agrupa los partidos del 27/28 jun por equipos (grupo) o por fase+kickoff (knockout TBD, cuyos placeholders discrepan), conserva la fila con `provider_match_id` (más predicciones / recibe resultados en vivo), backfillea en el superviviente los campos nulos del perdedor (`match_number`, placeholders, team ids) y borra al perdedor (predicciones + scores por `ON DELETE CASCADE`). Guarda: solo el patrón exacto provider/number.
- Decisiones vía AskUserQuestion: empate ⇒ conservar la fila sincronizada; bandera ⇒ consolidar; alcance ⇒ solo datos. Duplicados son del futuro/`SCHEDULED`.

**Sin** schema, migraciones, código de app, rutas, server actions ni i18n. Reparación de datos vía script idempotente; no se modifica el orquestador de sync.

**Files**: `scripts/repair-unit-60-duplicates-uruguay.ts` (NEW, idempotente, `--dry-run`/`--apply`, una transacción).

**Stages**: Requirements/User Stories EXECUTE, Application Design (delta) EXECUTE, Functional Design EXECUTE (`construction/unit-60-repair-duplicate-matches-uruguay/functional-design.md`), Code Generation EXECUTE (script), Build and Test EXECUTE; SKIP Reverse Engineering, Units Generation, NFR Requirements/Design, Infrastructure.

**Primary Deliverable**: en `/matches` y `/pools`, Uruguay muestra su bandera y cada partido del 27/28 jun aparece una sola vez. Verificado en DB: 1 Uruguay (`URY`/`/flags/uy.svg`), 0 duplicados, 146→135 partidos, 11 pares / 15 predicciones eliminadas.

## Unit 61 — Banner «En vivo ahora» en el pool (refine sobre Unit 41/48/58)

**Goal**: Que la página de detalle del pool (`/pools/[id]`) superficie el/los partido(s) que está(n) ocurriendo ahora —con marcador en vivo, badge LIVE y la predicción + puntos de cada miembro— en un banner visible desde las tres pestañas, sin que el usuario tenga que entrar a Predicciones ni navegar al día correcto.

**Dependencias**: Unit 41 (predicciones visibles / `getPoolMemberPredictions` / `buildDayGroups`), Unit 48 (override por pool — resolución override ?? global), Unit 53 (enmascarado anti-sesgo — intacto, LIVE ⇒ visible), Unit 56 (`preJoin` — reusado), Unit 57 (`useKickoffTick`), Unit 58 (`useLiveResults` + marcador LIVE en cabecera). No reinicia Units 1–60.

**Alcance**:
- **Banner cross-tab**: nuevo componente cliente `PoolLiveNowBanner` que se renderiza arriba de los `<Tabs>` cuando `predictionsData.matches` contiene al menos un `matchStatus === "LIVE"`. Visible desde Clasificación, Predicciones y Miembros. Oculto (sin hueco) cuando no hay LIVE.
- **Detalle rico por miembro**: por cada partido LIVE del banner, lista compacta de miembros con su predicción (override del pool si existe, si no global —misma resolución que `buildDayGroups`) y puntos actuales (`null` mientras LIVE → "—"). Respeta `preJoin` (Unit 56: `kickoffAt < joinedAt` → `CalendarOff` "Aún no estaba en la liga").
- **CTA «Ver en Predicciones»**: lleva a la pestaña Predicciones en la página/día del partido. La pestaña activa pasa a reflejarse en `?tab` (URL-driven) — **supersede BR-41.7** (tab era client-only sin param de URL). El paginado sigue vía `?page` (Unit 48). Default `ranking` (comportamiento normal conservado; clic normal cambia `?tab` vía `router.replace` sin recarga completa).
- **Refresco en vivo**: la suscripción `useLiveResults()` (Unit 58) se monta **una vez** en un nuevo contenedor cliente `PoolDetailTabs` (wrapper de los `<Tabs>`), de modo que el banner y el grid se refrescan estés en la pestaña que estés. Se elimina la suscripción duplicada de `PoolPredictionsView`.
- **Refactor**: extraer `MemberPredictionRowView` de `MatchCard` (`pool-predictions-view.tsx`) para reusarlo en el banner (DRY). `page.tsx` (server) calcula `liveMatches` y pasa el contenido de cada pestaña + `liveMatches`/`predictions`/`matches`/`members` al contenedor cliente.

**Sin** nueva query (reusa `getPoolMemberPredictions` — los LIVE ya vienen con scores), **sin** schema, migraciones, rutas nuevas, server actions ni nueva superficie de input. Reusa `buildDayGroups`, `MatchStatusBadge`, `useLiveResults`, `useKickoffTick` y los tipos `MatchView`/`PoolMemberPrediction` existentes. Enmascarado anti-sesgo de Unit 53 intacto (LIVE ⇒ started ⇒ visible según BR-41.2).

**Files**: `src/features/pools/components/pool-detail-tabs.tsx` (NEW, cliente), `src/features/pools/components/pool-live-now-banner.tsx` (NEW, cliente), `src/app/(app)/pools/[id]/page.tsx` (refactor server), `src/features/pools/components/pool-predictions-view.tsx` (extrae `MemberPredictionRowView`, elimina su `useLiveResults`), `src/features/pools/components/pool-predictions-view-helpers.ts` (helper `pageForDayKey`), `src/i18n/dictionaries/{es,en}.ts` (keys `pools.liveNow*`), `components/__tests__/pool-live-now-banner.test.tsx` (NEW), `components/__tests__/pool-detail-tabs.test.tsx` (NEW).

**Stages**: Functional Design EXECUTE (`construction/unit-61-pool-live-now-banner/functional-design.md`), Code Generation EXECUTE, Build and Test EXECUTE; SKIP Reverse Engineering, Units Generation, NFR Requirements/Design, Infrastructure. Delta en Requirements (Épica 61 / FR-REFINE-61.1…61.4), User Stories (US-61.1), Application Design (`unit-of-work.md` Unit 61 + #44; nota en Unit 41 BR-41.7 + Unit 58).

**Primary Deliverable**: Al abrir `/pools/[id]` con un partido en juego, un banner «En vivo ahora» muestra el marcador y la predicción de cada miembro desde cualquier pestaña; el CTA lleva a la pestaña Predicciones en el día correcto; todo se refresca en vivo por Realtime.

## Unit 62 — Proyección de leaderboard en vivo (refine sobre Unit 6/55/56/58)

**Goal**: Que los leaderboards (pool + global) muestren las posiciones/puntajes **proyectados** si el marcador en vivo se mantuviera al final, reordenados en tiempo real vía `useLiveResults` (Unit 58).

**Dependencias**: Unit 6 (scoring/rankings — `LeaderboardRow`/`PoolLeaderboard`/`assignDensePositions`/`getGlobalRanking`/`getPoolLeaderboard`), Unit 55 (leaderboard del pool acotado a `joinedAt`), Unit 56 (`preJoin`), Unit 58 (`useLiveResults` + `Match.homeScore/awayScore` en vivo). No reinicia Units 1–61 ni 63. Independiente de Unit 61 (banner live-now) — coexisten; la proyección se inyecta en el slot `rankingContent` de `PoolDetailTabs` sin doble DB hit.

**Alcance**:
- **Servicio puro** `projectLeaderboard(rows, liveMatches, livePredictions, shouldSkipPrediction?) → ProjectedLeaderboardRow[]` (sin IO, sin React cache) usando `computeScore` (BR-2.7) + `toScoringExample` (score-adapter). Respeta override ?? global y `preJoin` (igual que `getPoolLeaderboardRows`). Penalti bonus NO durante LIVE (`winnerTeamId: null` → `actualPenaltyWinner: null`). Sintetiza rows nuevos (usuarios con LIVE preds pero 0 confirmados).
- **Queries no-cached** `getGlobalRankingProjection(viewerId)` / `getPoolLeaderboardProjection(poolId, viewerId)`: sobre cache confirmado intacto (`getGlobalRanking`/`getPoolLeaderboard`) + query DB ligera `prisma.match.findMany({ where: { status: "LIVE" }})` + predicciones del scope (global: `poolId: null` + filtro unverified/deleted; pool: `OR [{poolId}, {poolId: null}]` + `joinedAt`).
- **Variante `projectPoolLeaderboardFromLoaded`**: para `/pools/[id]` reusa `getPoolMemberPredictions` ya cargados (sin doble DB hit).
- **Componente `PoolLeaderboard`**: props `projectedRows?` + `hasLive?` + `copy?` → reordena por `projectedPoints`, muestra `<total> → <projected>` + badge "proy." + `sube N`/`baja N`/`igual`/`nuevo`.
- **Wrapper client** `LeaderboardLiveRefresh` (`useLiveResults()`) en `/rankings` y `/pools/[id]/leaderboard`. `/pools/[id]` NO añade wrapper: `PoolDetailTabs` (Unit 61) ya monta `useLiveResults` una vez.

**Sin** cambios en `compute-score.ts`, `scoring-rules.ts`, sync, admin, `/matches`, cache confirmado, schema, migraciones, rutas, server actions.

**Files**: `src/features/scoring-rankings/services/project-leaderboard.ts` (NEW), `src/features/scoring-rankings/components/leaderboard-live-refresh.tsx` (NEW), `src/features/scoring-rankings/queries.ts` (MODIFIED — 2 projection queries), `src/features/scoring-rankings/components/pool-leaderboard.tsx` (MODIFIED — modo proyección), `src/app/(app)/rankings/page.tsx`, `src/app/(app)/pools/[id]/leaderboard/page.tsx`, `src/app/(app)/pools/[id]/page.tsx` (MODIFIED — integración), `src/i18n/dictionaries/{es,en}.ts` (MODIFIED — `rankings.liveProjection.*`), `src/features/scoring-rankings/services/__tests__/project-leaderboard.test.ts` (NEW), `src/features/scoring-rankings/components/__tests__/pool-leaderboard.test.tsx` (NEW).

**Stages**: Requirements EXECUTE (Épica 62 / FR-REFINE-62.1…62.4), User Stories SKIP, Application Design/Units Generation SKIP, Functional Design EXECUTE, NFR SKIP, Code Generation EXECUTE, Build and Test EXECUTE.

**Primary Deliverable**: Al abrir `/rankings` o `/pools/[id]` con un partido LIVE, el leaderboard se reordena por puntaje proyectado con `<pts actuales> → <pts proyectados>` y el cambio de posición (`sube 2`/`baja 1`/`igual`/`nuevo`); al desaparecer LIVE (FINISHED) vuelve al modo normal. El refresh es en vivo sin recarga manual.

## Unit 63 — Estado «ya unido» en `/pools/discover` (refine sobre Unit 3/13)

**Goal**: Que el directorio público de ligas (`/pools/discover`) muestre «Ir a la liga» en los pools a los que el usuario ya pertenece, en vez del botón «Unirme», para evitar un clic inútil y la confusión de pensar que no es miembro.

**Dependencias**: Unit 3 (Pools and Membership — `listPublicPools`/`PoolPreviewItem`/`PoolPreviewCard`), Unit 13 (FR-REFINE-13.6 «ya miembro» como estado informativo post-clic — ahora extendido a estado proactivo pre-clic). No reinicia Units 1–62 (Unit 62 ya implementada, coexistencia verificada).

**Alcance**:
- **Anotación `isMember` server-side**: `listPublicPools` añade `isMember: boolean` por pool, calculado con una **única** query batched `prisma.poolMembership.findMany({ where: { userId, poolId: { in: [...] } } })` → `Set` → `isMember = memberPoolIds.has(p.id)` (no N+1). Skip si el usuario es anónimo (`getCurrentUserId()` null) o si el directorio está vacío.
- **Tipo**: `PoolPreviewItem` gana `isMember: boolean`.
- **Card**: `PoolPreviewCard` rama por `pool.isMember` — `true` → botón outline «Ir a la liga» (`<Link>` con `buttonVariants`) que navega a `/pools/${pool.id}`; `false` → botón «Unirme»/«Lleno» actual sin cambios. El área `FormError`/`info` (red de seguridad reactiva `alreadyMember` de Unit 13) queda solo en la rama no-miembro.

**Sin** cambios en `joinPublicPool` (action) ni su contrato, `pool-directory-list.tsx`, `discover/page.tsx`, schema, migraciones, rutas, server actions, middleware ni i18n (reusa `pools.goToPool`). `isMember` es solo presentación; nunca autoriza/deniega.

**Files**: `src/features/pools/types.ts` (MODIFIED — `isMember`), `src/features/pools/queries.ts` (MODIFIED — anotación batched), `src/features/pools/components/pool-preview-card.tsx` (MODIFIED — rama `isMember`), `src/features/pools/__tests__/list-public-pools.test.ts` (NEW), `src/features/pools/components/__tests__/pool-preview-card.test.tsx` (NEW).

**Stages**: Requirements/User Stories EXECUTE (Épica 63 / FR-REFINE-63.1, US-63.1), Application Design (delta `unit-of-work.md` Unit 63 + #45) EXECUTE, Functional Design EXECUTE (`construction/unit-63-pools-discover-joined-state/functional-design.md`), Code Generation EXECUTE, Build and Test EXECUTE; SKIP Reverse Engineering, Units Generation, NFR Requirements/Design, Infrastructure.

**Primary Deliverable**: Al abrir `/pools/discover` logueado, las ligas públicas a las que ya pertenezco muestran «Ir a la liga» y al pulsar van a `/pools/[id]`; las que no muestran «Unirme»; una liga llena ajena muestra «Lleno» deshabilitado.

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
31. Unit 45: Permiso configurable de invitación por miembros en pools privados (post-construction refine; schema + UI; `Pool.membersCanInvite` configurable al crear y editable en `/pools/[id]`; supersede `FR-REFINE-44.7`; migración Prisma; nueva sección "Configuración" en `/pools/[id]`)
32. Unit 47: Extensión del permiso de invitación a pools públicos (post-construction refine; sobre Unit 45; elimina la restricción `type === "PRIVATE"` del toggle `membersCanInvite` para que aplique a pools `PUBLIC` también; sin schema ni migraciones; solo cambios de lógica/UI)
33. Unit 48: Predicciones con override por pool (post-construction refine; sobre Units 3/5/6/41; schema `Prediction.poolId` + partial unique indexes; leaderboard override-aware; botón "Usar predicción global"; migración Prisma)
34. Unit 49: Performance hardening de scoring-rankings (post-construction refine; sobre Units 6/37/48; agregación SQL del ranking global vía `groupBy`, leaderboard de pool O(n) con `Set` de overrides, bulk upsert atómico de scoring vía `INSERT ... ON CONFLICT`; sin schema, migraciones, rutas ni i18n; sin cambio de comportamiento)
35. Unit 50: Sync & Scoring automáticos (Crons) (post-construction refine; resuelve FR-06; Supabase pg_cron + pg_net → `POST /api/cron/sync` guarded por `x-sync-secret`; cadencia tiered LIVE/RESULTS/FIXTURES/CLEANUP; orquestación compartida `runScheduledSync`; migración pg_cron idempotente/defensiva; sin schema de app; conserva el sync manual del admin como fallback)
36. Unit 52: Invalidación de caché corregida para Next.js 16 (post-construction refine; bug fix sobre Unit 35; `updateTag` → `revalidateTag(tag, "max")` para que el cron de sync invalide los caches `unstable_cache` sin lanzar `E872`; corrige también el tag mismatch del leaderboard de pool; elimina el doble refresh en `/matches`; sin schema, migraciones ni rutas)
37. Unit 53: Ocultar predicciones futuras de otros miembros (post-construction refine; sobre Units 41/48; restaura la garantía anti-sesgo de FR-REFINE-41.1 que Unit 48 había roto al quitar el filtro `kickoffAt <= now`; enmascarado server-side en `getPoolMemberPredictions` acotado a `miembro !== viewer`; el viewer sigue viendo/editando sus propias predicciones futuras; celda con candado "Oculta hasta el inicio"; sin schema, migraciones, rutas ni cambios de scoring/leaderboard)
38. Unit 54: Renombrar pool con confirmación (post-construction refine; sobre Units 3/45; nueva server action `renamePool` con autorización por `ownerId` y validación 3–60; diálogo de confirmación `«viejo» → «nuevo»` en el panel de Configuración; el card pasa a mostrarse a cualquier dueño —PUBLIC y PRIVATE— y el toggle `membersCanInvite` queda condicionado a PRIVATE; i18n es/en; sin schema, migraciones ni rutas nuevas)
39. Unit 55: Leaderboard del pool acotado a la membresía (post-construction refine; sobre Units 6/48; efectiviza Unit 23; `getPoolLeaderboardRows` ahora suma solo los partidos con `kickoffAt ≥ joinedAt` de cada miembro —override del pool si existe, si no la global heredada—; recién llegados en 0; el ranking global no cambia; DTO transparente; sin schema, migraciones, rutas ni i18n)
40. Unit 56: Grilla de predicciones del pool acotada a la fecha de ingreso (post-construction refine; sobre Units 41/48; hermano de Unit 53, continúa Unit 55; las celdas de partidos previos al ingreso del miembro se muestran vacías con ícono `CalendarOff` "Aún no estaba en la liga"; cálculo en la vista en `buildDayGroups` con `joinedAt`/`kickoffAt` ya disponibles; aplica a todos incl. viewer; columnas se conservan; sin enmascarado server-side; sin schema, migraciones, rutas ni cambios en la query; +1 key i18n)
41. Unit 58: Resultados en vivo vía Supabase Realtime, websockets (post-construction refine; sobre Units 50/52 y la UI de Units 30/41/48/57; el servidor emite un broadcast `results-updated` por el endpoint REST de Realtime tras invalidar la caché —en `api/cron/sync`, `force-result`, `revert-override`, `trigger-sync`—; el hook cliente `useLiveResults` hace `router.refresh()` con debounce; `/pools` añade marcador en vivo + badge LIVE a la cabecera; transporte Broadcast porque Vercel serverless no sostiene un WS propio; sin schema, migraciones, replicación lógica ni RLS sobre `Match`; sin rutas ni server actions nuevas)
42. Unit 59: El último partido del día sigue visible hasta 1h antes del siguiente (post-construction refine; sobre Units 30/42; transform puro `selectLingeringLastSlot` mantiene en `/matches` el último horario del día más reciente tras la medianoche hasta `siguienteKickoff − 1h` —todos los del último horario, no uno; siguiente = menor kickoff futuro con fecha, TBD/inexistente ⇒ sin corte—; se pinta bajo su propia fecha arriba de los bloques futuros y se excluye del toggle "Ver partidos anteriores"; reusa `useKickoffTick` (Unit 57) para desaparecer en vivo; `partitionDaysByToday` sin tocar; sin schema, migraciones, rutas, server actions ni i18n)
43. Unit 60: Partidos duplicados (27/28 jun) eliminados + bandera de Uruguay corregida (post-construction; reparación de **datos** sobre Units 4/5 vía script idempotente `scripts/repair-unit-60-duplicates-uruguay.ts`; consolida las dos filas de Uruguay en una sola `URY` `/flags/uy.svg` —re-apuntando FKs y borrando la huérfana `URU`/`/flags/uru.svg`— y deduplica los partidos del 27/28 jun conservando la fila con `provider_match_id`, con backfill de `match_number`/placeholders, borrando al perdedor y sus predicciones por `ON DELETE CASCADE`; guarda de patrón provider/number; sin schema, migraciones, código de app, rutas, server actions ni i18n; no toca el orquestador de sync)
44. Unit 61: Banner «En vivo ahora» en el pool (post-construction refine; sobre Units 41/48/58; banner cross-tab en `/pools/[id]` que superficia partido(s) `LIVE` con marcador + badge + predicción/puntos por miembro desde cualquier pestaña; CTA «Ver en Predicciones» con `?tab` URL-driven que **supersede BR-41.7**; `useLiveResults` se monta una vez en un nuevo `PoolDetailTabs` wrapper; reusa `getPoolMemberPredictions`/`buildDayGroups`/`MatchStatusBadge`/`useKickoffTick`; extrae `MemberPredictionRowView` para DRY; sin nueva query, schema, migraciones, rutas ni server actions; enmascarado anti-sesgo de Unit 53 intacto)
45. **Unit 62: Proyección de leaderboard en vivo** (post-construction refine; sobre Units 6/55/56/58; servicio puro `projectLeaderboard` + queries no-cached `getGlobalRankingProjection`/`getPoolLeaderboardProjection` —cache confirmado intacto—; leaderboards reordenados por `projectedPoints` con badge `sube/baja/igual/nuevo` en vivo; coexiste con Unit 61; sin schema, migraciones, rutas ni server actions)
46. Unit 63: Estado «ya unido» en `/pools/discover` (post-construction refine; sobre Units 3/13; `listPublicPools` anota `isMember` por pool para el usuario actual con una query batched `poolMembership.findMany` —no N+1, skip si anónimo o directorio vacío—; `PoolPreviewCard` muestra botón outline «Ir a la liga» en los pools con `isMember === true` en vez de «Unirme»; extiende FR-REFINE-13.6 a un estado **proactivo pre-clic**; la action `joinPublicPool` y su contrato `{ alreadyMember }` se conservan como red de seguridad reactiva ante race; reusa key i18n `goToPool`, sin nuevas keys; sin schema, migraciones, rutas, server actions ni nueva superficie de input; Unit 62 implementada, coexistencia verificada)

## Security Notes

- Units 1, 3, 5, 6, and 7 contain sensitive writes and must define validation, authorization, and RLS boundaries.
- Unit 5 and Unit 6 must preserve immutable prediction/scoring data for future crypto betting.
- Unit 7 must require audit reasons for manual result overrides.
- Unit 10 must never expose private pool, prediction or ranking data through push payloads; payloads stay minimal and links re-authorize on open.
