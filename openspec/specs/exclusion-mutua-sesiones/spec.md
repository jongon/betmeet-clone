## Purpose
Garantiza exclusión mutua entre sesiones de admin y de cambiador en un mismo navegador.

## Requirements

### Requirement: Sesión admin se cierra al crear o reanudar sesión de cambiador
El sistema SHALL verificar, durante la ejecución de `createCambioSessionAction`, si existe una sesión admin activa (Supabase Auth). Si existe, el sistema SHALL invocar `signOut` de Supabase para cerrar la sesión admin antes de crear o reanudar la sesión de cambiador. El cierre de admin SHALL ejecutarse después de validar token y nombre, y solo si la entrada al flujo de cambiador es válida (no en casos de error como token inválido, revocado o sesión cerrada).

#### Scenario: Admin logueado crea sesión de cambiador con nombre válido
- **WHEN** un admin con sesión Supabase activa envía el formulario de nombre en `/cambio/{token}` con nombre válido
- **THEN** el sistema cierra la sesión admin llamando a `supabase.auth.signOut()`, crea la sesión de cambiador y redirige al wizard de propuesta

#### Scenario: Admin logueado reanuda sesión de cambiador existente
- **WHEN** un admin con sesión Supabase activa reingresa a `/cambio/{token}` donde ya tiene una sesión abierta como cambiador
- **THEN** el sistema cierra la sesión admin y reanuda la sesión de cambiador existente

#### Scenario: Admin con QR inválido NO pierde su sesión
- **WHEN** un admin con sesión Supabase activa envía el formulario con un token inválido
- **THEN** el sistema retorna error de QR inválido y la sesión admin permanece activa

#### Scenario: Admin con QR revocado NO pierde su sesión
- **WHEN** un admin con sesión Supabase activa envía el formulario con un token revocado
- **THEN** el sistema retorna error de QR no disponible y la sesión admin permanece activa

#### Scenario: Admin con sesión cerrada previa NO pierde su sesión
- **WHEN** un admin con sesión Supabase activa envía el formulario en un token donde ya tiene una sesión cerrada
- **THEN** el sistema retorna error de sesión cerrada y la sesión admin permanece activa

### Requirement: Cookies de cambiador se limpian al iniciar sesión admin
El sistema SHALL limpiar, durante la ejecución de `signIn`, las cookies de identidad de cambiador (`cambiador_id` y todas las `cambio_session_*`) después de una autenticación Supabase exitosa y antes de redirigir al dashboard. La limpieza SHALL usar `maxAge: 0` y `path: "/"` para eliminar las cookies del navegador.

#### Scenario: Cambiador activo inicia sesión como admin
- **WHEN** un usuario con cookies `cambiador_id` y `cambio_session_{token}` activas se autentica exitosamente como admin
- **THEN** el sistema elimina `cambiador_id` y todas las cookies `cambio_session_*` antes de redirigir a `/admin`

#### Scenario: Login admin fallido NO limpia cookies de cambiador
- **WHEN** un usuario con cookies de cambiador activas intenta login admin con credenciales incorrectas
- **THEN** el sistema retorna error de credenciales y las cookies de cambiador permanecen intactas

#### Scenario: Login admin exitoso sin cookies de cambiador previas
- **WHEN** un usuario sin cookies de cambiador se autentica exitosamente como admin
- **THEN** el sistema redirige a `/admin` sin errores (la iteración de cookies no encuentra nada que limpiar)
