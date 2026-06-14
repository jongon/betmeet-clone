# Unit 12 — Refine de Auth, Perfil, Onboarding y Landing · Functional Design

> Refine post-construcción. **No reinicia** Units 1, 2, 8, 9 ni 11; refina flujos
> existentes. Cubre FR-REFINE-12.1 … 12.8 y la Épica 11 (US-11.1 … US-11.7).
> Documentación en español (convención AGENTS.md).

## 1. Alcance y trazabilidad

| Historia | FR-REFINE | Resultado |
|----------|-----------|-----------|
| US-11.1 | 12.1 / 12.2 | Reenvío de confirmación desde login no confirmado + cooldown |
| US-11.2 | 12.3 | Cambio de email de cuenta no confirmada (admin-only, server-side) |
| US-11.3 | 12.4 | Cambio de email confirmado desde Perfil |
| US-11.4 | 12.5 | Cambio de nickname desde Perfil con rate-limit |
| US-11.5 | 12.6 | Avatares por defecto resilientes (fallback local) |
| US-11.6 | 12.7 | Onboarding gana sobre destino original |
| US-11.7 | 12.8 | Landing con header de auth |

## 2. Decisiones de diseño por historia

### US-11.1 — Reenvío de confirmación desde login no confirmado
- **Detección**: `signIn()` hoy devuelve un error genérico. Se distinguirá el caso
  "email no confirmado" inspeccionando el error de Supabase (`error.code ===
  "email_not_confirmed"` / mensaje equivalente) y se devolverá un estado
  `{ unconfirmedEmail: <email> }` en vez de `_form: ["Invalid…"]`.
- **UI**: `SignInForm` muestra, ante `unconfirmedEmail`, un panel con dos acciones:
  "Reenviar confirmación" y "Cambiar correo" (abre el flujo de US-11.2).
- **Acción nueva**: `resendConfirmation(formData)` → `supabase.auth.resend({ type:
  "signup", email })`. Mensaje de éxito genérico (no revela existencia de cuenta).
- **No enumeración**: el panel solo aparece tras un intento de login con
  credenciales válidas que falla por confirmación; no se expone un buscador de emails.

### US-11.1/2 — Cooldown server-side (FR-REFINE-12.2)
- **Mecanismo**: cooldown por email, mínimo 60s, persistido server-side. Tabla
  nueva `EmailActionThrottle` (o columna en `profiles` si existe perfil) con
  `email`, `action`, `lastSentAt`. Para cuentas no confirmadas puede no existir
  `profile`, por eso una tabla dedicada por `email` es la opción robusta.
- **Decisión a confirmar en Code Gen**: tabla `EmailActionThrottle` vs. cache
  efímera. Se recomienda tabla (sobrevive a reinicios y es multi-instancia).
- Reenviar al mismo correo anterior reenvía respetando el cooldown.

### US-11.2 — Cambio de email no confirmado (FR-REFINE-12.3) — **NFR/seguridad**
- **Flujo**: formulario pide `currentEmail`, `password`, `newEmail`.
- **Verificación**: server-side se valida la contraseña con
  `signInWithPassword({ currentEmail, password })` en un cliente efímero; si es
  válida y el usuario sigue no confirmado, se actualiza el **mismo**
  `auth.users.id` con `supabase.auth.admin.updateUserById(id, { email })` usando un
  cliente **service_role solo server-side**.
- **Reenvío**: tras actualizar, se dispara confirmación al nuevo email.
- **Preservación**: mismo `auth.users.id` → perfil/membresías/intención `next`
  intactos.
- **Seguridad (NFR)**: la `service_role` key nunca llega al cliente; acción
  marcada `"use server"`, sin exponerse en payloads ni logs. Rate-limit reusa el
  cooldown de 12.2. Esta es la **única** parte de Unit 12 con implicación NFR real
  (manejo de service_role); el resto es UI/flujo.

### US-11.3 — Cambio de email confirmado en Perfil (FR-REFINE-12.4)
- **Reusa** `changeEmail()` existente (`supabase.auth.updateUser({ email })`),
  montado como sección en `/settings/profile`. Sin cambios de schema.

### US-11.4 — Cambio de nickname en Perfil (FR-REFINE-12.5)
- **Reusa** `setNickname()` (ya reasigna discriminador vía `assignDiscriminator`).
- **Rate-limit nuevo**: limitar cambios de nickname (p. ej. 1 cada N días) con
  marca temporal en `profiles` (`nicknameUpdatedAt`). Refine posterior Unit 17:
  debe respetar una oportunidad de gracia post-onboarding; la asignación inicial y
  el primer cambio posterior no disparan el bloqueo de 30 días.
- Montado en `/settings/profile`; mensajes de éxito/error en español.

### US-11.5 — Avatares por defecto resilientes (FR-REFINE-12.6)
- **`AvatarGrid`/`avatar-source-tabs`**: si la query del set por defecto
  (Supabase Storage) falla o devuelve vacío, caer a una lista local empaquetada
  (`public/avatars/*` o constantes) en vez de grilla vacía.
- La selección sigue funcionando con el fallback (la acción
  `set-avatar-from-default-set` acepta las claves locales).

### US-11.6 — Onboarding gana sobre destino (FR-REFINE-12.7)
- **Gate**: el gate de onboarding (`src/proxy.ts`, **intacto**) ya fuerza
  onboarding sin nickname. El ajuste es de **continuidad de destino**: preservar
  `next` a través del onboarding y, al terminar, redirigir a `next` válido o a
  `/matches`. Se coordina con Unit 13 (preservación de `next`).

### US-11.7 — Landing con header de auth (FR-REFINE-12.8)
- En `src/app/page.tsx`, junto a `BrandToggle`/`ThemeToggle`, añadir un header
  superior con enlaces `Iniciar sesión` (`/sign-in`) y `Crear cuenta` (`/sign-up`).
  Cambio de presentación; sin lógica nueva de auth.

## 3. Contratos de acciones (nuevas / modificadas)

| Acción | Tipo | Cambio |
|--------|------|--------|
| `signIn` | mod | Devuelve `{ unconfirmedEmail }` para email no confirmado |
| `resendConfirmation` | nueva | `auth.resend({ type:"signup" })` + cooldown |
| `changeUnconfirmedEmail` | nueva | Verifica password + `admin.updateUserById` (service_role) + reenvío |
| `changeEmail` | reuse | Montada en Perfil (US-11.3) |
| `setNickname` | mod | + rate-limit (`nicknameUpdatedAt`) para uso en Perfil |
| avatar default | mod | Fallback local si Storage falla |

## 4. Estados (carga / error / éxito)
- Todos los formularios nuevos exponen estados de carga, error de campo/_form y
  éxito, con copy en español e i18n en `src/i18n/dictionaries/es.ts`.
- El panel de "email no confirmado" no revela si el email existe (mensaje genérico).

## 5. Accesibilidad
- Formularios con labels asociados, `aria-invalid`/`aria-describedby` en errores,
  foco gestionado al abrir el flujo de cambio de email no confirmado.

## 6. Schema (DECISIÓN CONFIRMADA — migración Prisma)
- **Confirmado (2026-06-12)**: se usa migración Prisma versionada (CF-6), no cache efímera.
- `EmailActionThrottle(email, action, lastSentAt)` para cooldown (FR-REFINE-12.2).
- `profiles.nicknameUpdatedAt` para rate-limit de nickname (FR-REFINE-12.5), con
  refinamiento Unit 17 para distinguir la oportunidad de gracia post-onboarding.
- `profiles.nicknameChangeCount` / `nickname_change_count` (Unit 17) para persistir
  si la gracia post-onboarding ya fue consumida.
- Requiere `prisma migrate deploy` en prod (Operations/CF-6).
- **Confirmado (2026-06-12)**: el cambio de email no confirmado usa `service_role`
  (`SUPABASE_SERVICE_ROLE_KEY`) en un cliente server-only (`src/lib/supabase/admin.ts`).

## 7. Plan de archivos (para Code Generation)
- `src/features/auth/actions/resend-confirmation.ts` (nueva)
- `src/features/auth/actions/change-unconfirmed-email.ts` (nueva, service_role)
- `src/lib/supabase/admin.ts` (cliente service_role server-only, si no existe)
- `src/features/auth/components/sign-in-form.tsx` (mod: panel no-confirmado)
- `src/features/auth/components/unconfirmed-email-dialog.tsx` (nueva)
- `src/features/profile/actions/set-nickname.ts` (mod: rate-limit)
- `src/app/(app)/settings/profile/page.tsx` (mod: secciones email + nickname)
- `src/features/profile/components/avatar-grid.tsx` (mod: fallback local)
- `src/app/page.tsx` (mod: header de auth)
- `prisma/schema.prisma` + migración (si se confirman tablas/columnas)
- i18n: claves nuevas en `src/i18n/dictionaries/es.ts`
- Tests: acciones nuevas (resend cooldown, change-unconfirmed verifica password) +
  fallback de avatar.

## 8. Verificación (criterios de "hecho")
- `tsc --noEmit` 0 errores; Biome/ESLint limpios; Vitest verde; `next build` OK.
- Login con email no confirmado ofrece reenviar/cambiar; cooldown ≥60s aplicado.
- Cambio de email no confirmado preserva el mismo `auth.users.id`.
- Nickname/email editables desde Perfil; avatares con fallback local.
- `service_role` solo server-side (verificado por ausencia en bundles cliente).
- Units 1–11 intactas; `src/proxy.ts` sin cambios de lógica de gate.
