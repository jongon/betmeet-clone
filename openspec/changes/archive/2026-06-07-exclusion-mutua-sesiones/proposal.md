## Why

Actualmente un mismo navegador puede tener simultáneamente una sesión de admin (coleccionista, vía Supabase Auth) y una sesión de cambiador (vía cookies `cambiador_id` + `cambio_session_*`). Los dos sistemas de identidad no se conocen, lo que produce un estado confuso: el usuario puede ver el dashboard de admin en una pestaña y el wizard de propuesta en otra, sin que el sistema refleje que cambió de rol.

## What Changes

- Al crear o reanudar una sesión de cambiador desde `createCambioSessionAction`, el sistema cierra automáticamente cualquier sesión admin activa (`signOut` de Supabase) antes de continuar.
- Al iniciar sesión como admin desde `signIn`, el sistema limpia automáticamente las cookies de identidad de cambiador (`cambiador_id` y `cambio_session_*`).

## Capabilities

### New Capabilities

- `exclusion-mutua-sesiones`: El sistema garantiza que un mismo navegador solo puede tener activa una sesión de admin o una sesión de cambiador, nunca ambas simultáneamente. La transición de un rol al otro cierra automáticamente la sesión del rol anterior.

### Modified Capabilities

- `admin-sign-out`: La operación de cierre de sesión admin (`signOut`) ahora también puede ser invocada implícitamente desde el flujo de cambiador, no solo desde el botón explícito en `/admin`.
- `cambiador-cambio`: La creación de sesión de cambiador ahora verifica y cierra sesiones admin activas antes de proceder.

## Impact

- `src/app/cambio/[token]/actions.ts` — `createCambioSessionAction`: agrega verificación de sesión admin y llamada a `signOut` antes de crear/reanudar sesión de cambiador.
- `src/app/admin/login/actions.ts` — `signIn`: agrega limpieza de cookies de cambiador tras login exitoso.
- `src/lib/supabase/server.ts` — `createSupabaseServerClient`: ya expuesto, se importa en el módulo de cambio.
- `src/lib/cambiador-identity.ts` — `CAMBIADOR_COOKIE`: ya exportado, se importa en el módulo de login.
