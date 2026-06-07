# admin-sign-out Specification

## Purpose
TBD - created by archiving change admin-sign-out-button. Update Purpose after archive.
## Requirements
### Requirement: Server Action signOut cierra la sesión
El sistema SHALL exponer una Server Action `signOut()` (en `src/app/admin/auth-actions.ts` con `'use server'`) que invoca `supabase.auth.signOut()` mediante el cliente Supabase SSR (mismo `createSupabaseServerClient` ya usado en el resto del flujo de admin) y SHALL llamar a `redirect("/admin/login")` una vez la llamada retorna sin error. Si `signOut()` retorna error, el sistema SHALL propagar el error sin redirigir (el botón mostrará estado de error al cliente). La Server Action `signOut` SHALL también ser invocable desde otros Server Actions (como `createCambioSessionAction`) sin el redirect, usando directamente `supabase.auth.signOut()` sobre una instancia de `createSupabaseServerClient`.

#### Scenario: Admin cierra sesión correctamente
- **WHEN** el admin autenticado invoca la Server Action `signOut` desde la UI de `/admin`
- **THEN** el sistema elimina las cookies httpOnly de Supabase vía `setAll`, llama a `redirect("/admin/login")`, y el navegador termina en `/admin/login` con la sesión cerrada

#### Scenario: signOut retorna error
- **WHEN** el admin invoca la Server Action `signOut` y Supabase retorna un error
- **THEN** el sistema no redirige y la Server Action propaga el error al cliente (useTransition vuelve a idle sin navegar)

#### Scenario: signOut invocado desde flujo de cambiador
- **WHEN** `createCambioSessionAction` detecta una sesión admin activa y llama a `supabase.auth.signOut()` sin redirect
- **THEN** las cookies de Supabase se eliminan y el flujo de cambiador continúa creando la sesión sin navegar a `/admin/login`

### Requirement: Botón de cerrar sesión visible en /admin
El sistema SHALL renderizar en la cabecera de `/admin` un botón con la etiqueta "Cerrar sesión" y el icono `LogOut` de `lucide-react`, posicionado en la esquina superior derecha de la cabecera (mismo row flex que el título "Sesiones de cambio"). El botón SHALL ser un `Button` de shadcn con `variant="outline"` y SHALL invocar la Server Action `signOut` al hacer clic. Mientras la Server Action está en curso, el botón SHALL estar deshabilitado y su etiqueta SHALL cambiar a "Cerrando…".

#### Scenario: Admin ve el botón en estado normal
- **WHEN** el admin autenticado navega a `/admin`
- **THEN** la cabecera muestra el título a la izquierda y el botón "Cerrar sesión" con icono a la derecha

#### Scenario: Click en el botón dispara el signOut
- **WHEN** el admin hace clic en el botón "Cerrar sesión"
- **THEN** el botón se deshabilita, su etiqueta cambia a "Cerrando…", la Server Action `signOut` se invoca, y al completarse el navegador navega a `/admin/login`

#### Scenario: Botón en estado pendiente
- **WHEN** la Server Action está en curso tras un clic
- **THEN** el botón está deshabilitado (no se puede hacer clic de nuevo) y muestra "Cerrando…"

### Requirement: Visitante no autenticado no ve el botón
El sistema SHALL no renderizar el botón "Cerrar sesión" para visitantes sin sesión, ya que el middleware de `admin-auth` los redirige a `/admin/login` antes de que `/admin` se ejecute. El botón SHALL ser accesible únicamente desde rutas autenticadas.

#### Scenario: Visitante sin sesión intenta acceder a /admin
- **WHEN** un visitante sin cookies de sesión navega a `/admin`
- **THEN** el middleware lo redirige a `/admin/login` y el botón "Cerrar sesión" nunca se renderiza para ese visitante

