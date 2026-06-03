## Why

`/admin` es el panel privado del coleccionista (gestión del álbum, generación de QR, configuración de cuenta) y debe estar protegido. Sin autenticación, cualquiera con la URL podría ver y manipular los datos del coleccionista. Este change sienta las bases de auth: un único usuario admin creado manualmente en Supabase inicia sesión con email y contraseña para acceder a `/admin`.

## What Changes

- Añade autenticación por email y contraseña en `/admin` usando **Supabase Auth** + **`@supabase/ssr`** (cookies SSR-compatibles).
- Crea la ruta `/admin/login` con formulario shadcn/ui y Server Action `signIn` que invoca `signInWithPassword`.
- Crea `src/middleware.ts` que protege `/admin/*`: redirige a `/admin/login?next=…` si no hay sesión; deja pasar si la hay.
- Si el usuario ya está autenticado y entra a `/admin/login`, se redirige a `next` (o `/admin`).
- Añade un placeholder protegido en `/admin` (contenido real vendrá en futuros changes — QR, álbum, etc.).
- Añade variables de entorno en `.env` (raíz del proyecto): `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Capabilities

### New Capabilities
- `admin-auth`: autenticación email/password para el único usuario admin, gating por middleware, redirecciones y persistencia de sesión vía cookies SSR.

### Modified Capabilities
_Ninguna._

## Impact

- **Dependencias nuevas**: `@supabase/supabase-js`, `@supabase/ssr`.
- **Archivos nuevos**:
  - `src/lib/supabase/server.ts`, `src/lib/supabase/browser.ts`, `src/lib/supabase/middleware.ts`
  - `src/middleware.ts`
  - `src/app/admin/login/page.tsx`
  - `src/app/admin/login/actions.ts` (Server Action)
  - `src/app/admin/page.tsx` (placeholder)
- **Archivos modificados**:
  - `.env` — nuevas variables de Supabase (valores reales fuera del repo; `.env` queda en `.gitignore`).
  - `.gitignore` — asegurar que `.env` está ignorado (verificar; sin cambios si ya lo está).
- **Sin cambios** en Prisma, design system, rutas públicas (`/`, `/design-system`, futura `/cambio/[token]`).
- **Out of scope** (futuros changes): QR, gestión del álbum, RLS en Postgres, signup, password reset, logout, OAuth, 2FA.
