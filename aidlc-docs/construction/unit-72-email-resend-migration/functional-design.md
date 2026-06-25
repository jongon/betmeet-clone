# Unit 72 — Migración del envío de email de Supabase a Resend (Functional Design)

> Refine vía `/aidlc:plan` + `/aidlc:build` (2026-06-25). Concreta FR-REFINE-72.1.
> Evolución de Unit 9 (FR-EMAIL-01): cambia el **emisor** de los correos de auth.

## 1. Intención y decisiones

El usuario pidió **dejar de usar el envío de email con Supabase y migrarlo a
Resend** (envío directo desde nuestro código). Decisiones (AskUserQuestion):

- **Mecanismo = Supabase Send Email Hook.** Supabase sigue siendo la **autoridad
  del token** (genera `user` + `token_hash` + `email_action_type`) pero **delega el
  ENVÍO** a un endpoint nuestro. El SMTP de Supabase queda **desactivado**.
- **Alcance = los 3 correos de auth (Grupo A)** + **andamiaje del Grupo B** (cliente
  Resend reutilizable + builders stub, sin disparadores activos).
- **Plantillas = portadas del HTML actual a funciones TS** (deps nuevas mínimas).

## 2. Arquitectura del canal (después de Unit 72)

```text
  src/features/auth/actions/*.ts            Supabase Auth              Nuestra app (Resend)
  signUp / resetPasswordForEmail / ───►  genera user + token_hash ──► POST /api/auth/email-hook
  updateUser({email})  (SIN CAMBIOS)      [auth.hook.send_email]        - verifica firma (401 si falla)
                                                                        - renderAuthEmail() → plantilla TS
                                                                        - resend.emails.send() ──► inbox
  El SMTP de Supabase ([auth.email.smtp]) queda DESACTIVADO.
```

- **Triggers sin cambios**: las server actions de auth siguen llamando al SDK de
  Supabase. `sign-up.ts` ya guarda `invite_next` (percent-encoded) en
  `user_metadata`; el hook lo lee de `user.user_metadata` y lo propaga al enlace
  (FR-REFINE-13.1, Unit 68 preservada).
- **Flujo `token_hash` intacto**: los enlaces siguen apuntando a
  `/auth/confirm?token_hash=…&type=…&next=…` (verifyOtp). `src/app/auth/confirm/route.ts`
  **no se toca** → robustez cross-device preservada.

## 3. Mapa "email_action_type → plantilla → destino → enlace"

| `email_action_type` | Plantilla TS | `to` | `next` |
|---|---|---|---|
| `signup` | `templates/confirmation.ts` | `user.email` | `user_metadata.invite_next` ?? `%2Fmatches` |
| `recovery` | `templates/recovery.ts` | `user.email` | `/reset-password` |
| `email_change` / `email_change_new` | `templates/email-change.ts` | `user.new_email` (CF-9) | `/settings/security` |
| `magiclink`, `invite`, `email_change_current`, `reauthentication` | — | — | `null` → ack sin enviar |

> `email_change` con **Secure email change desactivado** (FR-REFINE-19.1 / CF-9):
> un único enlace al **correo nuevo**; la plantilla muestra `De <old> A <new>`.

## 4. Componentes (código)

| Archivo | Rol |
|---|---|
| `src/lib/email/client.ts` | Cliente Resend singleton (guard server-only) + `getEmailFrom()` |
| `src/features/email/types.ts` | Tipos del payload del hook + `RenderedEmail` |
| `src/features/email/templates/shell.ts` | Shell de marca portado de `supabase/templates/*.html` + `escapeHtml` + `ctaBlock` |
| `src/features/email/templates/{confirmation,recovery,email-change}.ts` | Plantillas TS (subject + html) |
| `src/features/email/services/render-auth-email.ts` | Mapea payload → `RenderedEmail` (tabla §3) |
| `src/features/email/services/verify-hook.ts` | Verifica firma Standard Webhooks (`SEND_EMAIL_HOOK_SECRET`) |
| `src/features/email/catalog/business-emails.ts` | **Grupo B (stub)**: builders welcome / pool-invite + `sendBusinessEmail` |
| `src/app/api/auth/email-hook/route.ts` | Endpoint POST (`runtime nodejs`): verifica → render → envía |

**Config / env**: `supabase/config.toml` (`[auth.hook.send_email]` enabled + SMTP
comentado); `.env.example` (`RESEND_API_KEY`, `EMAIL_FROM`, `SEND_EMAIL_HOOK_SECRET`,
reemplazan `RESEND_SMTP_PASSWORD`). Deps nuevas: `resend`, `standardwebhooks`.

## 5. Seguridad (Security Baseline)

- **Firma obligatoria** (Standard Webhooks): sin `webhook-id`/`-timestamp`/
  `-signature` válidos o sin secreto → **401** y no se envía (SECURITY-01/08). El
  secreto solo server-side (env), nunca en cliente.
- El endpoint **no expone datos**: solo recibe el payload de Supabase y manda.
  Sin nueva superficie de input de usuario, schema ni migraciones.
- El `token_hash` sigue siendo de un solo uso y lo verifica Supabase en
  `/auth/confirm` → **sin regresión** del modelo de auth.
- Direcciones interpoladas en HTML escapadas (`escapeHtml`).
- 5xx ante fallo de envío → Supabase reintenta; 2xx = ack.

## 6. Verificación

- `pnpm exec tsc --noEmit`: 0 errores en archivos de la unit (persisten 2 errores
  preexistentes de `pool-live-now-banner.test.tsx`, Unit 61, ajenos).
- **Vitest 13/13** nuevos: `render-auth-email` (5), `verify-hook` (4),
  `api/auth/email-hook/route` (4).
- Biome `--write` limpio (13 archivos), ESLint 0.
- `pnpm build` OK; ruta `/api/auth/email-hook` presente en el manifiesto.
- **Local (manual)**: `supabase start` con `[auth.hook.send_email]` →
  `host.docker.internal:3000`; sign-up de prueba dispara el POST y Resend (sandbox
  `resend.dev`) entrega; el enlace confirma vía `/auth/confirm`. Repetir recovery y
  email_change. Confirmar que el SMTP de Supabase está desactivado.

## 7. Operaciones / prerequisitos (user-owned)

- **Resend**: `RESEND_API_KEY`; en prod, **dominio verificado** (SPF + DKIM + DMARC)
  para salir del sandbox `resend.dev`.
- **Supabase**: habilitar el Send Email Hook (Auth → Hooks) apuntando a
  `https://<dominio>/api/auth/email-hook` con `SEND_EMAIL_HOOK_SECRET`; **desactivar**
  el Custom SMTP para no duplicar correos.
- **Vercel**: `RESEND_API_KEY`, `EMAIL_FROM`, `SEND_EMAIL_HOOK_SECRET`.

## 8. Out of scope

- Activar envíos reales del Grupo B (solo andamiaje).
- React Email (se portó el HTML a TS).
- Cambiar el flujo `token_hash` / `/auth/confirm` o las server actions de auth.
- Preferencias de notificación por usuario (prerequisito de los engagement B).
- Emails bilingües es/en (igual que Unit 24; el `locale` en `user_metadata` queda
  como mejora futura no bloqueante).
