# Unit 16 — Onboarding obligatorio (defensa en profundidad) y orden del fixture · Functional Design

> Refine post-construcción (2026-06-13). **No reinicia** Units 1–15; endurece y
> ajusta flujos existentes. Cubre FR-REFINE-16.1 / 16.2 y la **Épica 15**
> (US-15.1 / US-15.2). Documentación en español (convención AGENTS.md). Dos
> defectos reportados tras uso en vivo.

## 1. Alcance y trazabilidad

| Historia | FR-REFINE | Naturaleza | Resultado |
|----------|-----------|------------|-----------|
| US-15.1 | 16.1 | endurece 15.13 (regresión) | Onboarding obligatorio aplicado en servidor (redirección + bloqueo de acciones) |
| US-15.2 | 16.2 | nuevo | Partidos en `/matches` por orden de ocurrencia, agrupados por día |
| US-15.3 | 16.3 | nuevo | Chrome del onboarding: cerrar sesión + cambiar tema (header mínimo) |
| US-15.4 | 16.4 | nuevo | Navegación al paso anterior dentro del onboarding |
| US-15.5 | 16.5 | corrige interacción 16.4 × 12.5 | Cooldown de nickname no aplica durante onboarding |
| US-15.6 | 16.6 | resuelve CF-8 | Tema de marca por cookie (elimina el script inline y su warning) |
| US-15.7 | 16.7 | nuevo | Toggles de tema/marca en las pantallas de auth (sign-in y hermanas) |
| US-15.8 | 16.8 | bug (CF-7) | Confirmación de cuenta: eliminar el falso negativo del callback PKCE |

## 2. Decisiones de diseño por historia

### Onboarding obligatorio (US-15.1 / FR-REFINE-16.1)

**Problema.** El gate de onboarding vivía **solo** en `src/proxy.ts` (middleware).
Por la corrección de resiliencia de Unit 15 §8.2, ese gate **falla ABIERTO** ante
un error de lectura (no convertir una caída de PostgREST en lockout app-wide) y
además lee `onboarding_completed` por la **API de datos de Supabase (PostgREST)**.
Resultado: si esa columna no es legible (migración no desplegada, caché de schema
caída, etc.), todos los usuarios sin onboarding entran a `/matches` y podrían crear
ligas, invitar o predecir.

**Decisión: defensa en profundidad por la ruta fiable (Prisma / Postgres directo),
en dos capas, conservando el middleware como primera línea.** El requisito del
usuario es doble y ambas partes se implementan:

1. **Obligar a completar el onboarding (redirección).**
   `src/app/(app)/layout.tsx` (server) llama a `getProfile()` (Prisma) y, si
   `profile && !profile.onboardingCompleted`, hace `redirect("/onboarding/profile")`.
   Como **todas** las rutas autenticadas viven en el route-group `(app)`
   (matches, pools, rankings, rules, settings, admin), ninguna se renderiza sin
   onboarding aunque el middleware se evada o falle abierto. `/onboarding/profile`
   está **fuera** del grupo `(app)`, por lo que no hay self-loop.
   - *Borde conocido*: si la fila de perfil **no existe** (trigger no corrió),
     `getProfile()` devuelve null y el layout **no** redirige (para no confundir
     "sin sesión" con "sin fila" y evitar loops). Ese caso lo cubren (a) el
     middleware y (b) la auto-sanación de la página de onboarding
     (`getOrCreateProfile`), y de todos modos la capa 2 bloquea toda mutación.

2. **Blindar las funciones (no se puede crear liga / invitar / predecir).**
   Nuevo helper `getOnboardedUserId()` en `src/features/profile/queries.ts`:
   resuelve el usuario autenticado y devuelve su id **solo si**
   `onboardingCompleted` es true (leído por Prisma con `select`), o `null` en otro
   caso. Las server actions mutadoras lo exigen y devuelven error de dominio:
   - `createPool` → `"Completa tu perfil para crear una liga."`
   - `createDirectedInvite` → `"Completa tu perfil para invitar."`
   - `savePrediction` → `"Completa tu perfil para predecir."`
   Esto protege incluso ante invocación directa de la action (POST) sin pasar por
   la UI gateada. Alinea con SECURITY-08 (deny-by-default, control de acceso a
   nivel de función, defensa en profundidad).

**El middleware `proxy.ts` no cambia**: sigue como primera línea con su fail-open
intencional. La garantía dura ahora son las dos capas Prisma.

### Orden del fixture (US-15.2 / FR-REFINE-16.2)

**Problema.** `/matches` renderiza 18 secciones de fase (12 grupos A–L + 6 rondas)
en `displayOrder`; dentro de cada fase los partidos van por `kickoffAt`, pero a
nivel de página se ven "todos los de Grupo A, luego Grupo B…", no en orden de
ocurrencia (en el Mundial real los partidos de distintos grupos se intercalan por
fecha).

**Decisión (AskUserQuestion): lista agrupada por día.** Encabezado por fecha
(p. ej. "Jueves, 11 de junio"); dentro de cada día, por hora de inicio; cada
partido conserva una etiqueta de su grupo/ronda. Partidos sin `kickoffAt`
(eliminatorias por resolver) van al final bajo "Fecha por confirmar".

- **Transform puro** `groupFixtureByDay(phases)` en
  `src/features/predictions/services/fixture-by-day.ts` (sin Prisma → unit-testable):
  aplana fases → lista; ordena por `kickoffAt` (desempate `matchNumber`); agrupa
  por día. La clave de día y la etiqueta se calculan en **UTC**
  (`Intl.DateTimeFormat("es", { weekday, day, month, timeZone: "UTC" })`) para un
  orden determinista (Vercel corre en UTC) y coherente con el render por tarjeta.
  La etiqueta de grupo es `Grupo {groupCode}` si hay grupo, si no el nombre de la
  fase (p. ej. "Round of 16").
- **Wrapper** `getFixtureByDayWithMyPredictions(userId)` en
  `src/features/predictions/queries.ts` reutiliza `getFixtureWithMyPredictions`
  (predicciones del usuario incluidas) y aplica `groupFixtureByDay`.
- **MatchCard** gana prop opcional `contextLabel` (muestra "Grupo A · Partido N · fecha").
- **Página** `src/app/(app)/matches/page.tsx` itera `fixture.days` y, por día,
  renderiza un `<section>` con `<h2>` de fecha + `MatchCard` por partido.
- Quedan sin uso (no se borran; se conservan para re-cablear): `PhaseSection`,
  `getFixture` (variante con `freshness`) y `FixtureStaleBanner`. **Sin regresión**:
  `getFixtureWithMyPredictions` nunca devolvió `freshness`, por lo que el banner de
  staleness no se mostraba a usuarios autenticados — y `/matches` es ahora ruta
  gateada (siempre autenticada).

### Chrome del onboarding (US-15.3 / FR-REFINE-16.3)

**Problema.** La pantalla de onboarding (`/onboarding/profile`, **fuera** del
route-group `(app)`) no tiene header, así que no había forma de **cerrar sesión**
ni **cambiar de tema/marca** desde ahí. Pregunta del usuario: "¿hay que importar
el header?".

**Decisión: header mínimo propio, NO el `AppHeader`.** El `AppHeader` lleva
`PrimaryNav` y un `UserMenu` que enlazan a `/matches`, `/settings/*` y `/admin` —
rutas de las que un usuario sin onboarding está gateado (16.1), por lo que esos
enlaces lo rebotarían de vuelta a `/onboarding/profile`. Se crea
`src/components/layout/onboarding-header.tsx` (server component) que expone solo lo
que tiene sentido durante el onboarding: `BrandToggle` + `ThemeToggle` (mismos
componentes que usa `AppHeader`) y un botón de cerrar sesión en
`<form action={signOut}>` (reutiliza la server action existente). No lee sesión.
La página `onboarding/profile/page.tsx` pasa a layout en columna: header arriba +
contenido centrado debajo.

### Navegación al paso anterior (US-15.4 / FR-REFINE-16.4)

**Problema.** `OnboardingClient` avanzaba solo hacia adelante (`onComplete`
→ `setStep`); no se podía volver a un paso anterior.

**Decisión: botón "Atrás" centralizado en `OnboardingClient`.** Se define el orden
lineal `STEP_ORDER = [nickname, avatar, rules, passkey]`; un botón "Atrás"
(`es.common.back`) bajo el indicador de progreso retrocede un paso, visible solo
cuando `stepIndex > 0` ("cuando aplique"). Centralizado (no se toca cada
step component) para mantener la navegación consistente. Los datos ya guardados
(nickname por `set-nickname`, avatar por las acciones de avatar) persisten en BD,
así que retroceder/avanzar no los pierde.

### Cooldown de nickname durante onboarding (US-15.5 / FR-REFINE-16.5)

**Problema (interacción 16.4 × 12.5).** `setNickname` sella `nicknameUpdatedAt`. La
nueva navegación "Atrás" (16.4) permite volver al paso de nickname y re-enviar;
como ya había un `nicknameUpdatedAt` reciente, el cooldown de 30 días de
FR-REFINE-12.5 devolvía `rate_limited` y **bloqueaba** continuar el onboarding.

**Decisión.** El cooldown es para **cambios posteriores a la oportunidad de
gracia**, no para configurar el nickname. En `set-nickname.ts` se lee también
`onboardingCompleted` y el cooldown se evalúa **solo si `onboardingCompleted ===
true`**. Durante el onboarding (flag aún `false` — lo marca `completeOnboarding()`
al final) el cambio siempre se permite. Refine Unit 17: después del nickname de
onboarding, el usuario conserva **un cambio de gracia** sin esperar 30 días; a
partir del siguiente intento dentro de la ventana debe devolver `rate_limited`.
Tests: el caso de rate-limit fija `onboardingCompleted: true`; otro caso verifica
que con `false` y timestamp reciente NO se limita.

### Tema de marca por cookie — sin script inline (US-15.6 / FR-REFINE-16.6, resuelve CF-8)

**Problema.** El bootstrap anti-FOUC del eje de marca era un `<script
dangerouslySetInnerHTML={{ __html: BRAND_BOOTSTRAP }} />` en `layout.tsx`. En React
19 / Next 16 ese `<script>` inline ejecutable dispara en runtime *"Encountered a
script tag while rendering React component"* cuando React lo **crea en cliente**
(`createInstance`, p. ej. tras una server action) — el warning está codificado en
react-dom para todo `<script>` ejecutable salvo "data blocks" (`isScriptDataBlock`),
y **no** lo silencia `suppressHydrationWarning` (intento previo fallido).
`next/script beforeInteractive` renderiza el mismo tipo de `<script>` inline
ejecutable → tampoco lo evita.

**Decisión: eliminar el script y renderizar la marca server-side desde cookie.**
- `src/lib/brand-theme.ts` (nuevo, sin "use client"): `BRANDS`, `Brand`,
  `BRAND_COOKIE`, `DEFAULT_BRAND`, `coerceBrand` — compartido entre el layout
  (server) y el provider (client).
- `layout.tsx` pasa a **async**, lee `cookies()` (`BRAND_COOKIE`), valida con
  `coerceBrand` y emite `<html data-theme={brand}>`. Se borran `BRAND_BOOTSTRAP`,
  el `<script>` y el `biome-ignore`.
- `brand-theme-provider.tsx`: `setBrand` escribe la cookie `brand-theme`
  (`SameSite=Lax`, 1 año) además de localStorage y el atributo DOM; importa los
  tipos/constantes del módulo compartido (re-exporta `BRANDS`/`Brand` para no
  romper imports de `brand-toggle`).
- **Efecto**: desaparece el warning **de nuestro script** y la excepción de
  seguridad CF-8 queda **resuelta** (sin inline script → sin constraint de
  hash/nonce en `script-src`). **Coste**: leer cookie en el layout raíz lo hace
  **dinámico** (las rutas de auth antes estáticas pasan a `ƒ`); aceptado.
  **Migración menor**: usuarios que habían fijado marca en localStorage sin cookie
  verán el default hasta el próximo `setBrand` (one-paint, solo si habían cambiado
  de "deportivo").
- **Warning residual de next-themes (decisión: ACEPTADO, 2026-06-13)**: tras quitar
  nuestro script, el mismo warning *"Encountered a script tag…"* reaparece apuntando
  a `theme-provider.tsx` (`NextThemesProvider`). Causa: next-themes inyecta **su
  propio** `<script>` inline anti-flash, que React recrea en cliente (React Strict
  Mode en dev y/o re-render de RSC) → `createInstance` lo reporta. Es **dev-only**
  (el `console.error` solo existe en `react-dom-*.development.js`; **producción no lo
  emite**) e inofensivo (el tema ya se aplicó; un `<script>` recreado no se
  re-ejecuta). **No se puede eliminar limpiamente**: next-themes necesita ese script
  para el modo `system` (la preferencia `prefers-color-scheme` solo se conoce en
  cliente; no hay equivalente server-only sin flash — a diferencia de la marca, que
  no depende de preferencia del SO y por eso sí pasó a cookie). Decisión del usuario
  (AskUserQuestion): **dejarlo** (no desactivar Strict Mode ni reemplazar
  next-themes). Ver memoria `next-themes-script-warning-devonly`.

### Toggles de tema en auth (US-15.7 / FR-REFINE-16.7)

**Problema.** Las pantallas no autenticadas (sign-in, etc.) no tenían forma de
cambiar tema/marca (no montan `AppHeader`).

**Decisión.** Añadir `BrandToggle` + `ThemeToggle` en un **header superior**
del layout compartido `src/app/(auth)/layout.tsx`, dentro de un contenedor
centrado (`mx-auto w-full max-w-4xl`, right-aligned) **igual que el header del
landing** — no pegado a la esquina del viewport. La tarjeta de auth queda
centrada debajo (`flex-1`). Así sign-in y sus hermanas (sign-up, forgot/reset
password, verify-email) lo obtienen de forma consistente y con la misma posición
que el landing. No hay cerrar sesión (sin sesión). Reutiliza los mismos
componentes de toggle que `AppHeader` y `OnboardingHeader`.

### Confirmación de cuenta sin falso negativo (US-15.8 / FR-REFINE-16.8, CF-7)

**Síntoma.** Tras clic en el enlace de confirmación, `/sign-in` mostraba "No
pudimos completar la confirmación…" (`exchange_failed`) pero el correo **sí**
quedaba confirmado (al iniciar sesión el usuario pasaba al onboarding).

**Causa.** Con la plantilla PKCE por defecto, el enlace va a Supabase `verify` →
**confirma el correo** → redirige a `/auth/callback?code=…`. Ahí
`exchangeCodeForSession` falla si el enlace se abrió en **otro
dispositivo/navegador** o lo **pre-cargó un escáner** de correo (no está la cookie
`code-verifier`). El correo ya quedó confirmado; solo falló crear la sesión en ese
navegador → `exchange_failed` = **falso negativo**.

**Decisión (código).** `sign-up.ts` añade `flow=email_confirm` a `emailRedirectTo`.
En `/auth/callback`, si el intercambio falla **y** `flow=email_confirm`, se redirige
a `/sign-in?confirmed=1` con un banner de estado (no destructivo): "Tu correo fue
confirmado. Inicia sesión para continuar." Los fallos de OAuth (sin ese flag)
siguen dando `exchange_failed`. Distinguir por el flag evita decir "correo
confirmado" en un fallo real de Google. (Llegar al callback **con** un `code`
implica que el token ya se verificó → el correo está confirmado.)

**Fix de raíz (Operations, CF-7).** La solución definitiva es la plantilla
**token_hash** (`/auth/confirm` + `verifyOtp`), ya implementada y versionada en
`supabase/templates/confirmation.html` + `config.toml`; no depende de PKCE/cookie y
elimina el falso negativo de origen. Pendiente: **desplegar/aplicar** esas
plantillas en el proyecto Supabase de prod (hoy usa la plantilla por defecto, por
eso cae en `/auth/callback`). El fix de código es la red de seguridad mientras
tanto.

## 3. Contratos (nuevos / modificados)

| Elemento | Tipo | Cambio |
|----------|------|--------|
| `src/app/(app)/layout.tsx` | mod | Gate de onboarding server-side (Prisma) → redirect |
| `features/profile/queries.ts` `getOnboardedUserId()` | new | Devuelve userId solo si onboarding completo (Prisma) |
| `pools/actions/create-pool.ts` | mod | Exige `getOnboardedUserId()` |
| `pools/actions/create-directed-invite.ts` | mod | Exige `getOnboardedUserId()` |
| `predictions/actions/save-prediction.ts` | mod | Exige `getOnboardedUserId()` |
| `predictions/services/fixture-by-day.ts` | new | `groupFixtureByDay` + tipos `DayMatchView`/`FixtureDayGroup` |
| `predictions/queries.ts` `getFixtureByDayWithMyPredictions()` | new | Fixture agrupado por día |
| `competition/components/match-card.tsx` | mod | Prop opcional `contextLabel` |
| `app/(app)/matches/page.tsx` | mod | Render por día (en vez de por fase) |
| `components/layout/onboarding-header.tsx` | new | Header mínimo (toggles + signOut) para onboarding |
| `app/onboarding/profile/page.tsx` | mod | Layout en columna + monta `OnboardingHeader` |
| `app/onboarding/profile/onboarding-client.tsx` | mod | Botón "Atrás" centralizado (`STEP_ORDER`) |
| `i18n/dictionaries/es.ts` | mod | Clave `common.back` |
| `features/profile/actions/set-nickname.ts` | mod | Cooldown solo si `onboardingCompleted` |
| `lib/brand-theme.ts` | new | Módulo compartido del eje de marca (BRANDS/cookie/coerceBrand) |
| `app/layout.tsx` | mod | Async; `<html data-theme>` desde cookie; sin script inline |
| `components/providers/brand-theme-provider.tsx` | mod | `setBrand` escribe cookie; usa módulo compartido |
| `app/(auth)/layout.tsx` | mod | `BrandToggle` + `ThemeToggle` (toggles de tema en auth) |
| `features/auth/actions/sign-up.ts` | mod | `flow=email_confirm` en `emailRedirectTo` |
| `app/auth/callback/route.ts` | mod | Fallo de intercambio en email_confirm → `?confirmed=1` |
| `app/(auth)/sign-in/page.tsx` | mod | Banner de estado `confirmed=1` |

## 4. Estados, accesibilidad, i18n
- Mensajes de bloqueo de acciones en español ("Completa tu perfil para …").
- Encabezados de día con `capitalize`; `data-testid` `fixture-day-{dayKey|tbd}`.
- El gate del layout es una redirección de servidor (sin parpadeo de contenido
  protegido).

## 5. NFR / Infra
- **NFR**: FR-REFINE-16.1 es de seguridad/integridad (control de acceso a nivel de
  función; defensa en profundidad — SECURITY-08). Sin nuevos NFR formales.
- **Infra**: ninguna. **Sin cambios de schema ni migraciones** (la columna
  `onboarding_completed` ya existe desde Unit 15 — sigue pendiente
  `prisma migrate deploy` en prod, CF-6/Operations).

## 6. Verificación (criterios de "hecho")
- **Verificado (2026-06-13)**: `tsc --noEmit` 0 errores; Biome limpio; ESLint 0;
  **173/173 tests** (3 nuevos de `group-fixture-by-day.test.ts` + 1 nuevo en
  `set-nickname.test.ts` para el bypass de cooldown en onboarding;
  `save-prediction`/`create-directed-invite` repuntados a `getOnboardedUserId`);
  `next build` OK (`/matches` dinámica; tras 16.6 las rutas de auth antes estáticas
  pasan a dinámicas por leer cookie en el layout — solo `/icon.svg` queda estática).
- **Pendiente Operations / en vivo** (requiere `prisma migrate deploy` + flag):
  - Usuario sin nickname → cualquier ruta `(app)` lo redirige a `/onboarding/profile`.
  - `createPool`/`createDirectedInvite`/`savePrediction` sin onboarding → error.
  - `/matches` en orden cronológico con encabezados por día.
  - Onboarding muestra header con toggles de tema/marca + cerrar sesión; el botón
    "Atrás" aparece desde el 2º paso y retrocede sin perder datos.
  - Volver al paso de nickname y re-enviar **no** da `rate_limited` (16.5).
  - Cambiar la marca persiste tras recargar (cookie) y no aparece el warning
    "Encountered a script tag…" en consola (16.6).
  - La pantalla de sign-in (y hermanas) muestra los toggles de tema/marca y
    cambian el tema (16.7).
  - Confirmar cuenta abriendo el enlace en otro navegador/dispositivo: NO aparece
    "No pudimos completar la confirmación"; aparece "Tu correo fue confirmado.
    Inicia sesión para continuar." y el login entra al onboarding (16.8). Fix de
    raíz pendiente en Operations: desplegar plantillas token_hash (`/auth/confirm`).

> **Nota (16.3/16.4)**: cambios UI-only; no añaden tests automatizados (navegación
> de pasos triviales + reuso de `BrandToggle`/`ThemeToggle`/`signOut`). Cubiertos
> por la verificación manual y el suite existente (172/172 sin regresión).

## 7. Épica 15 — Historias de usuario
- **US-15.1**: Como sistema quiero que el onboarding sea obligatorio — un usuario
  sin nickname no puede entrar a la app ni crear ligas, invitar o predecir — de
  forma fiable aunque la API de datos falle.
- **US-15.2**: Como usuario quiero ver los partidos en `/matches` en orden de
  ocurrencia (cronológico, agrupado por día), no agrupados por grupo/fase.
- **US-15.3**: Como usuario en onboarding quiero poder cerrar sesión y cambiar el
  tema/marca sin tener que terminar primero.
- **US-15.4**: Como usuario en onboarding quiero volver al paso anterior cuando
  aplique para corregir lo que ingresé.
- **US-15.5**: Como usuario en onboarding quiero poder corregir mi nickname (volver
  atrás y re-enviar) sin que el límite de cambios me bloquee.
- **US-15.6**: Como sistema quiero aplicar el tema de marca sin un script inline,
  para no emitir warnings de runtime ni requerir una excepción de CSP.
- **US-15.7**: Como visitante en la pantalla de sign-in quiero poder cambiar el
  tema/marca antes de iniciar sesión.
- **US-15.8**: Como usuario que confirma su cuenta quiero un mensaje correcto (no
  un falso "no pudimos confirmar") cuando el correo ya quedó confirmado.

## 8. Refine dependiente Unit 17 (2026-06-14)

Unit 17 no reinicia Unit 16; ajusta la semántica de FR-REFINE-16.5:

- El cooldown de nickname no solo debe omitirse durante onboarding. También debe
  omitirse en la **oportunidad de gracia post-onboarding**: el primer cambio
  posterior a la asignación inicial se permite sin esperar 30 días. La ventana de
  30 días empieza a bloquear a partir de intentos posteriores, cuando esa gracia ya
  fue consumida. La implementación Unit 17 persiste esta distinción con
  `profiles.nickname_change_count`.
- La comparación de nickname se refuerza como case-insensitive en disponibilidad y
  asignación: `Pepe#1234` y `pepe#1234` son el mismo nickname lógico.
