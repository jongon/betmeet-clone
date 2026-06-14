# Unit 19 — Confirmación Única del Cambio de Email · Functional Design

> Refine post-construcción (2026-06-14). **No reinicia** Units 1–18; ajusta el
> comportamiento del flujo de cambio de email del Perfil (Units 12/15). Cubre
> FR-REFINE-19.1 y la **Épica 18**. **Reemplaza** la doble confirmación descrita en
> FR-REFINE-15.10.

## 1. Alcance y trazabilidad

| Historia | FR-REFINE | Naturaleza | Resultado |
|----------|-----------|------------|-----------|
| US-18.1 | 19.1 | comportamiento auth + copy | Cambio de email se confirma con un único enlace, solo al correo nuevo |

## 2. Problema observado

En el Perfil, al modificar el email el sistema enviaba un enlace de confirmación al
**correo antiguo Y al nuevo**, y exigía confirmar **ambos** para aplicar el cambio.
Esto es la función **Secure email change** de Supabase
(`secure_email_change_enabled = true`, decisión original de FR-REFINE-15.10). El
usuario reporta que solo debería confirmarse el correo **nuevo** y que la
notificación de cambio debería llegar **solo al nuevo**.

## 3. Decisión de diseño

Desactivar Secure email change (`secure_email_change_enabled = false`). Con el flag
desactivado, Supabase envía **un único enlace de confirmación, únicamente a la
dirección nueva**; el correo antiguo no recibe correo ni debe confirmar. El cambio
se aplica al confirmar ese único enlace.

Se **conserva**:
- El flujo robusto `token_hash`/`verifyOtp` (`/auth/confirm`) de FR-REFINE-15.10
  (sobrevive a enlaces reescritos por escáneres / cross-device).
- La plantilla `email_change.html` (ya enlaza a `/auth/confirm`; su bloque "De → A"
  y la nota "no se aplicará sin confirmación" siguen siendo correctos para el envío
  único al correo nuevo).
- El input de solo lectura con el correo actual (FR-REFINE-15.9).

## 4. Contratos modificados

| Elemento | Tipo | Cambio |
|----------|------|--------|
| `supabase/config.toml` | config | `secure_email_change_enabled = false` + comentarios |
| **Dashboard Supabase (prod)** | ops | Toggle "Secure email change" → **OFF** (debe coincidir con `config.toml`) |
| `src/features/auth/actions/change-email.ts` | mod | Comentario: confirmación única al correo nuevo |
| `src/i18n/dictionaries/es.ts` | mod | `profile.emailDescription` / `profile.emailSuccess`: copy de confirmación única |
| `requirements.md` | doc | FR-REFINE-19.1 + nota de reemplazo en 15.10 |
| Unit 15 functional design | doc | Decisión 15.10 marcada como superseded |
| `carry-forward-decisions.md` | doc | CF-9 (tradeoff de seguridad) |

Sin cambios de schema, migraciones, rutas, servicios ni de la lógica del server
action `changeEmail` (sigue siendo `updateUser({ email })`).

## 5. NFR / Infra

- **NFR (seguridad)**: desactivar Secure email change reduce la protección contra
  apropiación de cuenta — un atacante con una sesión activa podría cambiar el email
  sin confirmar desde la dirección antigua. **Tradeoff aceptado explícitamente por el
  usuario** y registrado como **CF-9**. Security Baseline permanece habilitado; el
  resto de controles (confirmación de email obligatoria, gate, RLS) no cambia.
- **Infra**: solo un toggle de Supabase Auth. **Pendiente Operations**: replicar el
  toggle en el dashboard de prod para que el comportamiento en vivo coincida con
  `config.toml`.

## 6. Verificación esperada

- `tsc --noEmit` 0 errores; Biome limpio; ESLint 0; Vitest verde.
- No quedan referencias de copy a "ambos" correos en el flujo de cambio de email.
- En vivo (Operations): al cambiar el email, solo el correo nuevo recibe el enlace;
  el antiguo no recibe nada; el cambio se aplica con una sola confirmación.

## 7. Épica 18 — Historias de usuario

- **US-18.1**: Como usuario que cambia su correo en el Perfil, quiero confirmar
  solo el correo nuevo y que la notificación llegue solo a ese, para no depender de
  tener acceso al correo antiguo ni recibir mensajes innecesarios en él.
