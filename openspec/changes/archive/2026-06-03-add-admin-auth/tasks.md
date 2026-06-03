## 1. Dependencias y entorno

- [x] 1.1 Instalar `@supabase/supabase-js` y `@supabase/ssr` con `pnpm add`
- [x] 1.2 Verificar que `.env` está en `.gitignore`; añadirlo si no (comprobar primero)
- [x] 1.3 Crear `.env` con placeholders para `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [x] 1.4 Crear `.env.example` en la raíz con las dos variables y comentarios

## 2. Clientes Supabase (src/lib/supabase)

- [x] 2.1 Crear `src/lib/supabase/server.ts` con `createServerClient` que usa `await cookies()` de `next/headers`, implementa `getAll` y `setAll` (escribiendo en el cookie store del server)
- [x] 2.2 Crear `src/lib/supabase/browser.ts` con `createBrowserClient` singleton lazy para Client Components
- [x] 2.3 Crear `src/lib/supabase/middleware.ts` con helper que crea el cliente para middleware, implementando `getAll` / `setAll` con escritura en `NextResponse` para propagar refresh
- [x] 2.4 Verificar que las tres factories lanzan error explícito si faltan las variables de entorno

## 3. Middleware de protección

- [x] 3.1 Crear `src/middleware.ts` que importa el helper de `src/lib/supabase/middleware.ts`
- [x] 3.2 Implementar lógica: crear cliente, `await supabase.auth.getUser()`, redirigir a `/admin/login?next=<pathname>` si no hay usuario, devolver `NextResponse.next({ request: { headers } })` si lo hay
- [x] 3.3 Exportar `config.matcher = ['/admin/:path*']` excluyendo explícitamente `/admin/login` y assets
- [x] 3.4 Comprobar que las cookies refreshed en `setAll` se propagan a la response

## 4. Server Action de login

- [x] 4.1 Crear `src/app/admin/login/actions.ts` con Server Action `signIn(prevState, formData)` que valida con Zod (email, password min 8)
- [x] 4.2 Implementar llamada a `supabase.auth.signInWithPassword({ email, password })` usando el cliente de `src/lib/supabase/server.ts`
- [x] 4.3 En éxito: `redirect(next || '/admin')` validando que `next` sea una ruta interna que empieza por `/` y no por `//`
- [x] 4.4 En error: devolver `{ error: string }` con mensaje genérico "Credenciales no válidas"

## 5. Página de login

- [x] 5.1 Crear `src/app/admin/login/page.tsx` como Server Component que llama `supabase.auth.getUser()` y `redirect()` si ya hay sesión
- [x] 5.2 Renderizar formulario con `Input` (email), `Input` (password, `type="password"`, `minLength=8`), `Label` y `Button` desde `src/components/ui` (shadcn ya instalado)
- [x] 5.3 Usar `useActionState` (React 19) o `useFormState` para conectar el formulario con la Server Action y mostrar errores
- [x] 5.4 Añadir estilos con tokens semánticos (`bg-card`, `text-foreground`, `border-input`); nunca colores literales
- [x] 5.5 Añadir `<Link>` a la home (`/`) en el header de la card para volver sin login

## 6. Página protegida /admin

- [x] 6.1 Crear `src/app/admin/page.tsx` como Server Component con placeholder que muestre "Bienvenido, {email}" usando `supabase.auth.getUser()` y el cliente server
- [x] 6.2 Asegurar que la página NO renderiza contenido si no hay sesión (defensa en profundidad, además del middleware)

## 7. Verificación

- [x] 7.1 `pnpm lint` — sin errores
- [x] 7.2 `pnpm build` — sin errores de TypeScript ni de Next
- [x] 7.3 `pnpm dev` y comprobación manual:
  - [x] 7.3.1 Ir a `/admin` sin sesión → redirige a `/admin/login?next=/admin`
  - [x] 7.3.2 Enviar credenciales válidas → redirige a `/admin` y muestra el email
  - [x] 7.3.3 Enviar credenciales inválidas → muestra error en el formulario, no redirige
  - [x] 7.3.4 Recargar `/admin` → sesión persiste, no pide login
  - [x] 7.3.5 Con sesión activa, ir a `/admin/login` → redirige a `/admin`
  - [x] 7.3.6 Inspeccionar cookies en DevTools → Supabase cookies con flag `HttpOnly`
  - [x] 7.3.7 `/` y `/admin/*` con sesión activa renderizan; `/public` y `/design-system` siguen siendo públicas con y sin sesión

## 8. Gateo de la home y reserva de /public

- [x] 8.1 Actualizar `src/middleware.ts`: añadir `'/'` al `config.matcher` para que la home también requiera sesión
- [x] 8.2 Crear `src/app/public/page.tsx` como placeholder público (sin auth) con un mensaje claro de que es la zona para no-admins
- [x] 8.3 Verificar con `pnpm lint` + `pnpm build` que no se rompe nada
- [x] 8.4 Verificar manualmente: `/` sin sesión redirige a `/admin/login?next=/`; `/public` sin sesión renderiza; `/design-system` sin sesión sigue renderizando
