## MODIFIED Requirements

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
