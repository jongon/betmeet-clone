# Requirements Document

## Intent Analysis

- **User Request**: "Quiero empezar ideación" — Idear un producto SaaS sobre el template Next.js existente
- **Request Type**: New Project (Greenfield con stack fijo)
- **Scope Estimate**: System-wide (múltiples módulos, permisos, integraciones)
- **Complexity Estimate**: Complex (alta complejidad con auth crítica y múltiples integraciones)
- **Requirements Depth**: Comprehensive

---

## Contexto del Proyecto

### Stack Fijo (Preconfigurado)
| Capa | Tecnología |
|------|------------|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS v4 |
| UI Components | shadcn/ui |
| Autenticación | Supabase Auth |
| Base de datos | Supabase (PostgreSQL) |
| ORM | Prisma (sobre PostgreSQL de Supabase) |
| Package Manager | pnpm |
| Dev Tooling | Biome, ESLint, Lefthook, Commitlint + Gitmoji |
| Contenedores | Docker / Dev Containers |
| Deployment App | Vercel |

### Clasificación
- **Project Type**: Greenfield con stack preconfigurado
- **Reverse Engineering**: No aplica (sin lógica de negocio existente)
- **Decisiones de Security Baseline**: Reglas SECURITY-01 a SECURITY-15 habilitadas como restricciones bloqueantes
- **Decisiones de PBT**: Omitido por ahora

---

## 1. Requisitos Funcionales

### FR-01: Autenticación y Cuentas (Crítica — MVP)

Proveedor de autenticación: **Supabase Auth** (gestiona email/password, social login, MFA, passkeys, account linking, verificación de email y recuperación de contraseña).

#### FR-01.1: Registro de Usuarios
- Registro con email y contraseña
- Registro con redes sociales (mínimo: **Google**)
- Validación de email mediante verificación (confirmation link)
- Política de contraseñas: mínimo 8 caracteres, verificación contra lista de contraseñas comprometidas
- Hashing gestionado por Supabase Auth (argon2/bcrypt adaptativo)

#### FR-01.2: Inicio de Sesión
- Login con email y contraseña
- Login con redes sociales (Google, extensible a otros proveedores)
- Login con **Passkeys** (WebAuthn) como opción
- Account linking y resilience: un usuario que se registra con email y luego inicia sesión con Google (o viceversa) debe mantener la misma cuenta sin conflictos
- Protección contra brute force gestionada por Supabase Auth
- Sesiones con expiración server-side, invalidación en logout
- Cookies: atributos Secure, HttpOnly, SameSite

#### FR-01.3: Recuperación de Contraseña
- Flujo de reset de contraseña vía email (Supabase Auth)
- Link temporal con expiración
- Re-autenticación requerida para cambio de contraseña

#### FR-01.4: Resilience de Cuentas (Account Linking)
- Múltiples proveedores de autenticación vinculados a una sola cuenta
- Si un usuario se registra con email/password y luego usa Google login con el mismo email, las cuentas se fusionan automáticamente
- El usuario puede vincular/desvincular proveedores desde su perfil
- No se crean cuentas duplicadas por usar distintos métodos de login

#### FR-01.5: Sistema de Niveles de Usuario (No RBAC)
- **No verificado**: Usuario que se registró pero no ha verificado su email. Acceso limitado.
- **Verificado**: Usuario con email verificado. Acceso completo a funcionalidades del SaaS.
- **Administrador**: Usuario con permisos administrativos. Acceso al panel de administración.
- Denegación por defecto: toda ruta requiere autenticación a menos que se marque explícitamente como pública
- Autorización a nivel de objeto (IDOR prevention): verificar ownership/permiso en cada request
- Autorización a nivel de función: operaciones administrativas requieren verificación de nivel server-side
- Política CORS restrictiva en endpoints autenticados
- Supabase Row Level Security (RLS) para autorización a nivel de fila en la base de datos

#### FR-01.6: Multi-Factor Authentication (MFA) — Opcional para Todos
- MFA disponible como opción para **todos los usuarios**, incluyendo administradores
- No es obligatorio para ningún nivel de usuario
- Supabase Auth gestiona la verificación del segundo factor (TOTP)
- Los usuarios pueden habilitar/deshabilitar MFA desde su perfil

#### FR-01.7: Passkeys (WebAuthn) — Opcional
- Soporte para Passkeys como método de autenticación alternativo
- Disponible para todos los usuarios, incluyendo administradores
- Gestión de Passkeys desde el perfil del usuario (registro y eliminación)
- Supabase Auth gestiona el ciclo de vida de las credenciales WebAuthn

### FR-02: Gestión de Perfiles de Usuario
- Visualización y edición del perfil propio
- Campos: nombre, email (verificado), avatar, preferencias
- Gestión de proveedores de autenticación vinculados (ver FR-01.4)
- Gestión de MFA y Passkeys desde el perfil (habilitar/deshabilitar/eliminar)
- Datos de negocio adicionales según el dominio del SaaS

### FR-03: Notificaciones por Email
- **Canal**: Supabase Auth con **Resend como Custom SMTP** (decidido en refine 2026-06-11). Sin dependencias npm nuevas; Supabase es el emisor.
- **Plantillas**: versionadas en el repo (`supabase/templates/*.html`) y referenciadas desde `supabase/config.toml` con `content_path`; Supabase las hospeda y envía ("plantillas en otro lado, código aquí").
- **Tipos de email activos** (transaccionales de auth): verificación de email al registro, restablecimiento de contraseña, confirmación de cambio de email.
- **Emails de negocio** (bienvenida, invitación a pool, resultados/puntos, recordatorios, expulsión, alertas de sync): catálogo propuesto como backlog — requieren el SDK de Resend en código, fuera del alcance "solo lo necesario" del MVP.
- Detalle completo y catálogo en **FR-EMAIL-01** (refine — Unit 9).

### FR-04: Notificaciones Push
- Integración con **Web Push estándar** para navegadores, usando Push API + Service Worker + VAPID como baseline gratuito para escala MVP.
- Preferencias de notificación configurables por usuario, con opt-in explícito por tipo de evento.
- Gestión de suscripciones y dispositivos, incluyendo revocación y limpieza de endpoints inválidos.
- Tipos de notificación v1:
  - Cuando empieza un partido.
  - Cuando termina un partido.
  - Cuando me invitan a una liga/pool.
  - Cuando subo en el ranking global.
  - Cuando se anota un gol.
- El sistema debe respetar permisos del navegador, preferencias del usuario y autorización de datos antes de enviar.
- Decisión técnica v1: priorizar Web Push auto-gestionado sobre OneSignal para mantener coste cero en el MVP; conservar interfaz de proveedor para migrar a OneSignal, FCM, Novu u otro servicio si crecen necesidades de segmentación, analytics o mobile push nativo.

### FR-05: Integraciones con APIs de Terceros
- Diseño modular para integraciones externas
- Abstracción de proveedores (adapter pattern) para facilitar swap de proveedores
- Gestión segura de API keys (Supabase Vault o secrets manager, nunca hardcoded)

### FR-06: Jobs Programados (Crons) — TBD
- La necesidad de jobs programados se definirá en la fase funcional
- Si se requieren, se evaluará estrategia (Supabase Edge Functions con pg_cron, o servicio externo como Ingress/Trigger.dev)
- Los requisitos específicos dependerán del dominio de negocio del SaaS

### FR-07: Datos de Negocio
- Modelo de datos extendible basado en el dominio del SaaS
- Gestión de usuarios, perfiles y datos básicos de negocio
- CRUD operations con validación de input en todos los endpoints
- Auditoría de cambios críticos (quién cambió qué, cuándo)
- Row Level Security (RLS) de Supabase para control de acceso a nivel de fila

---

## 2. Requisitos No Funcionales

### NFR-01: Seguridad (Blocking — SECURITY rules enforced)

| ID | Regla | Descripción |
|----|-------|-------------|
| SECURITY-01 | Encryption at Rest and in Transit | TLS 1.2+ en todas las conexiones; encriptación at rest en Supabase/PostgreSQL |
| SECURITY-02 | Access Logging on Network Intermediaries | Logging de acceso en Vercel (CDN/edge) y Supabase |
| SECURITY-03 | Application-Level Logging | Logging estructurado con timestamp, correlation ID, nivel, mensaje; sin PII en logs |
| SECURITY-04 | HTTP Security Headers | CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy en todos los HTML endpoints (Vercel middleware) |
| SECURITY-05 | Input Validation | Validación de tipo, longitud, formato y sanitización en todos los parámetros de API; queries parametrizadas vía Prisma |
| SECURITY-06 | Least-Privilege Access | RLS policies con privilegios mínimos; service_role key solo en server-side operations |
| SECURITY-07 | Restrictive Network Configuration | Supabase project settings con acceso restringido; Vercel deployment configs |
| SECURITY-08 | Application-Level Access Control | Deny by default (Supabase RLS + middleware), IDOR prevention, function-level auth, CORS restrictivo, validación de JWT en cada request |
| SECURITY-09 | Security Hardening | Sin credenciales default, error handling sin detalles internos, sin directory listing |
| SECURITY-10 | Software Supply Chain | Dependencias pinned (pnpm lockfile), vulnerability scanning, Sin `latest` tags en producción |
| SECURITY-11 | Secure Design Principles | Separación de concerns, defense in depth, rate limiting en endpoints públicos (Vercel + middleware) |
| SECURITY-12 | Auth & Credential Management | Supabase Auth gestiona: password policy, hashing adaptativo, MFA opcional, session management, brute-force protection. Zero hardcoded credentials (usar Supabase Vault/vault env) |
| SECURITY-13 | Software & Data Integrity | Deserialización segura, SRI para CDN resources (Vercel), CI/CD integrity, auditoría de cambios críticos |
| SECURITY-14 | Alerting & Monitoring | Alertas en eventos de seguridad (Supabase logs + Vercel monitoring), logs append-only, retención mínima 90 días |
| SECURITY-15 | Exception Handling & Fail-Safe | Error handling en todas las llamadas externas (Supabase client, APIs), fail closed, resource cleanup, global error handler (Next.js error.tsx) |

### NFR-02: Rendimiento
- Time to Interactive (TTI) < 3 segundos en conexiones 4G
- First Contentful Paint (FCP) < 1.5 segundos
- Server-side rendering para la primera carga (Next.js SSR)
- Optimización de consultas de base de datos (índices, query optimization, Supabase connection pooling)

### NFR-03: Escalabilidad
- Arquitectura stateless para escalado horizontal (Vercel serverless functions)
- Supabase con connection pooling (Supavisor)
- Diseño preparado para separación de servicios si el crecimiento lo requiere

### NFR-04: Experiencia de Usuario
- Interfaz responsive (mobile-first)
- Feedback inmediato en todas las acciones del usuario (loading states, success/error messages)
- Accesibilidad (WCAG 2.1 AA como baseline)
- Consistencia visual mediante design system (shadcn/ui + Tailwind)
- Flujo de account linking transparente al usuario (no confuso)

### NFR-05: Velocidad de Desarrollo
- Componentización y reutilización (shadcn/ui)
- Type safety end-to-end (TypeScript + Prisma types + Supabase types)
- Developer experience: hot reload, linting, lint-staged hooks
- CI/CD en Vercel (deploy automático desde Git)
- Supabase CLI para migraciones y seed local

### NFR-06: Disponibilidad
- Target uptime: 99.5% (aceptable para MVP)
- Error boundaries en el frontend (Next.js error.tsx)
- Graceful degradation de funcionalidades no críticas
- Supabase y Vercel proporcionan alta disponibilidad por defecto

---

## 3. Escenarios de Usuario

### UC-01: Registro con Email
1. Usuario visita la página de registro
2. Ingresa email y contraseña
3. Recibe email de verificación (Supabase Auth)
4. Confirma email (link)
5. Cuenta pasa a nivel "Verificado"
6. Completa perfil básico
7. Accede al dashboard principal

### UC-02: Registro con Red Social (Google)
1. Usuario hace click en "Continuar con Google"
2. Supabase Auth gestiona el flujo OAuth con Google
3. Si el email ya está registrado con password, las cuentas se vinculan automáticamente (account linking)
4. Si es un email nuevo, se crea cuenta y queda "Verificado" (Google verifica el email)
5. Usuario accede al dashboard

### UC-03: Login con Passkey
1. Usuario selecciona "Iniciar sesión con Passkey"
2. Browser/sistema operativo muestra diálogo de autenticación biométrica
3. Supabase Auth verifica la credencial WebAuthn
4. Usuario accede al dashboard

### UC-04: Account Linking — Resilience
1. Usuario se registró con email/password
2. Posteriormente intenta login con Google usando el mismo email
3. Supabase detecta el email coincidente y vincula el proveedor Google a la cuenta existente
4. Usuario mantiene su perfil, datos y configuraciones sin cambios
5. En adelante puede usar email/password o Google para iniciar sesión

### UC-05: Gestión de Seguridad del Perfil
1. Usuario navega a Configuración de Seguridad
2. Ve sus métodos de autenticación vinculados (email, Google, passkeys)
3. Puede vincular nuevos métodos o desvincular existentes (mínimo uno activo)
4. Puede habilitar/deshabilitar MFA (TOTP)
5. Puede registrar/eliminar Passkeys

### UC-06: Recuperación de Contraseña
1. Usuario hace click en "Olvidé mi contraseña"
2. Ingresa su email
3. Recibe email con link temporal de reset (Supabase Auth)
4. El link expira tras un período definido
5. Usuario establece nueva contraseña
6. Si tenía MFA habilitado, puede requerir re-autenticación

### UC-07: Administración (Nivel Administrador)
1. Administrador accede al panel de administración
2. Middleware/Supabase verifica nivel de administrador server-side
3. Administrador gestiona usuarios, configuraciones y datos del sistema
4. Todas las acciones administrativas son auditadas

### UC-08: Notificaciones
1. Usuario configura preferencias de notificación (email y push)
2. Sistema envía notificaciones según preferencias
3. Usuario puede visualizar historial de notificaciones
4. Notificaciones push respetan la suscripción a dispositivos del usuario

---

## 4. Restricciones y Decisiones Técnicas

### Decisiones Fijas (Stack Preconfigurado)
- Framework: Next.js 16 App Router (no Pages Router)
- Autenticación: Supabase Auth (email/password, Google OAuth, MFA, Passkeys, account linking)
- Base de datos: Supabase PostgreSQL
- ORM: Prisma (conectado al PostgreSQL de Supabase)
- Estilos: Tailwind CSS v4 (CSS-first, sin `tailwind.config.*`)
- Componentes: shadcn/ui vía CLI
- Icons: lucide-react
- Lógica de servidor: Server Actions
- Package manager: pnpm
- Deployment: Vercel (app), Supabase (DB + Auth)

### Decisiones Tomadas durante Requirements Analysis
- Autenticación delegada a Supabase Auth (no implementar auth propia)
- Niveles de usuario: No verificado, Verificado, Administrador (no RBAC completo)
- MFA y Passkeys son opcionales para todos los niveles, incluyendo administradores
- Account linking/resilience: Supabase gestiona la fusión de cuentas por email
- Jobs programados: Pendiente de definición funcional
- **Email transaccional (refine 2026-06-11)**: Resend como Custom SMTP de Supabase; "solo lo necesario para el stack" → sin SDK propio, plantillas de auth versionadas en el repo; emails de negocio en backlog (ver FR-EMAIL-01)
- **Web Push (refine 2026-06-11)**: Unit 10 usará Web Push estándar + VAPID como baseline gratuito; OneSignal queda como alternativa futura mediante adapter si el producto requiere dashboard, campañas, analytics o mobile push nativo.

### Decisiones Pendientes
- ~~Proveedor de email transaccional~~ → **resuelto (refine 2026-06-11)**: Resend como Custom SMTP de Supabase para auth; emails de negocio (SDK Resend) en backlog (FR-EMAIL-01)
- ~~Proveedor de push notifications~~ → **resuelto para MVP (refine 2026-06-11)**: Web Push estándar + VAPID auto-gestionado; proveedor externo gestionado queda como decisión futura si escala/operación lo justifica.
- Estrategia de crons (si son necesarios): Supabase pg_cron, Edge Functions, o servicio externo
- Esquema de base de datos específico del dominio del SaaS
- Dominio de negocio específico del SaaS (a definir en User Stories / Application Design)

### Notas sobre Supabase + Prisma
- Prisma se conecta al PostgreSQL de Supabase usando la connection string directa
- Las migraciones de schema se gestionan con Prisma Migrate
- Supabase Auth crea su propia tabla `auth.users`; la tabla pública de perfiles se sincroniza via triggers
- Row Level Security (RLS) de Supabase complementa la autorización a nivel de aplicación
- La `service_role` key de Supabase solo se usa en Server Actions (nunca en el cliente)
- La `anon` key se usa en el cliente con RLS policies

---

## 5. Criterios de Aceptación del MVP

### Debe Tener (MVP)
- [ ] Registro con email/password (Supabase Auth)
- [ ] Registro/login con Google (Supabase Auth OAuth)
- [ ] Verificación de email
- [ ] Recuperación de contraseña
- [ ] Account linking/resilience (email + Google sin duplicados)
- [ ] Niveles de usuario: No verificado, Verificado, Administrador
- [ ] Autorización por nivel con deny-by-default + RLS
- [ ] Passkeys como opción de login
- [ ] MFA (TOTP) como opción para todos los niveles
- [ ] Gestión de perfil (nombre, avatar, preferencias)
- [ ] Gestión de métodos de autenticación vinculados
- [ ] Notificaciones por email transaccional (verificación, reset, cambio de email) vía Supabase + Resend SMTP; plantillas versionadas en `supabase/templates/` (ver FR-EMAIL-01)
- [ ] Seguridad: todas las reglas SECURITY applicables implementadas
- [ ] HTTP security headers configurados (Vercel middleware)
- [ ] Input validation en todos los endpoints (Zod/schemas)
- [ ] Error handling robusto sin exponer detalles internos
- [ ] Logging estructurado con correlation ID
- [ ] Row Level Security en Supabase para tablas de negocio
- [ ] Deploy en Vercel + Supabase

### Debería Tener (Post-MVP temprano)
- [ ] Design System multi-tema + mejora de UI (ver FR-DS-01) — añadido vía `/aidlc-refine` (Unit 8)
- [ ] Notificaciones web push configurables (ver FR-PUSH-01 / Unit 10) — añadido vía cambio post-construction (2026-06-11)
- [ ] Integraciones con APIs de terceros
- [ ] Jobs programados (si la fase funcional los requiere)
- [ ] Rate limiting en endpoints públicos
- [ ] Monitoring dashboard y alertas de seguridad (Vercel + Supabase logs)

### Podría Tener (Iteraciones futuras)
- [ ] Más proveedores de OAuth (GitHub, Apple, etc.)
- [ ] Auditoría avanzada de cambios
- [ ] Dashboard analítico
- [ ] API pública para integraciones de terceros

---

## FR-DS-01: Design System y Mejora de UI (Post-construcción — Unit 8)

Añadido vía `/aidlc-refine` tras completar la construcción. Cross-cutting: no
altera el comportamiento de las Units 1–7, solo su presentación.

- **FR-DS-01.1 — Arquitectura de tokens**: tokens en 3 capas (primitiva →
  semántica → componente) en `src/app/globals.css`, sobre el `@theme inline` y
  las variables CSS ya existentes. Los componentes siguen consumiendo tokens
  semánticos (`bg-primary`, etc.) sin reescritura.
- **FR-DS-01.2 — Dos ejes de tema ortogonales**: marca/personalidad
  (`data-theme`: `deportivo` por defecto | `moderno` | `premium`) y esquema de
  color (`.dark`: light | dark). Las 6 combinaciones deben ser válidas.
- **FR-DS-01.3 — Identidad por defecto "deportiva/enérgica"**: paleta vibrante
  y tipografía display acordes al dominio de fútbol, conservando Geist como body.
- **FR-DS-01.4 — Selección de marca en runtime**: contexto + `data-theme` en
  `<html>` persistido en localStorage, con script anti-FOUC, junto al toggle
  light/dark de `next-themes` ya existente.
- **FR-DS-01.5 — Accesibilidad**: contraste AA en todas las combinaciones,
  foco visible, controles de tema/marca navegables por teclado.
- **FR-DS-01.6 — Sin regresión**: mantener 0 errores TS, Biome/ESLint limpios,
  build OK y los 111 tests verdes.

---

## FR-EMAIL-01: Emails Transaccionales (Post-construcción — Unit 9)

Añadido vía `/aidlc-refine` (2026-06-11). Concreta FR-03. Cross-cutting: no
altera el comportamiento de las Units 1–8; formaliza el canal de correo y
versiona las plantillas de auth en el repo.

### Arquitectura del canal
- **FR-EMAIL-01.1 — Emisor**: Supabase Auth con **Resend configurado como Custom
  SMTP**. La app NO incorpora un mailer propio ni dependencias npm de email
  ("solo lo necesario para el stack"). El código que dispara los correos ya
  existe (Supabase SDK en las server actions de auth).
- **FR-EMAIL-01.2 — Plantillas "en otro lado, código aquí"**: el HTML fuente se
  versiona en `supabase/templates/*.html` y se referencia desde
  `supabase/config.toml` con `[auth.email.template.<tipo>] → content_path` y
  `subject`. Supabase las hospeda y envía; la fuente vive en el repo y entra en
  code review. HTML autocontenido (estilos inline) y alineado a la identidad de
  marca de Unit 8.
- **FR-EMAIL-01.3 — Entornos**: dev usa el sandbox `resend.dev`. Producción
  requiere un **dominio propio verificado en Resend** (DKIM + SPF + DMARC en
  DNS) antes de salir del sandbox — prerequisito de la fase de Operaciones, no
  bloquea el desarrollo.
- **FR-EMAIL-01.4 — Sin regresión**: no cambia runtime de la app (los
  `redirectTo`/`emailRedirectTo` siguen usando `NEXT_PUBLIC_SITE_URL`); mantener
  build, tests, Biome y ESLint en verde.

### Catálogo de correos del proyecto

**Grupo A — Auth / transaccional (EN ALCANCE; Supabase + Resend SMTP):**

| # | Email | Disparador (código) | Estado |
|---|-------|---------------------|--------|
| 1 | Confirmar registro / verificar email | `auth/actions/sign-up.ts` (`signUp`) | Activo |
| 2 | Restablecer contraseña | `auth/actions/forgot-password.ts` (`resetPasswordForEmail`) | Activo |
| 3 | Confirmar cambio de email (dir. antigua + nueva) | `auth/actions/change-email.ts` (`updateUser({email})`) | Activo |

> Supabase gestiona además plantillas de *Magic Link*, *Invite* y
> *Reauthentication*; la app no las usa hoy → quedan en su default.

**Grupo B — Negocio / notificación (PROPUESTA — backlog; requiere SDK Resend):**

| # | Email | Punto de envío natural |
|---|-------|------------------------|
| 4 | Bienvenida (post-verificación / fin de onboarding) | onboarding |
| 5 | Invitación a un pool (enlace por token) | `pools/services/invite-token.ts`, `join-pool-by-token.ts` |
| 6 | Alguien se unió a tu pool (al owner) | `pools/actions/join-pool-by-token.ts`, `join-public-pool.ts` |
| 7 | Te expulsaron de un pool (al miembro) | `pools/actions/kick-member.ts` |
| 8 | Recordatorio "el partido empieza pronto, completa tu predicción" | `predictions/services/lock.ts` |
| 9 | Resumen de jornada: predicciones puntuadas + puntos | `scoring-rankings/services/score-sweeper.ts` |
| 10 | Cambio de ranking / nuevo líder en tu pool | `scoring-rankings/services/ranking.ts` |
| 11 | Recálculo por override de resultado (admin) | `admin/actions/force-result.ts`, `revert-override.ts` |
| 12 | [Ops] Alerta de fallo de sincronización (a admins) | `competition/services/sync-orchestrator.ts` |

> Nota técnica (backlog): los correos 8–10 y 12 no tienen un request HTTP de
> usuario asociado (corren en sweeper/cron), así que su envío debe diseñarse
> desde un job, no inline.

---

## FR-PUSH-01: Web Push Notifications Configurables (Post-construcción — Unit 10)

Añadido como cambio post-construction tras completar Units 1–8 y mientras Unit 9
queda reservada para emails transaccionales. Es una unidad aditiva: consume
eventos de Units 3, 4 y 6, pero no reabre reglas ya aprobadas.

- **FR-PUSH-01.1 — Opt-in explícito**: el usuario debe activar web push desde
  configuración. Sin permiso del navegador o sin suscripción activa no se envía
  push.
- **FR-PUSH-01.2 — Preferencias por evento**: el usuario puede activar/desactivar
  individualmente: inicio de partido, final de partido, invitación a liga/pool,
  subida en ranking global y gol anotado.
- **FR-PUSH-01.3 — Suscripciones por dispositivo**: una cuenta puede tener varias
  suscripciones Web Push; endpoints inválidos se desactivan tras fallo `410/404`.
- **FR-PUSH-01.4 — Eventos autorizados**: las notificaciones solo se envían a
  usuarios que tienen derecho a conocer el evento. No se filtran datos de pools
  privados, predicciones o ranking a usuarios no autorizados.
- **FR-PUSH-01.4a — Invitaciones dirigidas**: Unit 10 debe añadir invitaciones a
  liga/pool dirigidas por nickname o email para poder notificar al destinatario.
  El link/código actual se mantiene y no genera push por sí mismo al no tener
  receptor conocido.
- **FR-PUSH-01.5 — Bajo coste MVP**: baseline con Web Push estándar + VAPID +
  tabla de suscripciones en Supabase + job/server action de envío. No depende de
  OneSignal para el MVP.
- **FR-PUSH-01.6 — Adapter futuro**: definir una interfaz de proveedor para poder
  migrar a OneSignal/FCM/Novu/self-hosted si se requieren campañas, analytics,
  mobile push nativo o segmentación avanzada.

---

## FR-SHELL-01: App Shell y Navegación Global (Post-construcción — Unit 11)

**Origen**: refine 2026-06-12. Hoy no existe chrome/navbar global: el root layout
solo monta providers (Auth/Theme/Brand) y el Toaster, y los toggles de tema/marca
solo se montan en `/` y `/rules`. En rutas autenticadas (`/matches`, `/pools`,
`/settings/*`) y en admin (`/admin/*`) el usuario no tiene indicador de sesión,
acceso a perfil, cambio de tema, ni forma de cerrar sesión.

### Alcance
- **FR-SHELL-01.1 — Chrome global autenticado**: un layout/header compartido se
  monta en las rutas autenticadas y en admin. **No** se monta en el route-group
  `(auth)` ni en `/onboarding/*` (flujos sin chrome). La sesión sigue protegida
  por `src/proxy.ts` (no se modifica).
- **FR-SHELL-01.2 — Indicador de sesión**: el header muestra que la sesión está
  iniciada mediante avatar + nickname (`getProfile()` / `getDisplayNickname()`).
- **FR-SHELL-01.3 — Menú de usuario**: avatar+nickname abre un menú con enlaces a
  Perfil (`/settings/profile`), Seguridad (`/settings/security`), **Admin**
  (`/admin`, visible solo si `verificationStatus === "ADMIN"`) y **Cerrar sesión**
  (server action `signOut()` existente).
- **FR-SHELL-01.4 — Navegación primaria**: marca/logo → `/matches`, y enlaces a
  Partidos (`/matches`), Ligas (`/pools`), Reglas (`/rules`), con estado activo
  (`aria-current`).
- **FR-SHELL-01.5 — Control de tema en la app**: `ThemeToggle` (light/dark/system)
  y `BrandToggle` (deportivo/moderno/premium) accesibles desde el header dentro de
  la app, reutilizando los componentes existentes (sin duplicar lógica).
- **FR-SHELL-01.6 — Contexto admin**: en `/admin/*` el chrome refleja el contexto
  "Admin" y ofrece regreso a la app; el gate de admin (`notFound()` si no es
  ADMIN) se mantiene.
- **FR-SHELL-01.7 — Responsive y accesibilidad**: la navegación colapsa en móvil
  (menú/sheet); navegación por teclado, foco visible, labels y `aria-current`;
  contraste AA en las 6 combinaciones de tema (consistente con FR-DS-01).
- **FR-SHELL-01.8 — Sin regresión**: copy en español; mantener 0 errores TS,
  Biome/ESLint limpios, tests verdes y build OK. Cambio UI-only, sin schema/API.

---

## 6. Dominio del SaaS — Pendiente de Definición

Las respuestas indican que el usuario tiene **funcionalidades principales bastante claras** para la infraestructura transversal (auth, seguridad, integraciones) pero el **dominio específico del SaaS** aún no ha sido descrito en detalle.

Los siguientes pasos de ideación (User Stories, Application Design) deberán profundizar en:
- El dominio de negocio específico del SaaS
- Los flujos principales del producto más allá de auth y gestión de perfiles
- El modelo de datos de negocio específico
- Las pantallas y vistas clave del producto
