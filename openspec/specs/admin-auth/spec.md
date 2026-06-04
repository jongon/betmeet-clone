## Purpose

Authentication and session lifecycle for the admin (coleccionista) area: email/password login via Supabase SSR, httpOnly cookie session, route protection via middleware, and explicit public routes for the future cambiador-facing flow.
## Requirements
### Requirement: Login con email y contraseña
El sistema SHALL permitir al usuario admin iniciar sesión en `/admin/login` mediante un formulario con email y contraseña, implementado como Server Action que invoca `supabase.auth.signInWithPassword` con las credenciales del formulario. La validación de los campos MUST ocurrir en el servidor con Zod (email válido, password de al menos 8 caracteres), además de la validación HTML5 nativa. El sistema MUST rechazar el envío si las credenciales no validan contra `auth.users` y devolver un mensaje de error genérico al formulario sin filtrar si el email existe.

#### Scenario: Login exitoso
- **WHEN** el usuario envía el formulario con email y contraseña válidos registrados en Supabase
- **THEN** el sistema escribe las cookies de sesión httpOnly vía `setAll` y redirige a `next` si está presente y es una ruta interna, o a `/admin` en caso contrario

#### Scenario: Credenciales inválidas
- **WHEN** el usuario envía el formulario con email o contraseña incorrectos
- **THEN** el sistema no crea sesión, no redirige, y devuelve un mensaje de error genérico visible en el formulario (por ejemplo "Credenciales no válidas")

#### Scenario: Email con formato inválido
- **WHEN** el usuario envía el formulario con un email que no pasa la validación Zod
- **THEN** el sistema no invoca Supabase y devuelve un error de validación de campo

#### Scenario: Password demasiado corto
- **WHEN** el usuario envía el formulario con una contraseña de menos de 8 caracteres
- **THEN** el sistema no invoca Supabase y devuelve un error de validación de campo

### Requirement: Proxy protege rutas autenticadas
El sistema SHALL proteger la home `/` y todas las rutas bajo `/admin/*` mediante `src/proxy.ts` con `matcher: ['/', '/admin/:path*']`. El proxy MUST crear un cliente Supabase SSR con patrón `getAll` / `setAll` (escribiendo en la respuesta para propagar el refresh de token) y llamar `supabase.auth.getUser()` en cada request. Si la llamada falla o devuelve `null`, el sistema MUST redirigir a `/admin/login?next=<pathname>` preservando la ruta original. Si devuelve un usuario válido, el sistema MUST permitir el paso normal de la request. Las rutas bajo `/public/*` y `/design-system` MUST NO incluirse en el `matcher`, por lo que el proxy no se ejecuta para ellas. La ruta `/admin/login` MUST excluirse explícitamente dentro de la función `proxy` para que sea accesible sin sesión.

#### Scenario: Visitante sin sesión intenta acceder a /admin
- **WHEN** un visitante sin cookies de sesión navega a `/admin/album` (o cualquier ruta bajo `/admin/*`)
- **THEN** el middleware lo redirige a `/admin/login?next=/admin/album`

#### Scenario: Visitante sin sesión intenta acceder a /admin/cromos
- **WHEN** un visitante sin cookies de sesión navega a `/admin/cromos`
- **THEN** el middleware lo redirige a `/admin/login?next=/admin/cromos`

#### Scenario: Visitante sin sesión intenta acceder a la home
- **WHEN** un visitante sin cookies de sesión navega a `/`
- **THEN** el middleware lo redirige a `/admin/login?next=/`

#### Scenario: Admin autenticado accede a /admin
- **WHEN** el admin con sesión activa navega a `/admin`
- **THEN** la request continúa normalmente y la página protegida se renderiza

#### Scenario: Admin autenticado accede a /admin/cromos
- **WHEN** el admin con sesión activa navega a `/admin/cromos`
- **THEN** la request continúa normalmente y la página protegida se renderiza

#### Scenario: Admin autenticado accede a la home
- **WHEN** el admin con sesión activa navega a `/`
- **THEN** la request continúa normalmente y la home se renderiza

#### Scenario: Token expirado
- **WHEN** el admin navega a `/admin/*` o a `/` con un access token expirado pero refresh token válido
- **THEN** el middleware refresca el token mediante `setAll`, escribe la nueva cookie en la respuesta, y la request continúa sin redirigir a login

#### Scenario: Cookie manipulada
- **WHEN** un visitante manipula la cookie de sesión con un JWT inválido
- **THEN** `supabase.auth.getUser()` falla, el middleware lo trata como no autenticado y redirige a `/admin/login`

### Requirement: Redirección de usuario ya autenticado desde /admin/login
El sistema SHALL redirigir a los usuarios ya autenticados que intenten acceder a `/admin/login` a la ruta `next` (si es una ruta interna válida) o a `/admin` por defecto. Esta redirección MUST ocurrir en el Server Component de `/admin/login` antes de renderizar el formulario, llamando `supabase.auth.getUser()` y usando `redirect()` de `next/navigation` si hay sesión.

#### Scenario: Admin ya autenticado entra a /admin/login
- **WHEN** el admin con sesión activa navega a `/admin/login`
- **THEN** el sistema lo redirige a `/admin` sin mostrar el formulario

#### Scenario: Admin autenticado con ?next=/admin/album entra a /admin/login
- **WHEN** el admin con sesión activa navega a `/admin/login?next=/admin/album`
- **THEN** el sistema lo redirige a `/admin/album`

#### Scenario: Visitante no autenticado entra a /admin/login
- **WHEN** un visitante sin sesión navega a `/admin/login`
- **THEN** el sistema renderiza el formulario de login sin redirigir

### Requirement: Persistencia de sesión por cookies SSR-compatibles
El sistema SHALL persistir la sesión del admin mediante cookies httpOnly gestionadas por `@supabase/ssr`, con el patrón de refresh-on-every-request. El cliente Supabase server MUST implementar `getAll` (lee cookies de la request) y `setAll` (escribe cookies en la response). El cliente del middleware MUST propagar las cookies de la request al `NextResponse.next({ request: { headers } })` para que las Server Components y Server Actions que se ejecutan después vean la sesión actualizada. El sistema MUST NO depender de localStorage ni de cookies accesibles desde JavaScript del cliente para mantener la sesión.

#### Scenario: Sesión sobrevive a recargas
- **WHEN** el admin recarga cualquier página bajo `/admin/*`
- **THEN** la sesión persiste y la página se renderiza sin pedir login de nuevo

#### Scenario: Sesión cierra en el servidor
- **WHEN** el admin cierra sesión (futuro botón, fuera de alcance de este change) o la sesión expira
- **THEN** las cookies se invalidan y el siguiente acceso a `/admin/*` redirige a `/admin/login`

#### Scenario: Cookies no accesibles desde JavaScript
- **WHEN** se inspeccionan las cookies de sesión desde el DevTools del navegador
- **THEN** las cookies de Supabase aparecen con flag `HttpOnly`, no siendo legibles desde `document.cookie`

### Requirement: Variables de entorno de Supabase desde .env
El sistema SHALL leer las credenciales de Supabase desde el archivo `.env` en la raíz del proyecto. Las variables MUST llamarse `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`. El cliente Supabase MUST leerlas mediante `process.env` y lanzar un error explícito en build/runtime si faltan. El archivo `.env` MUST estar en `.gitignore`; el repositorio SHALL contener sólo `.env.example` (o `.env.example` añadido en este change) con placeholders.

#### Scenario: Build con variables presentes
- **WHEN** el proyecto se construye con `.env` presente y ambas variables definidas
- **THEN** el build termina sin errores y los clientes Supabase se instancian correctamente

#### Scenario: Faltan variables
- **WHEN** la aplicación intenta instanciar un cliente Supabase sin `NEXT_PUBLIC_SUPABASE_URL` o `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **THEN** el cliente lanza un error explícito indicando qué variable falta

### Requirement: Rutas /public/* son explícitamente públicas
El sistema SHALL reservar la ruta `/public/*` para contenido accesible sin autenticación, destinado a usuarios no-admin (por ejemplo, los cambiadores que escanean un QR). Las rutas bajo `/public/*` MUST NO incluirse en el `matcher` del middleware, MUST NO redirigir a `/admin/login` y MUST renderizarse tanto para visitantes no autenticados como para el admin autenticado. El sistema SHALL crear `src/app/public/page.tsx` como placeholder inicial; el contenido definitivo (p. ej. `/public/cambio/[token]`) se cubrirá en futuros changes.

#### Scenario: Visitante no autenticado accede a /public
- **WHEN** un visitante sin sesión navega a `/public` o cualquier subruta `/public/*`
- **THEN** el middleware no se ejecuta, no hay redirect, y la página se renderiza

#### Scenario: Admin autenticado accede a /public
- **WHEN** el admin con sesión activa navega a `/public`
- **THEN** la página se renderiza normalmente sin pedir login

#### Scenario: /public no entra en el matcher del proxy
- **WHEN** se inspecciona `config.matcher` en `src/proxy.ts`
- **THEN** ninguna ruta que comience por `/public/` está incluida

### Requirement: El admin puede cerrar sesión desde /admin
El sistema SHALL permitir al admin autenticado terminar su sesión desde un botón "Cerrar sesión" renderizado en la cabecera de `/admin`. El botón SHALL invocar la Server Action `signOut` (cubierta por la spec `admin-sign-out`) que invoca `supabase.auth.signOut()` y luego redirige a `/admin/login`. El sistema SHALL garantizar que la acción sólo es accesible desde rutas autenticadas: el middleware existente de `admin-auth` bloquea el acceso a `/admin` para visitantes sin sesión, por lo que el botón nunca llega a renderizarse en ese caso. Esta spec documenta la integración; los detalles de comportamiento del botón y la Server Action viven en la spec `admin-sign-out`.

#### Scenario: Admin cierra sesión desde /admin
- **WHEN** el admin autenticado hace clic en el botón "Cerrar sesión" en `/admin`
- **THEN** la sesión se termina (cookies httpOnly eliminadas) y el navegador termina en `/admin/login`

#### Scenario: Visitante no ve el botón
- **WHEN** un visitante sin sesión accede a `/admin`
- **THEN** el middleware lo redirige a `/admin/login` antes de que `/admin` se ejecute, por lo que el botón "Cerrar sesión" nunca se renderiza para ese visitante
