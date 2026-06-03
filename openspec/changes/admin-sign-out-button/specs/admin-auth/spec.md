## ADDED Requirements

### Requirement: El admin puede cerrar sesión desde /admin
El sistema SHALL permitir al admin autenticado terminar su sesión desde un botón "Cerrar sesión" renderizado en la cabecera de `/admin`. El botón SHALL invocar la Server Action `signOut` (cubierta por la spec `admin-sign-out`) que invoca `supabase.auth.signOut()` y luego redirige a `/admin/login`. El sistema SHALL garantizar que la acción sólo es accesible desde rutas autenticadas: el middleware existente de `admin-auth` bloquea el acceso a `/admin` para visitantes sin sesión, por lo que el botón nunca llega a renderizarse en ese caso. Esta spec documenta la integración; los detalles de comportamiento del botón y la Server Action viven en la spec `admin-sign-out`.

#### Scenario: Admin cierra sesión desde /admin
- **WHEN** el admin autenticado hace clic en el botón "Cerrar sesión" en `/admin`
- **THEN** la sesión se termina (cookies httpOnly eliminadas) y el navegador termina en `/admin/login`

#### Scenario: Visitante no ve el botón
- **WHEN** un visitante sin sesión accede a `/admin`
- **THEN** el middleware lo redirige a `/admin/login` antes de que `/admin` se ejecute, por lo que el botón "Cerrar sesión" nunca se renderiza para ese visitante
