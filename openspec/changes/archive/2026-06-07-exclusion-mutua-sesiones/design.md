## Context

La app maneja dos sistemas de identidad completamente independientes en el mismo navegador:

- **Admin**: sesión via Supabase Auth (cookies `sb-<ref>-auth-token`, `sb-<ref>-refresh-token`), gestionada por `@supabase/ssr`.
- **Cambiador**: identidad via cookies httpOnly (`cambiador_id`, `cambio_session_<token>`), gestionada manualmente en `src/lib/cambiador-identity.ts`.

Ambos sistemas coexisten sin conciencia mutua. Un mismo navegador puede tener cookies de ambos tipos simultáneamente, lo que produce un estado indefinido sobre qué rol está activo.

Las rutas están protegidas por middleware (`src/proxy.ts` con matcher `["/", "/admin/:path*"]`) que solo verifica sesión admin. La ruta `/cambio/[token]` es pública y no pasa por el middleware.

## Goals / Non-Goals

**Goals:**
- Garantizar que un navegador tenga activa solo una sesión de admin O una de cambiador, nunca ambas.
- La transición admin → cambiador cierra automáticamente la sesión admin.
- La transición cambiador → admin limpia automáticamente las cookies de cambiador.

**Non-Goals:**
- No se modifican los datos de sesiones en `sessions.json` (las sesiones de cambiador no se cierran en el repositorio, solo se desasocian del navegador).
- No se agregan confirmaciones ni diálogos (la transición es silenciosa).
- No se modifica el middleware (`src/proxy.ts`).
- No se agrega protección a nivel de page component.

## Decisions

### Decisión 1: Interceptar en Server Actions, no en middleware ni page components

**Alternativas consideradas:**
- **Middleware (`proxy.ts`)**: Habría que agregar `/cambio/:path*` al matcher y borrar cookies manualmente. Problema: `signOut()` de Supabase no es invocable desde middleware (necesita `cookies()` de `next/headers`). Solo se podrían borrar cookies manualmente, sin invalidar el refresh token en Supabase.
- **Page components**: Cada página que quiera protegerse duplicaría el chequeo. Frágil si se agregan nuevas rutas.

**Elección**: Interceptar en las Server Actions de "commit" — `createCambioSessionAction` y `signIn`. Son los puntos donde el usuario explícitamente toma el otro rol. Las validaciones que fallan (QR inválido, credenciales incorrectas) no disparan el cierre.

### Decisión 2: Posición del signOut en createCambioSessionAction

El `signOut` del admin se ejecuta después de validar token y nombre, pero antes del fork resume/create. Esto asegura que:
- Errores de validación (token inválido, revocado, sesión cerrada) no cierran la sesión admin.
- Tanto el camino de "resume" como el de "create" cierran la sesión admin.

### Decisión 3: Limpieza de cookies de cambiador por nombre y prefijo

En `signIn`, se itera `cookieStore.getAll()` y se eliminan las que matchean `cambiador_id` (por nombre exacto, usando la constante exportada) o el prefijo `cambio_session_` (por startsWith). Esto cubre cualquier token de QR pasado.

No se usa una lista hardcodeada de tokens porque el admin pudo haber escaneado múltiples QRs en el pasado.

### Decisión 4: No se toca sessions.json

Las sesiones de cambiador en `data/sessions.json` no se modifican durante la limpieza. Solo se borran las cookies del navegador. La sesión sigue existiendo en datos para el coleccionista dueño del QR, que puede verla en su dashboard. Si el usuario vuelve a escanear el mismo QR, se genera un nuevo `cambiador_id` y no se reanuda la sesión anterior (porque la cookie de asociación `cambio_session_<token>` ya no existe).

## Risks / Trade-offs

- **Riesgo**: Si `supabase.auth.signOut()` falla dentro de `createCambioSessionAction`, la sesión de cambiador se crea igual pero la admin puede seguir activa.
  - **Mitigación**: El `signOut` se llama con `await` y si falla, el error se propaga como excepción no capturada. El formulario mostrará error y no se creará la sesión. En la práctica, `signOut` rara vez falla porque es una operación local (borrar cookies + llamada API a Supabase).

- **Riesgo**: Si el admin tenía checked "Recordar sesión" (cookie persistente 30 días), el `signOut` igual la elimina. Esto es el comportamiento deseado.

- **Riesgo**: La limpieza de cookies en `signIn` usa `cookies()` después de que Supabase ya modificó cookies. En Next.js 15 esto funciona correctamente porque cada llamada a `cookies()` opera sobre el mismo request subyacente.
