# Unit 9 — Transactional Email (Design)

> Añadida vía `/aidlc-refine` (2026-06-11). Cross-cutting, post-construcción. No
> altera el comportamiento de las Units 1–8. Concreta FR-03 → **FR-EMAIL-01** y
> la **Épica 8** (US-8.1/8.2/8.3).

## 1. Intención y decisiones

El usuario pidió: (a) tener **el código** de los emails que la app envía en este
repositorio, con **las plantillas almacenadas "en otro lado"**; y (b) una
**propuesta del catálogo completo** de correos del proyecto.

Decisiones tomadas durante el refine:

- **Canal**: Resend conectado como **Custom SMTP de Supabase Auth**.
- **"Solo lo necesario para el stack"**: **cero dependencias npm nuevas**, sin
  mailer propio. Supabase sigue siendo el emisor; solo cambia el SMTP subyacente.
- **"Plantillas en otro lado, código aquí"**: las plantillas se versionan como
  HTML en `supabase/templates/` y se referencian desde `supabase/config.toml`
  (`content_path`). Supabase las hospeda y envía ("otro lado"); la fuente vive en
  el repo y entra en code review.
- **Alcance construible ahora** = solo el **Grupo A** (correos de auth ya
  existentes). El **Grupo B** (negocio) se documenta como propuesta/backlog.

## 2. Arquitectura del canal

```text
                    repo (aquí)                         Supabase (otro lado)        Resend
  ┌───────────────────────────────────────┐      ┌──────────────────────────┐   ┌─────────┐
  │ src/features/auth/actions/*.ts         │      │ Auth service             │   │  SMTP   │
  │   signUp / resetPasswordForEmail /     │ ───► │  - usa plantilla por tipo │──►│ (Custom │──► inbox
  │   updateUser({email})  (Supabase SDK)  │      │  - content_path desde     │   │  SMTP)  │
  │                                        │      │    config.toml            │   └─────────┘
  │ supabase/templates/*.html  (fuente)    │ ───► │  - aplica variables       │
  │ supabase/config.toml  ([auth.email...])│      └──────────────────────────┘
  └───────────────────────────────────────┘
```

- El **disparo** ya existe en el código (no se añade nada): las server actions de
  auth llaman al SDK de Supabase, que selecciona la plantilla según el tipo de
  correo y la envía por el SMTP de Resend.
- La **fuente de las plantillas** vive en el repo; Supabase las carga vía
  `content_path` y las hospeda/renderiza con sus variables (`{{ .ConfirmationURL }}`,
  `{{ .Token }}`, `{{ .SiteURL }}`, `{{ .Email }}`, etc.).
- **Sin var de runtime nueva** en la app: los `redirectTo`/`emailRedirectTo`
  siguen usando `NEXT_PUBLIC_SITE_URL`. El secreto SMTP de Resend se configura en
  Supabase (dashboard / `config.toml`), no en la app.

## 3. Mapa "trigger en código → plantilla"

| Tipo Supabase | Plantilla (repo) | Trigger (código) |
|---|---|---|
| `confirmation` | `supabase/templates/confirmation.html` | `src/features/auth/actions/sign-up.ts` (`signUp`) |
| `recovery` | `supabase/templates/recovery.html` | `src/features/auth/actions/forgot-password.ts` (`resetPasswordForEmail`) |
| `email_change` | `supabase/templates/email_change.html` | `src/features/auth/actions/change-email.ts` (`updateUser({email})`) |

> `email_change`: con **Secure email change desactivado** (FR-REFINE-19.1 /
> `secure_email_change_enabled = false`), este correo se envía **solo a la dirección
> nueva** (un único enlace); el correo antiguo no recibe nada. Ver CF-9.

> Tipos `magic_link`, `invite` y `reauthentication`: gestionados por Supabase pero
> no usados por la app hoy → se dejan en su default (no se versiona plantilla).

## 4. Catálogo completo de correos del proyecto

### Grupo A — Auth / transaccional (EN ALCANCE)

| # | Email | Disparador | Estado |
|---|-------|------------|--------|
| 1 | Confirmar registro / verificar email | `auth/actions/sign-up.ts` | Activo |
| 2 | Restablecer contraseña | `auth/actions/forgot-password.ts` | Activo |
| 3 | Confirmar cambio de email (dir. antigua + nueva) | `auth/actions/change-email.ts` | Activo |

### Grupo B — Negocio / notificación (PROPUESTA — backlog; requiere SDK Resend)

| # | Email | Punto de envío natural | Trigger |
|---|-------|------------------------|---------|
| 4 | Bienvenida (post-verificación / fin de onboarding) | request de usuario | onboarding |
| 5 | Invitación a un pool (enlace por token) | request de usuario | `pools/services/invite-token.ts`, `join-pool-by-token.ts` |
| 6 | Alguien se unió a tu pool (al owner) | request de usuario | `pools/actions/join-pool-by-token.ts`, `join-public-pool.ts` |
| 7 | Te expulsaron de un pool (al miembro) | request de usuario | `pools/actions/kick-member.ts` |
| 8 | Recordatorio "el partido empieza pronto" | **job/cron** (pre-kickoff) | `predictions/services/lock.ts` |
| 9 | Resumen de jornada: predicciones puntuadas + puntos | **job/cron** (post-sync) | `scoring-rankings/services/score-sweeper.ts` |
| 10 | Cambio de ranking / nuevo líder en tu pool | **job/cron** | `scoring-rankings/services/ranking.ts` |
| 11 | Recálculo por override de resultado (admin) | request admin | `admin/actions/force-result.ts`, `revert-override.ts` |
| 12 | [Ops] Alerta de fallo de sincronización (a admins) | **job/cron** | `competition/services/sync-orchestrator.ts` |

**Notas de implementación del backlog (Grupo B):**
- Requiere añadir el SDK de Resend (`resend`) y un módulo `src/lib/email/` (cliente)
  + lógica de catálogo en `src/features/email/` (o `notifications/`), siguiendo la
  convención feature del repo.
- Los correos 8, 9, 10 y 12 **no** tienen request HTTP de usuario → deben enviarse
  desde un job/cron (sweeper post-sync, scheduler pre-kickoff), no inline.
- Antes de activar envíos de engagement (8–10): **preferencias de notificación por
  usuario** (opt-in/opt-out) — relacionado con FR-04 (push) y UC-08.
- Inmutabilidad: el contenido de 9/11 deriva de datos de scoring inmutables (V2
  crypto betting) — los correos solo leen, nunca alteran ese estado.

## 5. Prerequisitos de Operaciones

- **Dev**: sandbox `resend.dev` (sin dominio). Rate-limited; suficiente para QA.
- **Producción**: verificar un **dominio propio en Resend** (registros DNS
  **SPF + DKIM + DMARC**) antes de salir del sandbox. El dominio se verifica en
  Resend, no en Vercel ni Supabase; basta con controlar el DNS.
- Configurar el SMTP de Resend en Supabase (Auth → SMTP Settings, o
  `[auth.email.smtp]` en `config.toml`). Un único dominio sirve para auth (vía
  Supabase) y, a futuro, para los correos de negocio (vía SDK Resend).

## 6. Verificación

- Sin cambios de runtime → `pnpm build`, `pnpm test`, Biome y ESLint deben seguir
  en verde (las plantillas y `config.toml` no afectan al bundle de la app).
- Local: `supabase start` debe cargar las plantillas vía `content_path`; un
  sign-up de prueba envía el correo de confirmación por el sandbox de Resend.
- Coherencia documental: FR-EMAIL-01 ↔ Épica 8 ↔ Unit 9 (unit-of-work) ↔ este doc
  ↔ aidlc-state ↔ audit.
