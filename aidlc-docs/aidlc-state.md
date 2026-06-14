# AI-DLC State Tracking

## Project Information
- **Project Type**: Greenfield (stack preconfigurado)
- **Start Date**: 2026-06-09T21:37:50Z
- **Current Stage**: CONSTRUCTION — REFINE COMPLETE / Unit 19 Confirmación única del cambio de email (2026-06-14) — Refine post-construcción sobre el flujo de cambio de email del Perfil (Units 12/15); no reinicia etapas aprobadas. FR-REFINE-19.1: al modificar el email, deja de pedir confirmación de **ambos** correos; ahora se envía **un único enlace solo al correo nuevo** y la notificación llega solo al nuevo. Implementación: `secure_email_change_enabled = false` en `supabase/config.toml` (replicar toggle en dashboard de prod), comentario de `change-email.ts` y copy `profile.emailDescription`/`emailSuccess` a confirmación única. Se conserva el flujo `token_hash`/`verifyOtp`. **Reemplaza** la doble confirmación de FR-REFINE-15.10. Tradeoff de seguridad (apropiación de cuenta con sesión activa) **aceptado por el usuario** → **CF-9**; Security Baseline sigue habilitado. Sin schema/migraciones/rutas. Artefactos: `requirements.md` (FR-REFINE-19, Épica 18), `stories.md` (US-18.1), `construction/unit-19-email-change-single-confirm/functional-design.md`, Unit 15 design (superseded), `unit-9-email/email-design.md`, `carry-forward-decisions.md` (CF-9), `aidlc-state.md`, `audit.md`. **Pendiente Operations**: poner "Secure email change" OFF en el dashboard de Supabase de prod.
- **Prev Stage**: CONSTRUCTION — REFINE COMPLETE / Unit 17 Nickname Grace Implementation (2026-06-14) — Implementación de FR-REFINE-17.3; no reinicia etapas aprobadas ni Unit 18. Regla: después de la asignación de nickname en onboarding existe **una oportunidad de gracia** para cambiarlo sin esperar 30 días; el cooldown aplica a intentos posteriores. Código: `profiles.nickname_change_count` (Prisma + migración `20260614123000_nickname_grace_count`), `setNickname` usa el contador como fuente de verdad. Fix post-implementación: `setNickname` revalida `/settings/profile` y `AccountSettings` llama `router.refresh()` tras éxito para que el nuevo nickname aparezca sin refrescar el navegador. Artefactos actualizados: `requirements.md`, Unit 12/16 dependent designs, Unit 17 functional design, `aidlc-state.md`, `audit.md`. Verificado: `pnpm prisma:generate`, `pnpm exec tsc --noEmit`, `pnpm check`, `pnpm lint`, `pnpm test` (**179/179 tests**); fix de refresco validado con `tsc`, Biome, ESLint y test específico `set-nickname` 7/7.
- **Prev Stage**: CONSTRUCTION — REFINE COMPLETE / Unit 18 Landing CTA Copy (2026-06-14) — Refine aditivo/documental sobre el landing; no reinicia etapas aprobadas. FR-REFINE-18.1: el CTA principal del landing cambia de "Crea mi Liga" a **"Entra a Jugar"** sin cambiar destino ni comportamiento. Artefactos: `requirements.md`, `user-stories/stories.md`, `application-design/screen-contracts.md`, Unit 2 landing rules/model/components (dependencia), `construction/unit-15-landing-rules-profile-refine/functional-design.md` (dependencia) y `construction/unit-18-landing-cta-copy/functional-design.md`. Sin cambios de código en esta solicitud.
- **Prev Stage**: CONSTRUCTION — REFINE COMPLETE / Unit 17 Reglas, Avatar Upload y Nickname Consistency (2026-06-14) — Refine aditivo sobre Units 15/16 y dependencias de búsqueda por nickname; no reinicia etapas aprobadas. FR-REFINE-17.1: Reglas afirma ranking por liga **y** ranking global. FR-REFINE-17.2: upload de avatar custom deja de usar path fijo y usa path único por intento (`custom/{userId}/{uuid}.{ext}`) para evitar colisiones de Supabase Storage que producen "Failed to create upload URL". FR-REFINE-17.3: cooldown de nickname aplica después de consumir la oportunidad de gracia post-onboarding, no tras primera asignación. FR-REFINE-17.4: nickname case-insensitive en disponibilidad, asignación y búsqueda (`Pepe#1234` = `pepe#1234`). Artefacto: `construction/unit-17-rules-avatar-nickname-refine/functional-design.md`. Verificado previo: tsc 0, Biome limpio, ESLint 0, **177/177 tests**; refine posterior de gracia fue documental.
- **Prev Stage**: CONSTRUCTION — REFINE COMPLETE / Unit 16 Onboarding obligatorio + orden del fixture (2026-06-13) — Dos bugs en vivo, analizados como **Unit 16** (refine aditivo, no reinicia Units 1–15). FR-REFINE-16.1: el onboarding **obligatorio** se aplica ahora con **defensa en profundidad por Prisma** (ruta fiable), en dos capas — (a) `src/app/(app)/layout.tsx` redirige a `/onboarding/profile` si `!onboardingCompleted` (ninguna ruta `(app)` se renderiza sin onboarding), y (b) las actions `createPool`/`createDirectedInvite`/`savePrediction` exigen `getOnboardedUserId()` y rechazan con error de dominio. El middleware `proxy.ts` queda como primera línea (fail-open intencional, §8.2). FR-REFINE-16.2: `/matches` lista los partidos por **orden de ocurrencia agrupados por día** (transform puro `groupFixtureByDay`, UTC; etiqueta de grupo por partido; bucket "Fecha por confirmar"). Decisión del usuario (AskUserQuestion): lista por día. FR-REFINE-16.3/16.4 (onboarding): header mínimo propio (`OnboardingHeader`: toggles de tema/marca + cerrar sesión; **no** el AppHeader, que enlaza a rutas gateadas) + botón "Atrás" entre pasos. FR-REFINE-16.5: el cooldown de nickname (30 días) aplica solo tras completar onboarding (volver atrás y re-enviar ya no da `rate_limited`). FR-REFINE-16.6 (**resuelve CF-8**): se elimina el script inline anti-FOUC; la marca se renderiza server-side desde la cookie `brand-theme` (`layout.tsx` async + `lib/brand-theme.ts`) → desaparece el warning "Encountered a script tag…" y la excepción de CSP (coste: layout dinámico). FR-REFINE-16.7: toggles de tema/marca en las pantallas de auth (`(auth)/layout.tsx`). FR-REFINE-16.8 (CF-7): falso negativo de confirmación de cuenta — el callback PKCE daba "No pudimos completar la confirmación" aunque el correo sí se confirmaba; fix: `flow=email_confirm` + `/sign-in?confirmed=1`; raíz pendiente en Operations (desplegar plantillas token_hash). Verificado: tsc 0, Biome limpio, ESLint 0, **173/173 tests**, `next build` OK. Sin cambios de schema (la columna `onboarding_completed` ya existe desde Unit 15). Artefactos: `requirements.md` (FR-REFINE-16, Épica 15), `construction/unit-16-onboarding-gate-fixture-order/functional-design.md`. **Pendiente Operations**: `prisma migrate deploy` (sigue de Unit 15) + verificación en vivo.
- **Prev Stage**: CONSTRUCTION — REFINE (seguridad, documental) / Excepción del script inline anti-FOUC (2026-06-13) — Refine documental sobre Unit 8: el `<script dangerouslySetInnerHTML={{ __html: BRAND_BOOTSTRAP }} />` de `src/app/layout.tsx` (bootstrap anti-FOUC del eje de marca, `a1af328`, suprimido con `biome-ignore lint/security/noDangerouslySetInnerHtml`) **no estaba capturado** como decisión de seguridad pese a Security Baseline habilitado. Sin cambio de código: documentado como **CF-8** (excepción aceptada — string estático sin input de usuario, no es sink de XSS) + nota en `unit-8-design-system/design-system.md`. **Constraint hacia adelante (SECURITY-04)**: la CSP está en Report-Only; al pasar a enforce, añadir hash sha256/nonce a `script-src` (no `'unsafe-inline'`). No reinicia etapas (Units 1–15 intactas). Ver `carry-forward-decisions.md` CF-8 y `audit.md`.
- **Prev Stage**: CONSTRUCTION — REFINE COMPLETE / Unit 15 Landing·Reglas·Perfil·Auth·Calculadora (2026-06-13) - Lote de 16 bugs/requerimientos reportados tras uso en vivo, analizados como **Unit 15** (refine post-construcción, aditivo). La mayoría son **regresiones o extensiones** de Units 11/12/14, más mejoras nuevas. Cubre **FR-REFINE-15.1 … 15.14** y la **Épica 14**. Decisiones del usuario (AskUserQuestion): (1) landing con header consciente de sesión + quitar login duplicado; (2) confirmación de email **forzada en el gate** (`email_confirmed_at`); (3) onboarding con **flag explícito** `profiles.onboarding_completed` (migración). Implementado y verificado: tsc 0, Biome limpio, ESLint 0, **163/163 tests**, `next build` OK (25 rutas). Artefactos: `requirements.md` (FR-REFINE-15), `construction/unit-15-landing-rules-profile-refine/functional-design.md`. **No reinicia** Units 1–14. **Pendiente Operations**: `prisma migrate deploy` (columna `onboarding_completed`) + verificación en vivo + toggles Supabase ("Confirm email" ON, "Secure email change"). Sigue el patrón de refine de Units 12–14 (artefactos de construcción; sin tocar unit-of-work.md).
- **Prev Stage**: INCEPTION — WORKFLOW PLANNING REFINE / Unit 11 App Shell & Navigation (2026-06-12) - Nuevo requerimiento: no hay chrome/navbar global; en rutas autenticadas y en admin no hay indicador de sesión, logout, acceso a perfil ni cambio de tema (los toggles solo viven en `/` y `/rules`). Propuesto como **Unit 11** (refine, UI-only, aditivo, bajo riesgo) reutilizando `signOut()`, `ThemeToggle`, `BrandToggle`, `Avatar`, `getProfile()`/`getDisplayNickname()` y el gate `verificationStatus === "ADMIN"`. Plan en `inception/plans/unit-11-app-shell-execution-plan.md`. EXECUTE: Requirements(min)/User Stories(light)/Application Design(light)/Units Generation, Functional Design(light), Code Generation, Build&Test. SKIP: NFR Requirements/Design e Infrastructure. **Esperando aprobación**; no reinicia Units 1–10.
- **Prev Stage**: OPERATIONS — AUTH GATE REFINE (2026-06-11) - Refine sobre Unit 1 (auth gate) + Unit 2 (onboarding) tras bug en producción: confirmación de email daba 404 y el login "no llevaba a ningún lado". Causa raíz: (1) redirecciones a `/auth/sign-in` inexistente (route-group `(auth)` → `/sign-in`); (2) `src/proxy.ts` (middleware Next 16) había sido **borrado por error** en `683d707` como "dead code" sin refine AI-DLC, rompiendo el gate de sesión/onboarding. Restaurado en `fa43333`; home autenticada fijada en `/matches`. Capturado como **CF-7**. No se reinician etapas aprobadas; Units 1–10 permanecen completas/verificadas. Pendiente opcional (no aprobado): migrar confirmación de email a `token_hash`/`verifyOtp`.
- **Prev Stage**: OPERATIONS — FLAG ASSETS COMPLETED (2026-06-11) - Refine operativo sobre CF-2/CF-3 y Unit 4: se continuó la descarga pendiente de banderas SVG del Mundial 2026 desde `lipis/flag-icons`, se añadieron 45 assets faltantes en `public/flags/`, se creó `scripts/sync-flags.ts` + `pnpm sync:flags`, y `pnpm check:flags` valida 48/48 equipos. No se reinician etapas aprobadas; Units 1–10 permanecen completas/verificadas.
- **Prev Stage**: OPERATIONS — RUNBOOK DOCUMENTED (2026-06-11) - Refine: la inicialización de entorno/schema/seed y la habilitación de admin se documentaron como artefacto de la fase Operations (`operations/operations-runbook.md`). Hallazgos: prod estaba vacío de schema; gap de creación de tablas (Prisma vs `supabase/migrations`, ver CF-6); fix de top-level await en `scripts/seed-competition.ts`; `NEXT_PUBLIC_SUPABASE_URL` apuntaba a otro proyecto; usuario admin sin fila `profiles` por crearse antes del trigger; pooler vs direct connection para DDL. No se reinician etapas aprobadas; CF-6 (estrategia de migraciones) queda propuesta pendiente de aprobación.
- **Prev Stage**: REFINE DOCS UPDATED (2026-06-11) - Unit 10 Web Push Notifications added as post-construction refine artifacts. Unit 9 remains Transactional Email (FR-EMAIL-01) and is not restarted. Unit 10 baseline = standard Web Push + VAPID for free MVP scale; OneSignal/FCM/Novu remain future adapters. Units 1–8 approved/verified stages are not restarted.
- **Prev Stage (Unit 9 active)**: REFINE (2026-06-11) - Unit 9 Transactional Email (FR-EMAIL-01, Épica 8). Canal = Resend como Custom SMTP de Supabase ("solo lo necesario": cero deps npm nuevas). Plantillas de auth versionadas en `supabase/templates/*.html` + `supabase/config.toml` (content_path); Supabase las hospeda/envía. Alcance construido = Grupo A (confirmation/recovery/email_change, ya disparados por las server actions de auth). Grupo B (negocio: invitación a pool, resultados, recordatorios, expulsión, alertas sync) = catálogo propuesto en backlog (requiere SDK Resend). Prod requerirá dominio verificado en Resend (DKIM/SPF/DMARC). Units 1–8 intactas; sin cambio de runtime. Ver construction/unit-9-email/email-design.md.
- **Prev Stage**: REFINE COMPLETE (2026-06-10) - Unit 8 Design System & UI Polish (FR-DS-01, Épica 7) implemented & verified (0 TS, 111 tests, ESLint 0, Biome clean, build passing). Themeable tokens (deportivo/moderno/premium × light/dark) with green+gold default identity. Units 1–7 untouched. Ready for OPERATIONS / deploy.
- **Last Bug Fix (2026-06-11c)**: Loop de redirección en onboarding (Unit 1 + Unit 2). Usuario autenticado sin fila `profiles` (trigger `handle_new_user` no corrió) → proxy → `/onboarding/profile` → `redirect('/sign-in')` → proxy rebota a `/matches` → `ERR_TOO_MANY_REDIRECTS`. Fix `9e22350`: `getOrCreateProfile()` auto-crea la fila (upsert idempotente); la página distingue sin-sesión de fila-ausente. 115/115 tests. Causa de datos en prod: falta `prisma migrate deploy` + backfill `profiles` (CF-6/Operations).
- **Prev Bug Fix (2026-06-11)**: Auth gate / email-confirm 404 + login dead-end (Unit 1 + Unit 2). (a) `auth/callback` error redirects iban a `/auth/sign-in` inexistente → 404 al confirmar email; corregido a `/sign-in`. (b) `src/proxy.ts` (middleware Next 16) restaurado tras borrado erróneo en `683d707`; re-habilita refresco de sesión SSR, gate de onboarding y gate `/admin/*`. (c) Home autenticada = `/matches` en login, callback, fin de onboarding y redirección auth-only. Commit `fa43333`. tsc 0 errores, Biome limpio. Ver CF-7 y audit.md.
- **Prev Bug Fix (2026-06-10)**: Auth routing 404 (Unit 1) — `(auth)` route-group prefix `/auth/` was wrongly used in 15 references (links + redirects + reset email). Fixed root cause; verified live (/sign-up → 200, /auth/sign-up → 404). See audit.md.

## Workspace State
- **Existing Code**: Yes
- **Reverse Engineering Needed**: No
- **Workspace Root**: /var/www/html

## Code Location Rules
- **Application Code**: Workspace root (NEVER in aidlc-docs/)
- **Documentation**: aidlc-docs/ only
- **Structure patterns**: See code-generation.md Critical Rules

## Workspace Detection Summary
- **Classification Basis**: Template/scaffold with chosen stack and tooling, but without business logic or existing product behavior
- **Programming Languages**: TypeScript, JavaScript, CSS
- **Build System**: pnpm / Next.js
- **Project Structure**: Monolithic web application template

## Extension Configuration
| Extension | Enabled | Decided At |
|---|---|---|
| Security Baseline | Yes | Requirements Analysis |
| Property-Based Testing | No | Requirements Analysis |

## Stage Progress
### 🔵 INCEPTION PHASE
- [x] Workspace Detection
- [x] Reverse Engineering (skipped as N/A for template-only workspace)
- [x] Requirements Analysis
- [x] User Stories
- [x] Workflow Planning
- [x] Application Design - EXECUTE
- [x] Units Generation - EXECUTE

### 🟢 CONSTRUCTION PHASE
**Unit 1: Foundation - Auth, Profile, Nickname, Avatar**
- [x] Functional Design - COMPLETE
- [x] NFR Requirements - COMPLETE
- [x] NFR Design - COMPLETE
- [x] Infrastructure Design - COMPLETE
- [x] Code Generation - COMPLETE (27 tests passing, 0 TS errors)

**Unit 2: UX Education and Onboarding**
- [x] Functional Design - COMPLETE (approved)
- [x] NFR Requirements - COMPLETE (approved)
- [x] NFR Design - COMPLETE (approved)
- [x] Infrastructure Design - COMPLETE (approved)
- [x] Code Generation - COMPLETE (Option A; committed a195ac4; 41 tests passing; 0 TS errors; 3 biome-ignore removed)

**Unit 3: Pools and Membership**
- [x] Functional Design - COMPLETE (approved)
- [x] Code Generation - COMPLETE (47 tests passing via vitest, 0 TS errors, build passing)

**Unit 4: Competition Data and API Sync**
- [x] Functional Design - COMPLETE (approved)
- [x] NFR Requirements - COMPLETE (approved)
- [x] NFR Design - COMPLETE (approved)
- [x] Infrastructure Design - COMPLETE (approved)
- [x] Code Generation - COMPLETE (56 tests passing, 0 TS errors, Biome clean, build passing; flag assets refreshed 2026-06-11: `pnpm sync:flags` + `pnpm check:flags` validates 48/48)

**Unit 5: Predictions and Match Locking**
- [x] Functional Design - COMPLETE (approved)
- [x] Code Generation - COMPLETE (88 tests passing, 0 TS errors, Biome clean, build passing)

**Unit 6: Scoring and Pool Rankings**
- [x] Functional Design - COMPLETE (approved)
- [x] Code Generation - COMPLETE (103 tests passing, 0 TS errors, Biome clean, build passing)

**Unit 7: Admin and Observability**
- [x] Functional Design - COMPLETE (approved)
- [x] Code Generation - COMPLETE (111 tests passing, 0 TS errors, Biome clean, build passing)

**Unit 8: Design System and UI Polish** (added via `/aidlc-refine`, 2026-06-10)
- [x] Functional Design - Token architecture & theming axes defined (see construction/unit-8-design-system/design-system.md)
- [x] Identity / Visual Direction - deportivo palette (green + gold) + Barlow display, user-approved
- [x] Code Generation - globals.css 6-theme tokens, brand provider + selector, badge variants, anchor-screen polish
- [x] UX Audit - live Playwright review of /, /rules, /sign-in, /pools across 6 theme combos + mobile (see design-system.md). 1 medium finding (sign-in English copy, pre-existing Unit 1), 2 low. No defects from Unit 8.

**Unit 9: Transactional Email** (added via `/aidlc-refine`, 2026-06-11)
- [x] Requirements/User Stories/Application Design artifacts present for Supabase Auth + Resend SMTP and repo-versioned auth templates.
- [ ] Code Generation / verification status owned by active Unit 9 workflow; not restarted by Unit 10 change.

**Unit 11: App Shell & Navigation** (added via `/aidlc-plan`, 2026-06-12) — refine UI-only, no reinicia Units 1–10
- [x] Requirements Analysis (min) — FR-SHELL-01 añadido a requirements.md.
- [x] User Stories (light) — Épica 10 (US-10.1…US-10.6).
- [x] Application Design / Units Generation (light) — Unit 11 en unit-of-work.md + secuencia #11.
- [x] Functional Design (light) — construction/unit-11-app-shell/functional-design.md (route-group `(app)`, AppHeader/PrimaryNav/UserMenu, matriz de rutas, a11y, plan de archivos).
- [x] NFR Requirements / NFR Design / Infrastructure — SKIP (sin nuevos NFR ni infra).
- [x] Code Generation - COMPLETE. Route-group `src/app/(app)/` con `AppHeader` (server) + `PrimaryNav`/`UserMenu`/`AdminContextBadge` (client). Rutas autenticadas (matches/pools/rules/settings/admin) movidas al grupo vía `git mv` (URLs intactas). Nuevas primitivas base-ui (sin deps npm nuevas): `components/ui/dropdown-menu.tsx` (Menu) y `sheet.tsx` (Dialog). Claves i18n `nav`/`userMenu`. Reutiliza `signOut()`, `ThemeToggle`, `BrandToggle`, `Avatar`, `Badge`, `getProfile()`. `src/proxy.ts` y root layout sin tocar.
- [x] Build and Test - COMPLETE. Primer harness de tests de componente (vitest + plugin React + jsdom por archivo): `user-menu.test.tsx` (gate admin show/hide, sign-out en `<form action={signOut}>`) y `primary-nav.test.tsx` (`isActive` exact/nested/prefijo, `aria-current`, `AdminContextBadge` solo en /admin). Verificado: tsc 0, Biome limpio, ESLint 0, 122/122 tests, `next build` OK con todas las URLs intactas. Nota: `pnpm check`/`pnpm build` fallan por un gate de supply-chain preexistente (`claudecode-aidlc@0.3.0` en pnpm-lock.yaml modificado); se validó con `biome`/`next build` directos.

**Unit 10: Web Push Notifications** (added via post-construction change, 2026-06-11)
- [x] Requirements updated: FR-PUSH-01 with Web Push + VAPID free baseline and OneSignal as future adapter.
- [x] User stories added: configurable notifications for match start, match finish, pool invite, global rank improvement, and goal scored.
- [x] Application design updated: unit map, dependencies, story map, components, services, shared infrastructure.
- [x] Functional/NFR/Infrastructure design artifacts created under `construction/unit-10-web-push-notifications/`.
- [x] User clarification captured: keep current invite link/code and add directed pool invites by nickname/email; only directed invites with resolved users trigger push.
- [x] Code Generation - COMPLETE (Web Push + VAPID, preferences/devices UI, directed invites, outbox dispatcher, event hooks, 115 tests passing, 0 TS errors, ESLint/Biome/build passing).

**Unit 15: Landing·Reglas·Perfil·Auth·Calculadora** (added via `/aidlc-refine`, 2026-06-13) — refine post-construcción, no reinicia Units 1–14
- [x] Requirements (min) — FR-REFINE-15.1…15.14 añadido a requirements.md.
- [x] User Stories (light) — Épica 14 (US-14.1…US-14.14) en la functional design.
- [x] Functional Design (light) — `construction/unit-15-landing-rules-profile-refine/functional-design.md` (trazabilidad, decisiones por historia, contratos, NFR/Infra, verificación).
- [x] NFR Requirements / NFR Design — SKIP (solo 15.14 toca seguridad: enforcement de `email_confirmed_at` en el gate, NFR-01).
- [x] Infrastructure (light) — migración `prisma/migrations/20260613120000_unit15_onboarding_flag` (`profiles.onboarding_completed` + backfill). Requiere `prisma migrate deploy` en prod (CF-6/Operations).
- [x] Code Generation - COMPLETE. Landing session-aware + limpieza (borrados `pool-preview.tsx`, `landing-secondary-ctas.tsx`); reglas sin callout/toggles duplicados; calculadora de penales en dos columnas (predicción/real); avatares con fallback `onError`; correo actual en Perfil; `change-email` por token_hash + Secure email change documentado; login/registro con react-hook-form + zodResolver; gate por `onboarding_completed` (resiliente: fail-open ante error de lectura, ver §8) y bloqueo de email no confirmado → `/verify-email`. Reutiliza `getProfile()`/`UserMenu`/`derivePenaltyWinner`/`computeScore`/`SignIn/SignUpSchema`/`LOCAL_FALLBACK_AVATARS`/`/auth/confirm`.
- [x] Build and Test - COMPLETE. tsc 0, Biome limpio, ESLint 0, **163/163 tests** (+5 nuevos: `scoring-calculator.test.tsx`, `sign-up-form.test.tsx`), `next build` OK (25 rutas; `/` pasa a dinámico). `pnpm check`/`pnpm build` siguen bloqueados por el gate supply-chain preexistente (`claudecode-aidlc` en pnpm-lock.yaml); validado con `biome`/`eslint`/`next build` directos. **Pendiente**: `prisma migrate deploy` + verificación en vivo + toggles Supabase.
- [x] Correcciones post-construcción (2026-06-13) — ver `functional-design.md §8` y `audit.md`. (1) `startTransition` en login/registro (el dispatch de `useActionState` corría fuera de transición → login sin redirect); (2) gate de onboarding en `proxy.ts` ahora **fail-OPEN ante error de lectura** (`.maybeSingle()`) — el fail-closed convertía una caída de PostgREST (`PGRST002`) en loop app-wide `/matches`↔`/onboarding`; (3) aclaración de UX `calculator.penaltyBonusHint` (bonus por **ganador**, no por marcador; regla sin cambios); (4) **avatares por defecto no visibles** (§8.4) — causa real = layout de Tabs: `src/components/ui/tabs.tsx` usaba variantes `data-horizontal:` pero base-ui emite `data-orientation` → 12 variantes corregidas a `data-[orientation=…]`. Las imágenes siempre cargaban; el grid quedaba fuera de vista. Validado con Playwright (10 avatares visibles); (5) **avatar no se podía cambiar, solo seleccionar** (§8.5) — la selección persistía pero faltaba `router.refresh()` en `AvatarSourceTabs` + `revalidatePath` en las 3 acciones de avatar; añadidos + test `avatar-source-tabs.test.tsx`. Verificado: tsc 0, Biome limpio, **168/168 tests**. **Operations**: reiniciar PostgREST en Supabase (estaba en `PGRST002`). **Dev**: el server corre en el devcontainer en `http://app:3000` (no `localhost:3000`).

**Unit 16: Onboarding obligatorio (defensa en profundidad) + orden del fixture** (added via `/aidlc-refine`, 2026-06-13) — refine post-construcción, no reinicia Units 1–15
- [x] Requirements (min) — FR-REFINE-16.1 … 16.8 añadido a requirements.md (Épica 15).
- [x] User Stories (light) — Épica 15 (US-15.1 … US-15.8) en la functional design.
- [x] Functional Design (light) — `construction/unit-16-onboarding-gate-fixture-order/functional-design.md` (trazabilidad, dos capas de defensa en profundidad vs. fail-open del middleware, transform por día, chrome del onboarding, navegación de pasos, cooldown de nickname en onboarding, tema de marca por cookie, contratos, verificación).
- [x] NFR Requirements / NFR Design / Infrastructure — SKIP (16.1 es control de acceso/SECURITY-08; 16.6 **resuelve** CF-8 — elimina el script inline y la excepción de CSP; 16.3/16.4/16.5 son UI/flujo; sin schema ni migraciones nuevas — la columna `onboarding_completed` ya existe desde Unit 15).
- [x] Code Generation - COMPLETE. **Onboarding obligatorio (16.1)** por dos capas Prisma: `src/app/(app)/layout.tsx` redirige a `/onboarding/profile` si `!onboardingCompleted`; `getOnboardedUserId()` (nuevo, `features/profile/queries.ts`) exigido por `createPool`/`createDirectedInvite`/`savePrediction`. Middleware `proxy.ts` sin cambios (primera línea, fail-open). **Orden del fixture (16.2)**: `groupFixtureByDay` (puro, `predictions/services/fixture-by-day.ts`, UTC) + `getFixtureByDayWithMyPredictions`; `MatchCard` con `contextLabel`; `matches/page.tsx` renderiza por día. **Chrome del onboarding (16.3)**: nuevo `components/layout/onboarding-header.tsx` (BrandToggle + ThemeToggle + `signOut`; NO el AppHeader, que enlaza a rutas gateadas) montado en `onboarding/profile/page.tsx`. **Navegación de pasos (16.4)**: botón "Atrás" centralizado en `onboarding-client.tsx` (`STEP_ORDER`, visible desde el 2º paso). **Cooldown de nickname (16.5)**: `set-nickname.ts` aplica el cooldown de 30 días **solo si `onboardingCompleted`** (volver atrás y re-enviar durante onboarding ya no da `rate_limited`). **Tema de marca por cookie (16.6, resuelve CF-8)**: se elimina el `<script dangerouslySetInnerHTML>` anti-FOUC; `layout.tsx` (async) renderiza `<html data-theme>` desde la cookie `brand-theme` (módulo compartido `lib/brand-theme.ts`), `setBrand` escribe la cookie → desaparece el warning "Encountered a script tag…" de React 19/Next 16 y la excepción de CSP. **Toggles de tema en auth (16.7)**: `(auth)/layout.tsx` monta `BrandToggle` + `ThemeToggle` (arriba a la derecha) → sign-in y hermanas pueden cambiar tema. **Falso negativo de confirmación (16.8, CF-7)**: el enlace de confirmación caía en `/auth/callback` PKCE y `exchange_failed` (cross-device/escáner) mostraba "No pudimos completar la confirmación" aunque el correo SÍ se confirmaba; fix: `sign-up` marca `flow=email_confirm` y el callback redirige a `/sign-in?confirmed=1` (mensaje correcto). Raíz (Operations/CF-7): desplegar plantillas token_hash (`/auth/confirm`). Reutiliza `getProfile()`/`getFixtureWithMyPredictions`/`MatchCard`/`BrandToggle`/`ThemeToggle`/`signOut`.
- [x] Build and Test - COMPLETE. tsc 0, Biome limpio, ESLint 0, **173/173 tests** (+3 `group-fixture-by-day.test.ts`, +1 `set-nickname.test.ts` bypass de cooldown; `save-prediction`/`create-directed-invite` repuntados a `getOnboardedUserId`; 16.3/16.4/16.6 sin tests nuevos), `next build` OK (tras 16.6 el layout es dinámico → rutas de auth antes estáticas pasan a `ƒ`; solo `/icon.svg` queda estática). **Pendiente Operations**: `prisma migrate deploy` (heredado de Unit 15) + verificación en vivo.

**Unit 17: Reglas, Avatar Upload y Nickname Consistency** (added via AI-DLC refine, 2026-06-14) — refine post-construcción, no reinicia Units 1–16
- [x] Requirements (min) — FR-REFINE-17.1 … 17.4 añadido a requirements.md (Épica 16).
- [x] User Stories (light) — Épica 16 (US-16.1 … US-16.4) en la functional design.
- [x] Functional Design (light) — `construction/unit-17-rules-avatar-nickname-refine/functional-design.md` (ranking por liga+global, upload avatar con path único, cooldown tras oportunidad de gracia post-onboarding, nickname case-insensitive en disponibilidad/asignación/búsqueda). Refine 2026-06-14: la gracia es **un cambio** posterior al onboarding; el cooldown aplica a intentos siguientes.
- [x] Code Generation - COMPLETE. Reglas de empate actualizadas a ranking por liga + global; `createAvatarUploadUrl` usa path único por intento y log server-side de error genérico; `checkNicknameAvailability` y `assignDiscriminator` usan comparación case-insensitive para la base; `setNickname` usa `nicknameChangeCount` para permitir nickname #2 sin cooldown y bloquear desde nickname #3 dentro de 30 días; `setNickname` revalida `/settings/profile` y `AccountSettings` refresca la ruta tras éxito para evitar UI stale en Perfil/header.
- [x] Build and Test - COMPLETE. tsc 0, Biome limpio, ESLint 0, **179/179 tests** (+ tests Unit 17 para upload URL único/error estable, disponibilidad case-insensitive, primera asignación post-onboarding sin rate limit, cambio de gracia sin rate limit, intento posterior rate-limited, asignación case-insensitive). Refine de gracia implementado: `pnpm prisma:generate` OK; suite completa verde.

**Unit 18: Landing CTA Copy** (added via AI-DLC refine, 2026-06-14) — refine documental/copy, no reinicia Units 1–17
- [x] Requirements (min) — FR-REFINE-18.1 añadido a requirements.md (Épica 17).
- [x] User Stories (light) — US-17.1 añadido a `inception/user-stories/stories.md`.
- [x] Application Design (light) — contrato de pantalla Landing / Public Home actualizado: CTA principal `Entra a Jugar`.
- [x] Functional Design (light) — `construction/unit-18-landing-cta-copy/functional-design.md` y nota de dependencia en Unit 15.
- [x] NFR / Infrastructure / Code Generation — SKIP. Cambio documental/copy solicitado; sin schema, rutas, servicios ni reinicio de etapas aprobadas.

**Unit 19: Confirmación única del cambio de email** (added via AI-DLC refine, 2026-06-14) — refine post-construcción, no reinicia Units 1–18
- [x] Requirements (min) — FR-REFINE-19.1 añadido a requirements.md (Épica 18); nota de reemplazo en FR-REFINE-15.10.
- [x] User Stories (light) — US-18.1 añadido a `inception/user-stories/stories.md` (Épica 18).
- [x] Functional Design (light) — `construction/unit-19-email-change-single-confirm/functional-design.md`; Unit 15 design marca la doble confirmación como superseded; `unit-9-email/email-design.md` anota envío único al correo nuevo.
- [x] NFR / Infrastructure — SKIP formal. Único impacto: seguridad (desactivar Secure email change) registrado como **CF-9**, tradeoff aceptado por el usuario; Security Baseline sigue habilitado. Sin schema, migraciones, servicios ni rutas.
- [x] Code/Config — COMPLETE. `secure_email_change_enabled = false` en `supabase/config.toml` (+ comentarios); comentario de `src/features/auth/actions/change-email.ts` actualizado; copy `profile.emailDescription`/`emailSuccess` (`src/i18n/dictionaries/es.ts`) a confirmación única. `change-email.ts` (server action) y la plantilla `email_change.html` sin cambios funcionales (siguen siendo correctos para envío único). **Pendiente Operations**: toggle "Secure email change" OFF en el dashboard de Supabase de prod.

**All Units**
- [x] Build and Test - COMPLETE through Unit 8 — re-verified after Unit 8 (0 TS errors, 111 tests, ESLint 0, Biome clean, build passing)
- [x] Build and Test - COMPLETE through Unit 10 implementation (0 TS errors, 115 tests, ESLint 0, Biome clean, build passing).
- [x] Build and Test - COMPLETE through Unit 15 implementation (0 TS errors, 163 tests, ESLint 0, Biome clean, `next build` OK).
- [x] Build and Test - COMPLETE through Unit 16 implementation (0 TS errors, 173 tests, ESLint 0, Biome clean, `next build` OK).
- [x] Build and Test - COMPLETE through Unit 17 implementation (0 TS errors, 177 tests, ESLint 0, Biome clean).
- [x] AI-DLC docs and code updated through Unit 17 nickname grace implementation (`nickname_change_count`; 179/179 tests; Unit 18 remains approved and preserved).

### 🟡 OPERATIONS PHASE
- [~] Operations — Runbook documentado (`operations/operations-runbook.md`). **CF-6 aprobado e implementado** (2026-06-11): migraciones Prisma versionadas (`prisma/migrations/` baseline + RLS/triggers), antiguas SQL en `supabase/migrations-legacy/`. Validado en BD temporal local (drift 0, seed OK, 16 tablas RLS). **Pendiente**: ejecutar `prisma migrate deploy` + seed + habilitar admin en prod (direct connection).
- [x] Operations refine — Banderas SVG (CF-2/CF-3): descarga reproducible implementada con `pnpm sync:flags`; assets locales en `public/flags/`; validado `pnpm check:flags` = 48 flag assets.

## Current Plan-Level Progress
- [x] Review AI-DLC core workflow and mandatory common rules
- [x] Run Workspace Detection
- [x] Reassess classification after user clarification
- [x] Decide to skip Reverse Engineering
- [x] Start Requirements Analysis
- [x] Collect answers in `aidlc-docs/inception/requirements/requirement-verification-questions.md`
- [x] Generate `aidlc-docs/inception/requirements/requirements.md`
- [x] Complete User Stories
- [x] Generate `aidlc-docs/inception/plans/execution-plan.md`
- [x] Preserve approved inception/Application Design stages; do not restart them for Unit 10 refine

## Execution Plan Summary
- **Total Remaining Stages**: 0 for Unit 10 implementation
- **Stages to Execute**: None for Unit 10 or flag-assets refine; do not restart approved inception or Units 1–10 stages
- **Stages to Skip**: Operations placeholder only
- **Next Stage**: Operations/deploy or continue active Unit 9 workflow if still pending
- **Status**: Unit 10 implemented and verified; Unit 4 flag assets completed and validated
