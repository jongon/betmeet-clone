# Unit 15 — Refine de Landing, Reglas, Perfil, Auth & Calculadora · Functional Design

> Refine post-construcción (2026-06-13). **No reinicia** Units 1–14; refina flujos
> existentes. Cubre FR-REFINE-15.1 … 15.14 y la **Épica 14** (US-14.1 … US-14.14).
> Documentación en español (convención AGENTS.md). Lote de bugs/ajustes reportados
> tras uso en vivo.

## 1. Alcance y trazabilidad

| Historia | FR-REFINE | Naturaleza | Resultado |
|----------|-----------|------------|-----------|
| US-14.1 | 15.1 | nuevo | Landing sin sección de ligas públicas |
| US-14.2 | 15.2 | nuevo | Landing sin "Explorar ligas" ni login duplicado |
| US-14.3 | 15.3 | extiende 12.8 | Landing consciente de sesión (nickname/menú) |
| US-14.4 | 15.4 | nuevo | Toggles del landing alineados a la derecha |
| US-14.5 | 15.5 | coherencia c/ Unit 14 | Reglas sin "ranking por liga, no global" |
| US-14.6 | 15.6 | regresión Unit 11 | Reglas sin toggles duplicados en el body |
| US-14.7 | 15.7 | extiende 14.4/14.5 | Calculadora de penales por predicción/real |
| US-14.8 | 15.8 | endurece 12.6 | Avatares por defecto con fallback `onError` |
| US-14.9 | 15.9 | extiende 12.4 | Correo actual visible en cambio de email |
| US-14.10 | 15.10 | bug 12.4 | Cambio de email aplica (token_hash + doble confirm) |
| US-14.11 | 15.11 | nuevo | Validación cliente del login |
| US-14.12 | 15.12 | nuevo | Validación cliente del registro |
| US-14.13 | 15.13 | regresión 12.7 | Gate de onboarding por flag explícito |
| US-14.14 | 15.14 | nuevo (seguridad) | Confirmación de email forzada en el gate |

## 2. Decisiones de diseño por historia

### Landing (US-14.1 … 14.4) — `src/app/page.tsx`
- El landing pasa a **server component consciente de sesión**: `getProfile()` y, si
  hay perfil, renderiza `UserMenu` (avatar+nickname, reutiliza Unit 11); si no, los
  enlaces `headerSignIn`/`headerSignUp`.
- Se eliminan `PoolPreview` + `IslandBoundary` + la carga `listPublicPools` y el
  componente `LandingSecondaryCtas` (enlace "Explorar ligas públicas" + login
  duplicado). Ambos componentes quedan huérfanos y se **borran**
  (`pool-preview.tsx`, `landing-secondary-ctas.tsx`); claves i18n muertas removidas
  (`explorePools`, `poolsTitle`, `poolsEmpty`, `poolsError`).
- Toggles (`BrandToggle`/`ThemeToggle`) movidos a la derecha (consistencia con
  `AppHeader`). `listPublicPools` se conserva (la usa `/pools/discover`).

### Reglas (US-14.5 / 14.6) — `src/app/(app)/rules/page.tsx`
- Se elimina `DismissibleCallout cueId="ranking-pool-only"` y la clave
  `es.cues.rankingPoolOnly` (contradicen el ranking global de Unit 14).
- Se elimina el bloque de toggles del body (regresión al introducir `AppHeader` en
  Unit 11); el header global ya los provee.

### Calculadora de penales (US-14.7) — `scoring-calculator.tsx`
- La sección de penales se reestructura a **dos columnas** `prediction`/`actual`
  (mismo layout que el marcador regular). Estado desdoblado:
  `predictedPenalty{Home,Away}` y `actualPenalty{Home,Away}`. El ganador de cada
  tanda se deriva con `derivePenaltyWinner`; una tanda empatada es inválida (alerta
  por columna). `computeScore` recibe `predictedPenaltyWinner` y
  `actualPenaltyWinner` reales (ya no el atajo que asumía que coincidían). El bonus
  aplica solo si ambos ganadores coinciden. Defaults: knockout on + real 2-2 para
  mostrar la tanda de entrada. Nueva clave i18n `calculator.penaltyShootout`.
- **Regla del bonus = por GANADOR, no por marcador** (coherente con FR-REFINE-14.4:
  "el marcador es UX/educativo"). El bonus se otorga cuando los ganadores derivados
  coinciden, aunque los marcadores difieran (4-3 vs 4-2 → ambos local → +1). Para
  evitar que los dos inputs de marcador induzcan a pensar que hay que clavar el
  marcador exacto, se añade la clave `calculator.penaltyBonusHint` ("El bonus (+1)
  se gana por acertar quién gana la tanda, no por el marcador exacto.") bajo la
  leyenda "Tanda de penales" (ver §8 — aclaración de UX confirmada por el usuario).

### Perfil (US-14.8 … 14.10)
- **Avatares (15.8)** — `avatar-grid.tsx`: `<Image onError>` por avatar; al fallar
  la URL remota, degrada al SVG local equivalente (`LOCAL_FALLBACK_AVATARS`), de
  modo que el grid nunca muestra huecos aunque `avatar_assets` apunte a un Storage
  inaccesible. Endurece el fallback de 12.6 (que solo cubría tabla vacía).
  **Nota**: este fallback NO era el origen del "avatares no visibles" reportado —
  las imágenes siempre cargaban; el bug real era de layout de Tabs (ver §8.4). El
  `onError` se conserva como defensa, pero el síntoma se resolvió en §8.4.
- **Correo actual (15.9)** — `account-settings.tsx` + `settings/profile/page.tsx`:
  la página obtiene el email vía `supabase.auth.getUser()` y lo pasa como
  `currentEmail`; se muestra en un input de solo lectura. Nueva clave
  `profile.emailCurrentLabel`.
- **Cambio de email (15.10)** — `change-email.ts`: `emailRedirectTo` apunta a
  `/auth/confirm` (token_hash/verifyOtp), consistente con el resto de auth y con la
  plantilla `email_change.html` (que ya enlazaba a `/auth/confirm`). El bloqueo real
  observado ("no da error pero no cambia") corresponde a **Secure email change** de
  Supabase: requiere confirmar desde el correo actual **y** el nuevo. Decisión:
  mantenerlo activo (seguro) y hacerlo explícito en el copy (`emailDescription`/
  `emailSuccess`); documentado en `supabase/config.toml`
  (`secure_email_change_enabled = true`).

### Validación cliente (US-14.11 / 14.12) — `sign-in-form.tsx`, `sign-up-form.tsx`
- Se introduce **react-hook-form + zodResolver** (deps ya presentes, stack en
  AGENTS.md) reutilizando `SignInSchema`/`SignUpSchema`. `mode: "onTouched"`. En
  submit válido se despacha el server action (`useActionState`) construyendo el
  `FormData`; el server **revalida**. Se preservan los paneles existentes (email no
  confirmado, MFA modal) y el flujo de `next`. `SignInSchema` tiene `rememberMe` con
  default → `useForm` se parametriza con input/output (`z.input` + `SignInInput`).
  **Importante** (ver §8): como el dispatch se invoca desde el callback de
  `handleSubmit` (no desde el prop `action`/`formAction` de un `<form>`), debe
  envolverse en `startTransition`; de lo contrario `pending` no actualiza y el
  `redirect()` del server action no se propaga (login "silencioso" sin navegar).

### Gate (US-14.13 / 14.14) — `src/proxy.ts` + migración Prisma
- **Onboarding (15.13)**: nueva columna `profiles.onboarding_completed`
  (`@default(false)`, migración `20260613120000_unit15_onboarding_flag` + backfill
  `nickname_base IS NOT NULL → true`). `set-nickname.ts` la marca `true` (junto con
  `nickname_base`, en el mismo update) al completar onboarding. El gate lee
  `onboarding_completed` (no `nickname_base`) con `.maybeSingle()` y solo redirige
  a `/onboarding/profile` cuando determina **positivamente** incompleto: fila con
  el flag `false`, o **sin fila** (usuario nuevo — `maybeSingle` no trata "sin
  fila" como error). Ante un **error de lectura** (p. ej. caída de la API de datos
  / PostgREST `PGRST002`) el gate **falla ABIERTO** (deja pasar). Ver
  §8 "Corrección post-construcción": el fail-CLOSED inicial provocaba un loop
  app-wide cuando PostgREST estaba caído, porque la página de onboarding lee el
  perfil por Prisma (otra ruta de datos) y rebotaba al usuario de vuelta.
- **Confirmación de email (15.14)**: el gate calcula `emailConfirmed =
  !user || Boolean(user.email_confirmed_at)`. Un usuario autenticado sin confirmar
  que accede a ruta no pública → `/verify-email`. El redirect auth-only→`/matches` y
  el gate de onboarding solo aplican a usuarios confirmados (evita loop con
  `/verify-email`, que es pública). Requiere "Confirm email" ON en Supabase
  (`supabase/config.toml: enable_confirmations = true`).

## 3. Contratos de acciones / componentes (nuevas / modificadas)

| Elemento | Tipo | Cambio |
|----------|------|--------|
| `page.tsx` (landing) | mod | Server, session-aware; quita pools/CTAs; toggles a la derecha |
| `pool-preview.tsx`, `landing-secondary-ctas.tsx` | del | Componentes huérfanos eliminados |
| `rules/page.tsx` | mod | Quita callout + toggles del body |
| `scoring-calculator.tsx` | mod | Tanda de penales en dos columnas + ganadores derivados |
| `avatar-grid.tsx` | mod | `onError` → fallback local |
| `account-settings.tsx` | mod | Prop `currentEmail` + display solo-lectura |
| `settings/profile/page.tsx` | mod | Obtiene y pasa `currentEmail` |
| `change-email.ts` | mod | `emailRedirectTo` → `/auth/confirm` |
| `sign-in-form.tsx`, `sign-up-form.tsx` | mod | RHF + zodResolver (validación cliente) |
| `set-nickname.ts` | mod | Marca `onboardingCompleted = true` |
| `proxy.ts` | mod | Gate de email confirmado + onboarding por flag |
| `schema.prisma` + migración | mod | `profiles.onboarding_completed` |

## 4. Estados, accesibilidad, i18n
- Formularios de auth: errores de campo client/server combinados, `aria-invalid`/
  `aria-describedby`, `noValidate` (RHF maneja la validación). Calculadora: alertas
  `role="alert"` por columna de penal inválida. Copy en español/i18n en `es.ts`.

## 5. NFR / Infra
- **NFR**: solo 15.14 (enforcement de confirmación en el gate, NFR-01 seguridad).
  NFR Requirements/Design e Infrastructure formales: **SKIP**.
- **Infra**: migración versionada `20260613120000_unit15_onboarding_flag`. Requiere
  `prisma migrate deploy` + backfill en prod (CF-6 / Operations). Supabase:
  "Confirm email" ON y "Secure email change" según `config.toml`.

## 6. Verificación (criterios de "hecho")
- `tsc --noEmit` 0 errores; Biome limpio; ESLint 0; Vitest verde; `next build` OK.
- **Verificado (2026-06-13)**: tsc 0, Biome limpio, ESLint 0, **163/163 tests**
  (158 previos + 5 nuevos: `scoring-calculator.test.tsx` 3, `sign-up-form.test.tsx`
  2), `next build` OK con las 25 rutas (el landing `/` pasa a dinámico por leer
  sesión). `pnpm check`/`pnpm build` siguen bloqueados por el gate supply-chain
  preexistente (`claudecode-aidlc` en `pnpm-lock.yaml`); validado con
  `biome`/`eslint`/`next build` directos.
- **Pendiente Operations**: `prisma migrate deploy` (columna `onboarding_completed`)
  + verificación en vivo de los flujos (cambio de email end-to-end, gate de email no
  confirmado y de onboarding con usuario real) y de los toggles de Supabase.

## 7. Épica 14 — Historias de usuario

- **US-14.1**: Como visitante quiero un landing enfocado (sin directorio de ligas
  públicas) para entender la propuesta sin ruido.
- **US-14.2**: Como visitante no quiero enlaces redundantes ("Explorar ligas",
  login duplicado) en el landing.
- **US-14.3**: Como usuario con sesión quiero ver mi nickname/menú en el landing en
  vez de "Iniciar sesión".
- **US-14.4**: Como usuario quiero que los controles de tema/marca estén en el mismo
  lugar (derecha) en todas las pantallas.
- **US-14.5**: Como usuario quiero que las reglas no se contradigan con el ranking
  global existente.
- **US-14.6**: Como usuario no quiero ver los toggles de tema duplicados en Reglas.
- **US-14.7**: Como usuario quiero estimar mis puntos de penales con "Tu predicción"
  vs "Resultado real", como en el marcador.
- **US-14.8**: Como usuario quiero ver los avatares por defecto siempre, aunque el
  Storage remoto falle.
- **US-14.9**: Como usuario quiero ver mi correo actual al ir a cambiarlo.
- **US-14.10**: Como usuario quiero que el cambio de correo realmente se aplique tras
  confirmar.
- **US-14.11**: Como usuario quiero feedback inmediato (cliente) de email/contraseña
  al iniciar sesión.
- **US-14.12**: Como usuario quiero validación cliente de email, contraseña y
  confirmación al registrarme.
- **US-14.13**: Como usuario nuevo quiero pasar por el onboarding de forma fiable.
- **US-14.14**: Como sistema quiero impedir el acceso a usuarios con email sin
  confirmar.

## 8. Correcciones post-construcción (2026-06-13)

Tres defectos detectados en uso en vivo justo después de cerrar Unit 15. No
reinician etapas, no cambian schema ni la regla de negocio de penales.

### 8.1 Login "silencioso" sin redirect (regresión de 15.11/15.12)
- **Síntoma**: warning *"An async function with useActionState was called outside
  of a transition"*; la sesión se inicia pero el navegador no redirige.
- **Causa**: al migrar los forms a react-hook-form, el dispatch de `useActionState`
  (`formAction`) se invoca desde el callback de `handleSubmit` (no desde el prop
  `action` de un `<form>`), es decir **fuera de transición** → `pending` no
  actualiza y el `redirect()` del server action no se propaga.
- **Fix**: envolver el dispatch en `startTransition` en `sign-in-form.tsx` y
  `sign-up-form.tsx`.

### 8.2 Loop de redirecciones a `/matches` (pantalla en blanco)
- **Síntoma**: tras login, `/matches` no carga; muchas redirecciones; pantalla en
  blanco. Afecta a todos los usuarios.
- **Causa raíz (infra)**: PostgREST (la API de datos de Supabase) caída con
  `PGRST002 "Could not query the database for the schema cache"` para **toda**
  tabla/columna (Prisma/Postgres directo seguía OK; conexiones sanas; la migración
  `ADD COLUMN` es benigna).
- **Causa que lo volvió lockout (código)**: el gate de onboarding 15.13 fallaba
  **CLOSED**. Con la API caída, `supabase.from('profiles').select('onboarding_completed')`
  erraba → `data` null → redirect a `/onboarding/profile`; pero esa página lee el
  perfil por **Prisma** (otra ruta de datos, sí ve el nickname) → `redirect('/matches')`
  → bucle infinito. El código previo (que leía `nickname_base` con fail-OPEN) no
  podía hacer loop.
- **Fix (resiliencia)** en `src/proxy.ts`: el gate usa `.maybeSingle()` y solo
  redirige cuando determina **positivamente** incompleto (fila con flag `false`, o
  sin fila); ante **error de lectura** falla **ABIERTO**. Principio: el middleware
  no debe convertir una caída de la API de datos en un lockout app-wide. Además
  `set-nickname.ts` setea `nickname_base` y `onboarding_completed` en el mismo
  update (sin discrepancia futura entre las dos rutas de datos).
- **Operations**: la caída de PostgREST se resuelve reiniciando el proyecto en el
  dashboard de Supabase. Estado al cierre de sesión: aún `PGRST002`.

### 8.3 Aclaración de la regla del bonus de penales (no era bug)
- **Reporte**: "la calculadora solo acumula el punto si acierta el marcador de los
  penales".
- **Hallazgo**: NO es un bug. El motor (`compute-score.ts`) y la calculadora ya
  otorgan el bonus por acertar el **ganador** de la tanda, no el marcador exacto.
  La confusión era de UX (los dos inputs de marcador sugerían lo contrario).
- **Decisión del usuario (AskUserQuestion)**: mantener la regla **por ganador**.
- **Fix (solo UX)**: clave i18n `calculator.penaltyBonusHint` renderizada bajo la
  leyenda "Tanda de penales". Sin tocar el motor ni los rankings.

### 8.4 Avatares por defecto "no visibles" — causa real: layout de Tabs (no las imágenes)
- **Síntoma**: en Perfil (y onboarding) el bloque de avatares por defecto aparece
  vacío. Reportado varias veces; fixes previos (15.8 fallback local + `onError`)
  **no** lo resolvieron porque atacaban la capa equivocada.
- **Diagnóstico (capa por capa)**: `avatar_assets` tiene 10 filas con URLs válidas;
  Storage responde **200** + SVG con colores explícitos; CSP **Report-Only** (no
  bloquea) y permite el host; `remotePatterns`/`img-src` correctos; `AvatarGrid`
  renderiza 10 `<img>` (jsdom + SSR del server real). Con **Playwright** las 10
  imágenes cargan (`naturalWidth=240`, `complete`), pero el **screenshot** mostró el
  grid **fuera de vista**: los Tabs se renderizaban como cajas enormes lado a lado.
- **Causa raíz**: `src/components/ui/tabs.tsx` (wrapper de `@base-ui/react/tabs`,
  Unit 11) usaba variantes `data-horizontal:flex-col` / `group-data-horizontal/tabs:h-8`,
  que matchean un atributo `data-horizontal`; pero base-ui emite
  **`data-orientation="horizontal"`**. Sin variante custom (globals.css solo define
  `dark`), todas las reglas de orientación eran no-ops → el root no recibía
  `flex-col` ni la lista `h-8` → el panel del grid quedaba empujado fuera de vista.
- **Fix**: 12 variantes → `data-[orientation=horizontal]:` /
  `group-data-[orientation=…]/tabs:`. Se conservan `LOCAL_FALLBACK_AVATARS` +
  `onError` (defensa para tabla vacía / Storage caído; inocuos). Validado con
  re-screenshot (los 10 avatares visibles).
- **Nota dev**: el dev server corre en el **devcontainer** en `http://app:3000` (no
  `localhost:3000`); Chromium fuerza HTTPS sobre el host `app` (usar IP o un `next
  dev` propio en `localhost`). Para inspeccionar páginas con auth, probe público
  temporal — no resetear usuarios reales con la service-role key.

### 8.5 No se podía "cambiar" el avatar — solo seleccionarlo (faltaba refresh/revalidate)
- **Síntoma**: con los avatares ya visibles (§8.4), al hacer clic se marcaba el
  anillo de selección pero el avatar mostrado (preview superior + header) no
  cambiaba; parecía que no se aplicaba.
- **Causa**: la selección **sí persistía** (`set-avatar-from-default-set.ts` hace
  `prisma.profile.update`), pero (a) ninguna de las tres acciones de avatar
  (`default-set`/`upload`/`google`) llamaba `revalidatePath`, y (b)
  `AvatarSourceTabs` no hacía `router.refresh()` ni recibía `onAvatarChange` desde
  `settings/profile/page.tsx`. Como `getProfile()` no está cacheado pero el cliente
  nunca re-renderizaba los server components, el cambio no se reflejaba sin recargar.
- **Fix**: (1) `router.refresh()` tras un cambio exitoso en `AvatarSourceTabs`
  (helper `applied()`), que re-renderiza el preview y el `AppHeader`; (2)
  `revalidatePath("/settings/profile")` en las tres acciones de avatar. Test nuevo
  `avatar-source-tabs.test.tsx` (click → acción + `router.refresh()`; sin refresh en
  fallo). Se mockea `next/cache` en `set-avatar-from-upload.test.ts`.

### Verificación de las correcciones
- `tsc --noEmit` 0 errores; Biome limpio; **168/168 tests** (incluye
  `avatar-source-tabs.test.tsx`). Avatar grid validado visualmente con Playwright
  (10 avatares visibles).
