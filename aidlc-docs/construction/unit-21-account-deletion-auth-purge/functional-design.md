# Unit 21 — Eliminación real de la cuenta (purga del `auth.users`) · Functional Design

> Refine post-construcción (2026-06-14). **No reinicia** Units 1–20. Corrige una
> **divergencia de implementación** respecto al diseño ya aprobado de Unit 1
> (**WF-11** / **RULE-SEC-03**): el flujo de borrado de cuenta en `settings/security`
> nunca llegaba a eliminar el usuario de `auth.users`. Cubre FR-REFINE-21.1 y la
> **Épica 20**.

## 1. Alcance y trazabilidad

| Historia | FR-REFINE | Naturaleza | Resultado |
|----------|-----------|------------|-----------|
| US-20.1 | 21.1 | bug de conformidad (auth) | "Eliminar cuenta" elimina de verdad la cuenta: purga el `auth.users`, invalida sesiones y libera el email |

Referencias del diseño aprobado que ya prescribían el comportamiento correcto:
- **WF-11: Account Deletion** (Unit 1 · `business-logic-model.md`), paso 2: *"Call
  Supabase Admin API to delete `auth.users` record (hard delete from auth)"* y paso 3:
  *"Invalidate all active sessions"*.
- **RULE-SEC-03** (Unit 1 · `business-rules.md`): *"`auth.users` is hard-deleted via
  the Supabase Admin API. All active sessions for the user are invalidated."*

## 2. Problema observado

En `settings/security → Danger zone → Delete account`, tras confirmar, la cuenta **no
se eliminaba realmente**: el usuario podía volver a iniciar sesión, el email seguía
ocupado y el registro de `auth.users` persistía.

**Causa raíz.** `src/features/auth/actions/delete-account.ts` ejecutaba solo:
1. la transferencia de ownership de pools (BL-9), correcta;
2. el **soft-delete** del perfil (`Profile.deleted_at = now()`); y
3. un `supabase.auth.signOut()` (que solo cierra la sesión local actual).

**Faltaba el paso 2 de WF-11 / RULE-SEC-03**: el *hard-delete* del registro de
`auth.users` con la **Admin API**. Sin esa llamada, el usuario de autenticación
seguía existiendo → se podía volver a entrar y el email no se liberaba. No era un
cambio de diseño: el código **divergía** del diseño aprobado.

## 3. Decisión de diseño

Restaurar la conformidad con WF-11 / RULE-SEC-03 añadiendo el *hard-delete* del
`auth.users` vía la **Admin API** (`createAdminClient().auth.admin.deleteUser(userId)`,
ya existente en `src/lib/supabase/admin.ts`, backed por `service_role`).

Se **conserva el modelo híbrido ya documentado** (no se cambia la semántica):
- **Soft-delete del `Profile`** (`deleted_at`): retiene el historial de predicciones y
  scores y mantiene la integridad referencial. **No existe FK de `profiles.id` a
  `auth.users`** (el perfil se crea por el trigger `handle_new_user()` AFTER INSERT;
  ver migración `20260611120000_rls_constraints_triggers`), por lo que purgar el
  `auth.users` **no** cascadea el perfil — el modelo híbrido es internamente
  consistente.
- **Transferencia de ownership de pools (BL-9)** antes de tocar la cuenta: necesaria
  porque `pools.owner_id → profiles.id` es `ON DELETE RESTRICT`.
- Filtro `deleted_at IS NULL` (RULE-SEC-04) en las consultas de la app.

**Orden del flujo** (`deleteAccount`):
1. `transferOwnedPoolsForAccountDeletion(userId, assignments)` — BL-9.
2. `prisma.profile.update({ deletedAt: now() })` — soft-delete (WF-11 paso 1).
3. `admin.auth.admin.deleteUser(userId)` — **hard-delete del `auth.users`** (WF-11
   paso 2; invalida todas las sesiones, paso 3). Si devuelve error → se retorna
   `{ error: { _form } }` y **no** se hace `signOut`/redirect.
4. `logAuthEvent("auth.account_deleted", …)`.
5. `supabase.auth.signOut()` (limpia la cookie de sesión local) + `redirect("/sign-in?deleted=true")`.

## 4. Contratos modificados

| Elemento | Tipo | Cambio |
|----------|------|--------|
| `src/features/auth/actions/delete-account.ts` | mod | Importa `createAdminClient`; tras el soft-delete llama `admin.auth.admin.deleteUser(userId)`; error → `{ error: { _form } }` sin redirect |
| `src/features/auth/actions/__tests__/delete-account.test.ts` | mod | Mockea `@/lib/supabase/admin`; asserta `deleteUser("user-1")`; nuevo caso de fallo de purga (sin signOut/redirect) |

Sin cambios de schema, migraciones, rutas, UI (`security-client.tsx` /
`confirm-delete-modal.tsx` ya consumen la misma forma `{ error: { _form } }`), ni de la
lógica de transferencia de pools.

## 5. NFR / Infra

- **NFR (seguridad / privacidad)**: la purga del `auth.users` materializa el
  comportamiento esperado de "derecho al borrado" del usuario de autenticación
  (login imposible, sesiones invalidadas, email liberado) que RULE-SEC-03 ya exigía.
  Usa el `service_role` solo server-side (guardas de `createAdminClient`).
- **Infra**: requiere `SUPABASE_SERVICE_ROLE_KEY` en el entorno del servidor (ya
  necesario por Unit 12 / FR-REFINE-12.3). Sin nuevos secretos ni migraciones.
- **Operations**: verificar en prod que, tras "Eliminar cuenta", el usuario desaparece
  de `auth.users` (Dashboard → Authentication → Users) y que el email puede volver a
  registrarse.

## 6. Verificación esperada

- `tsc --noEmit` 0 errores; Biome limpio en los archivos tocados.
- `delete-account.test.ts`: verde, incluyendo el assert de `admin.deleteUser(userId)`
  y el caso de fallo de purga (devuelve `_form`, no redirige).
- En vivo (Operations): al eliminar la cuenta, el `auth.users` se elimina, no se puede
  volver a iniciar sesión y el email queda libre; el `Profile` permanece soft-deleted
  con el historial intacto.

## 7. Épica 20 — Historia de usuario

- **US-20.1**: Como usuario que elimina su cuenta desde `settings/security`, quiero que
  la cuenta se elimine de verdad (no poder volver a iniciar sesión y que mi email quede
  libre), para confiar en que mis datos de acceso se han borrado.
