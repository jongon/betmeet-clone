## MODIFIED Requirements

### Requirement: Middleware protege rutas autenticadas
El sistema SHALL proteger la home `/` y todas las rutas bajo `/admin/*` mediante `src/middleware.ts` con `matcher: ['/', '/admin/:path*']`. El middleware MUST crear un cliente Supabase SSR con patrón `getAll` / `setAll` (escribiendo en la respuesta para propagar el refresh de token) y llamar `supabase.auth.getUser()` en cada request. Si la llamada falla o devuelve `null`, el sistema MUST redirigir a `/admin/login?next=<pathname>` preservando la ruta original. Si devuelve un usuario válido, el sistema MUST permitir el paso normal de la request. Las rutas bajo `/public/*` y `/design-system` MUST NO incluirse en el `matcher`, por lo que el middleware no se ejecuta para ellas. La ruta `/admin/login` MUST excluirse explícitamente dentro de la función de middleware para que sea accesible sin sesión.

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
