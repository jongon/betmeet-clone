## Context

`/admin` será el panel privado del coleccionista y la home `/` será el landing autenticado del admin. La ruta `/public/*` se reserva para contenido accesible a usuarios no-admin (cambiadores que escanean un QR, vistas compartidas, etc.). Necesitamos un mecanismo de autenticación SSR-compatible (cookies httpOnly) que proteja la home y `/admin/*` sin sacrificar la simplicidad del App Router, y que deje explícitamente pública la zona `/public`.

La plataforma ya adopta Supabase como proveedor de Auth (definido en `docs/STACK.md`), pero ninguna dependencia de Supabase está instalada aún. La estrategia es sentar las bases de auth con un único usuario admin — creado manualmente en Supabase Studio — y dejar preparada la integración para que futuros changes (álbum, QR, RLS, contenido público) consuman la misma sesión.

Restricciones del stack:

- **Next.js 16 App Router** — usar `src/middleware.ts` con `matcher`. `cookies()` de `next/headers` es **async** en Next 15+; debe esperarse con `await`.
- **SSR cookies** — `@supabase/ssr` es el helper oficial; requiere patrón `getAll` / `setAll` por request.
- **Server Actions** para mutaciones (login); `signInWithPassword` contra `auth.users`.
- **No signup** — el usuario se crea en Supabase Studio; el formulario sólo autentica.
- **Sin Prisma en este change** — la sesión la gestiona Supabase; no introducimos modelo `User` propio.

## Goals / Non-Goals

**Goals:**

- Autenticación email/password con Supabase Auth en `/admin`.
- Middleware que bloquee la home `/` y `/admin/*` y redirija a `/admin/login?next=…`.
- Persistencia de sesión vía cookies httpOnly (SSR-compatibles, refresco automático por middleware).
- Login page accesible (form shadcn/ui con tokens semánticos) y robusta a credenciales inválidas.
- Reservar `/public/*` como namespace explícitamente público (sin auth) para contenido destinado a no-admins.
- Logout preparado (botón + Server Action) — explícitamente NO lo construimos, pero la sesión se gestiona de forma que añadirlo es trivial en un futuro change.

**Non-Goals:**

- Signup público, OAuth, magic links, 2FA, password reset.
- RLS en Postgres (será un change aparte; en este, sin RLS, el anon key sólo se usa para `auth`).
- Logout UI/Action.
- Contenido real bajo `/public/*` más allá de un placeholder. Las vistas de cambio (`/cambio/[token]` u `/public/cambio/[token]`) se cubren en futuros changes.
- `/design-system` es dev-only y sigue siendo público.
- Gestión del álbum, generación de QR, multi-usuario.

## Decisions

### D1. `@supabase/ssr` como helper de cookies (no `@supabase/auth-helpers-nextjs`)

- **Por qué**: `@supabase/auth-helpers-nextjs` está deprecado. `@supabase/ssr` es el helper oficial actual y soporta correctamente el patrón de cookies de App Router. `docs/STACK.md` reserva Supabase Auth.
- **Alternativas consideradas**: usar `@supabase/supabase-js` directamente — viable, pero pierdes el manejo automático de `setAll` por request, lo que rompe el refresh de tokens en SSR.

### D2. Middleware como gate único de protección

- **Por qué**: ejecuta antes del render, evita parpadeos (no se monta la página protegida si no hay sesión) y mantiene `getUser()` validado contra el servidor de Auth (no fiarse de la cookie cruda).
- **Matcher**: `['/', '/admin/:path*']` — incluye la home y todo `/admin/*`; excluye por construcción `/public/*`, `/design-system` y assets (no aparecen en el matcher).
- **Skip explícito dentro del middleware**: `/admin/login` (debe ser accesible sin sesión para mostrar el formulario).
- **Flujo**:
  1. Si `pathname === '/admin/login'`, devolver `NextResponse.next(...)` sin tocar Supabase.
  2. Crear `supabase` server client con `getAll` / `setAll` (escribiendo en `response` para que el refresh propague a la respuesta).
  3. `await supabase.auth.getUser()` — si falla o devuelve `null`, `NextResponse.redirect('/admin/login?next=…')`.
  4. Si hay usuario, `NextResponse.next({ request: { headers } })` para propagar cookies leídas.
- **Alternativa**: hacer el check dentro de cada `page.tsx` protegido con `redirect()`. Descartada — peor DX, más boilerplate, posible flash de contenido.

### D3. Server Action para `signInWithPassword`

- **Por qué**: las convenciones del repo (`docs/AGENTS.md`) prefieren Server Actions para lógica de servidor; `signInWithPassword` necesita ejecutarse en el server para escribir cookies httpOnly vía `setAll`.
- **Implementación**: archivo `src/app/admin/login/actions.ts` exporta `signIn(formData)` que llama `supabase.auth.signInWithPassword({ email, password })`. En éxito, `redirect(next || '/admin')`. En error, devuelve `{ error: string }` al cliente para mostrar feedback con `sonner` o `<p role="alert">`.
- **Validación**: Zod con `email` + `password` (min 8). Validación redundante con HTML5 (`type="email"`, `required`, `minLength`) — la Zod es la fuente de verdad.
- **Alternativa**: Route Handler `POST /api/auth/sign-in`. Descartada — más archivos, menos cohesión con la page, y la convención del repo favorece Server Actions.

### D4. Cliente `supabase` por contexto (server / browser / middleware)

- **Por qué**: cada entorno tiene una API distinta de cookies/headers. `@supabase/ssr` ofrece `createServerClient` y `createBrowserClient` separados.
- **Estructura**:
  - `src/lib/supabase/server.ts` — `createServerClient` con `cookies()` de `next/headers`. Usado en Server Actions y Server Components. Implementa `setAll` para que el refresh persista.
  - `src/lib/supabase/browser.ts` — `createBrowserClient` singleton lazy. Usado en Client Components (futuro).
  - `src/lib/supabase/middleware.ts` — helper que crea el cliente para `middleware.ts` y aplica el patrón de refresh-on-every-request.
- **Alternativa**: un único cliente compartido. Descartada — `cookies()` no funciona igual en middleware que en server components; compartir provocaría errores sutiles.

### D5. `.env` en raíz (no `.env.local`, no `devcontainer.json`)

- **Por qué**: el devcontainer ya inyecta variables vía `.env` (acordado con el usuario). `.env` debe estar en `.gitignore` y contener placeholders con la URL/anon key reales sólo en local.
- **Variables**:
  - `NEXT_PUBLIC_SUPABASE_URL` — pública, se usa en cliente y server.
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — pública (anon key es segura de exponer; RLS limitará el acceso real, futuro change).
- **Alternativa**: variables de entorno del devcontainer. Descartada — la app debe poder correr en Vercel/CI sin devcontainer; las vars deben vivir con el proyecto.

### D6. `getUser()` (no `getSession()`) en middleware

- **Por qué**: `getUser()` valida el JWT contra el servidor de Auth. `getSession()` lee la cookie sin validar — susceptible a tokens manipulados. Para gating de rutas, queremos la versión verificada.
- **Costo**: 1 request extra a Supabase por request a `/admin/*`. Aceptable: Supabase está en la misma región y la llamada es barata. Además, la propia llamada refresca el token si está a punto de expirar (gracias al patrón `setAll`).

### D7. Rutas planas, sin grupo `(admin)`

- **Por qué**: sólo hay `/admin`, `/admin/login` y el placeholder `/public`. Un route group añade complejidad sin beneficio. Si más adelante hay `/admin/album`, `/admin/qr`, `/public/cambio/[token]`, etc., entonces refactorizar a `(admin)/album/page.tsx` con `layout.tsx` compartido.
- **Estructura final**:
  ```
  src/app/
    page.tsx                (home del admin — protegida)
    admin/
      page.tsx              (placeholder protegido)
      login/
        page.tsx
        actions.ts
    public/
      page.tsx              (placeholder público)
  ```

### D8. Componentes UI desde shadcn/ui ya instalados

- **Por qué**: `Input`, `Label`, `Button` ya están en `src/components/ui`. Reutilizamos.
- **Nuevo componente shadcn**: `card` ya está. `sonner` (toast) ya está — lo usaremos para feedback de login.

## Risks / Trade-offs

- **[Anon key expuesta]** — Por diseño en Supabase. Mitigación: futuro change de RLS limitará qué datos puede leer/escribir el rol `anon`. En este change, sólo se usa para `auth.signInWithPassword` y `auth.getUser`, que son seguros con anon key.
- **[Latencia añadida por `getUser()` en middleware]** — 1 request a Supabase por hit a `/admin/*`. Mitigación: aceptable para tráfico del admin (un único usuario). Si se vuelve problema, futuro change puede cachear la verificación en una cookie firmada.
- **[Sin rate limiting de aplicación]** — Dependemos del rate limit por IP que aplica Supabase por defecto. Suficiente para un único usuario; si hubiera riesgo de fuerza bruta, futuro change puede añadir un middleware previo.
- **`[cookies()]` async** —容易出错 al olvidar el `await`. Mitigación: los tres clientes (`server.ts`, `browser.ts`, `middleware.ts`) encapsulan el patrón; las páginas no tocan `cookies()` directamente.
- **[Refresh de token en Server Components]** — En Next 16, los Server Components no pueden escribir cookies. Mitigación: el middleware corre en cada request a `/admin/*` y refresca el token vía `setAll` antes del render.
- **[Logout no incluido]** — Funcionalidad pedida sólo "iniciar sesión". El usuario puede cerrar sesión desde Supabase Studio invalidando la sesión, o un futuro change añadirá el botón.

## Migration Plan

No hay datos que migrar — es greenfield. Despliegue:

1. Crear el proyecto en Supabase (cloud o local con el stack dockerizado del repo).
2. Crear el usuario admin en Supabase Studio → Authentication → Users → Add user (email + password, **sin** "Auto Confirm User" si se quiere confirmar manualmente, o con "Auto Confirm" para simplificar).
3. Copiar `Project URL` y `anon key` de Supabase → pegar en `.env`.
4. `pnpm dev` → ir a `/` o `/admin` sin sesión → comprobar redirect a `/admin/login?next=…` → login con el admin → comprobar acceso a `/` y `/admin`. Visitar `/public` sin sesión → comprobar que renderiza sin pedir login.
5. Rollback: borrar `src/middleware.ts`, `src/app/admin/**`, `src/app/public/**`, `src/lib/supabase/**`, `src/.env`. Sin impacto en DB (no hemos creado tablas).

## Open Questions

_Ninguna pendiente al cierre de este design. Si surgen durante implementación, se documentan en el PR._
