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

## FR-REFINE-15: Refine de Landing, Reglas, Perfil, Auth & Calculadora (Post-construcción — Unit 15)

**Origen**: refine 2026-06-13 tras uso en vivo. Lote de bugs/ajustes que en su
mayoría son **regresiones o extensiones** de Units ya entregadas (11 App Shell,
12 Auth/Perfil, 14 Ranking/Reglas/Calculadora), más mejoras nuevas (validación
cliente de formularios, enforcement de confirmación de email, limpieza del
landing). **No reinicia** ninguna etapa aprobada. Cubre la **Épica 14**.

### Alcance
- **FR-REFINE-15.1 — Landing sin ligas públicas**: se elimina la sección de
  "Ligas públicas" (`PoolPreview`) del landing.
- **FR-REFINE-15.2 — Landing sin enlaces redundantes**: se eliminan el enlace
  "Explorar ligas públicas" y el botón de "Iniciar sesión" duplicado de los CTAs
  secundarios.
- **FR-REFINE-15.3 — Landing consciente de sesión** (extiende FR-REFINE-12.8): el
  header del landing muestra el menú de usuario (avatar+nickname) cuando hay
  sesión, y los enlaces Iniciar sesión / Crear cuenta cuando no la hay
  (reutiliza `getProfile()` / `UserMenu`).
- **FR-REFINE-15.4 — Consistencia de toggles**: los selectores de tema/marca del
  landing se alinean a la derecha igual que el header autenticado (`AppHeader`).
- **FR-REFINE-15.5 — Reglas coherentes con ranking global** (coherencia con
  Unit 14): se elimina el callout "El ranking es por liga, no global…" porque ya
  existe ranking por liga **y** global.
- **FR-REFINE-15.6 — Reglas sin toggles duplicados** (regresión Unit 11): se
  eliminan los toggles de tema/marca del cuerpo de `/rules`; ya los provee
  `AppHeader`.
- **FR-REFINE-15.7 — Calculadora de penales por predicción/real** (extiende
  FR-REFINE-14.4/14.5): la tanda de penales se captura en dos columnas
  "Tu predicción" y "Resultado real", cada una derivando su ganador; el bonus
  aplica solo si coinciden (reutiliza `derivePenaltyWinner`/`computeScore`).
- **FR-REFINE-15.8 — Avatares por defecto resilientes** (endurece FR-REFINE-12.6):
  si una imagen remota del set por defecto falla (Storage no sembrado / proyecto
  equivocado), el grid degrada a los SVG locales empaquetados (`onError`).
- **FR-REFINE-15.9 — Correo actual visible** (extiende FR-REFINE-12.4): la sección
  de cambio de email del Perfil muestra el correo actual (solo lectura).
- **FR-REFINE-15.10 — Cambio de email aplica de verdad**: la confirmación de cambio
  de email usa el flujo robusto `token_hash`/`verifyOtp` (`/auth/confirm`), no
  PKCE. Ver memoria `email-confirm-pkce-fragile`. ~~Con "Secure email change"
  activo en Supabase, el cambio requiere confirmar desde el correo actual **y**
  el nuevo~~ → **Reemplazado por FR-REFINE-19.1**: ahora se confirma con un único
  enlace enviado solo al correo nuevo.
- **FR-REFINE-15.11 — Validación cliente en login**: el formulario de inicio de
  sesión valida en cliente formato de email y regla de contraseña con
  react-hook-form + zodResolver (reutiliza `SignInSchema`); el server action
  sigue revalidando.
- **FR-REFINE-15.12 — Validación cliente en registro**: el formulario de registro
  valida en cliente email, contraseña y coincidencia de confirmación
  (`SignUpSchema` + zodResolver).
- **FR-REFINE-15.13 — Gate de onboarding robusto** (corrige regresión de
  FR-REFINE-12.7): el gate usa un flag explícito `profiles.onboarding_completed`
  (migración Prisma + backfill) en vez de inferir por `nickname_base` nulo con
  fail-open; falla **cerrado** (lectura fallida → onboarding, sin loop).
- **FR-REFINE-15.14 — Confirmación de email obligatoria** (NFR-01 seguridad): el
  gate (`src/proxy.ts`) bloquea sesiones con `email_confirmed_at` nulo y las
  envía a `/verify-email`. Requiere "Confirm email" activo en Supabase
  (documentado en `supabase/config.toml` + runbook de Operations).

### NFR / Infra
- **NFR**: solo FR-REFINE-15.14 tiene implicación de seguridad (enforcement de
  confirmación en el gate). El resto es UI/flujo.
- **Infra**: FR-REFINE-15.13 añade columna `profiles.onboarding_completed`
  (migración versionada `20260613120000_unit15_onboarding_flag`, requiere
  `prisma migrate deploy` + backfill en prod — CF-6/Operations).

---

## FR-REFINE-16: Onboarding obligatorio (defensa en profundidad) y orden del fixture (Post-construcción — Unit 16)

> Refine post-construcción (2026-06-13). Dos defectos reportados en uso en vivo.
> Aditivo; **no reinicia** ninguna etapa aprobada. Cubre la **Épica 15**.

- **FR-REFINE-16.1 — Onboarding obligatorio, aplicado en servidor** (endurece
  FR-REFINE-15.13): un usuario que no ha completado el onboarding (sin nickname)
  **no debe** poder entrar a `/matches` ni crear ligas, invitar o predecir. El
  gate de `src/proxy.ts` por sí solo es insuficiente: depende de que
  `onboarding_completed` sea legible vía la API de datos (PostgREST) y **falla
  ABIERTO** ante error de lectura (decisión de resiliencia de §8.2, necesaria para
  no convertir una caída de PostgREST en lockout). Por eso se añade **defensa en
  profundidad** por la ruta fiable (Prisma / Postgres directo):
  (a) el layout del route-group `(app)` (`src/app/(app)/layout.tsx`) re-verifica
  `onboardingCompleted` con `getProfile()` y redirige a `/onboarding/profile` si
  está incompleto — ninguna página de la app se renderiza sin onboarding, aunque
  el middleware se evada; (b) las server actions mutadoras `createPool`,
  `createDirectedInvite` y `savePrediction` exigen `getOnboardedUserId()` (nuevo
  helper en `features/profile/queries.ts`, lee el flag por Prisma) y devuelven un
  error de dominio ("Completa tu perfil para …") si no está completo. El
  middleware se mantiene como primera línea (fail-open); estas capas son la
  garantía dura.
- **FR-REFINE-16.2 — Partidos por orden de ocurrencia (agrupados por día)**: en
  `/matches` los partidos deben listarse en **orden cronológico de inicio**, no
  agrupados por fase (hoy se muestran los 12 grupos + 6 rondas en `displayOrder`,
  de modo que todos los de Grupo A preceden a los de Grupo B aunque ocurran en
  fechas intercaladas). Decisión de presentación (AskUserQuestion): **lista
  agrupada por día** con encabezado de fecha (p. ej. "Jueves, 11 de junio") y,
  dentro de cada día, orden por hora de inicio; cada partido conserva una etiqueta
  de su grupo/ronda. Los partidos sin `kickoffAt` (eliminatorias por resolver) se
  agrupan al final bajo "Fecha por confirmar". El agrupamiento por día usa **UTC**
  para un orden determinista y coherente con el render por tarjeta.

- **FR-REFINE-16.3 — Chrome del onboarding (cerrar sesión + tema)**: la pantalla
  de onboarding debe ofrecer **cerrar sesión** y **cambiar tema/marca**. No se
  reutiliza el `AppHeader` completo: éste lleva `PrimaryNav` y un `UserMenu` que
  enlazan a rutas de la app (`/matches`, `/settings`, `/admin`) de las que un
  usuario sin onboarding está gateado (lo rebotarían de vuelta — ver 16.1). Se
  añade un **header mínimo** `OnboardingHeader` con solo `BrandToggle` +
  `ThemeToggle` + botón de cerrar sesión (reutiliza la server action `signOut`).
- **FR-REFINE-16.4 — Navegación al paso anterior**: dentro del flujo de onboarding
  (nickname → avatar → reglas → passkey) el usuario debe poder **volver al paso
  anterior cuando aplique** (en todos menos el primero). Botón "Atrás" centralizado
  en `OnboardingClient` (estado `step`), sin perder datos ya persistidos.
- **FR-REFINE-16.5 — Cooldown de nickname no aplica durante onboarding** (corrige
  interacción de 16.4 con FR-REFINE-12.5): `setNickname` sella `nicknameUpdatedAt`,
  así que volver al paso de nickname (16.4) y re-enviar disparaba el cooldown de 30
  días (`rate_limited`) y **bloqueaba** terminar el onboarding. El cooldown debe
  aplicar **solo tras completar el onboarding** (`onboardingCompleted = true`);
  durante el onboarding el cambio de nickname siempre se permite.
- **FR-REFINE-16.8 — Confirmación de cuenta sin falso negativo**: al hacer clic en
  el enlace de confirmación de cuenta, el usuario veía en `/sign-in` el mensaje "No
  pudimos completar la confirmación…" **aunque el correo SÍ quedaba confirmado**
  (al iniciar sesión pasaba al onboarding). Causa: con la plantilla PKCE por defecto
  el enlace cae en `/auth/callback?code=…`; Supabase **confirma el correo antes** de
  redirigir, pero el `exchangeCodeForSession` falla cuando el enlace se abre en otro
  dispositivo/navegador o lo pre-carga un escáner de correo (falta el
  `code-verifier`), produciendo `exchange_failed` → falso negativo. Fix de código:
  `sign-up` marca el flujo (`flow=email_confirm` en `emailRedirectTo`) y
  `/auth/callback`, ante un fallo de intercambio **en ese flujo**, redirige a
  `/sign-in?confirmed=1` con un mensaje **correcto y no alarmante** ("Tu correo fue
  confirmado. Inicia sesión para continuar."), en vez del error. **Fix de raíz
  (Operations, CF-7)**: usar la plantilla **token_hash** (`/auth/confirm` +
  `verifyOtp`, ya implementada y versionada en `supabase/templates/`), que no
  depende de PKCE y elimina el falso negativo de origen; pendiente de desplegar en
  el proyecto Supabase de prod.
- **FR-REFINE-16.7 — Toggles de tema en las pantallas de auth**: en la pantalla de
  sign-in (y resto de pantallas no autenticadas) el usuario debe poder cambiar
  tema/marca. Se añaden `BrandToggle` + `ThemeToggle` (arriba a la derecha) en el
  layout compartido `(auth)/layout.tsx` — cubre sign-in, sign-up, forgot/reset
  password y verify-email. Sin cerrar sesión (no hay sesión). Reutiliza los mismos
  toggles que `AppHeader`/`OnboardingHeader`.
- **FR-REFINE-16.6 — Tema de marca por cookie (sin script inline)** (resuelve CF-8):
  el bootstrap anti-FOUC del eje de marca deja de ser un `<script
  dangerouslySetInnerHTML>` y pasa a **render server-side desde la cookie
  `brand-theme`** (`layout.tsx` lee `cookies()` → `<html data-theme>`; `setBrand`
  escribe la cookie). Elimina el warning de runtime de React 19/Next 16
  ("Encountered a script tag while rendering React component") y la excepción de
  CSP de CF-8. Coste aceptado: el layout pasa a dinámico (rutas de auth antes
  estáticas → dinámicas).

### NFR / Infra (Unit 16)
- **NFR**: FR-REFINE-16.1 es de seguridad/integridad (control de acceso por
  función — alinea con SECURITY-08: deny-by-default, defensa en profundidad). Sin
  nuevos NFR formales. 16.3/16.4 son UI.
- **Infra**: ninguna. Sin cambios de schema ni migraciones (la columna
  `onboarding_completed` ya existe desde Unit 15).

---

## FR-REFINE-17: Reglas, Avatar Upload y Nickname Consistency (Post-construcción — Unit 17)

> Refine post-construcción (2026-06-14). Aditivo; **no reinicia** ninguna etapa
> aprobada. Cubre la **Épica 16**.

- **FR-REFINE-17.1 — Reglas con ranking por liga y global** (corrige/refuerza
  FR-REFINE-15.5): la sección de reglas no debe decir que el ranking es solo por
  liga. Debe explicar explícitamente que hay **ranking por liga** y **ranking
  global**: el usuario compite contra su liga y también contra todos los usuarios.
- **FR-REFINE-17.2 — Upload de avatar sin colisión de path** (corrige Perfil / Unit
  15): al subir una imagen custom, `createSignedUploadUrl` no debe depender de un
  path fijo (`custom/{userId}/avatar.{ext}`) que puede colisionar en Supabase
  Storage y devolver "Failed to create upload URL". Cada intento de upload debe
  usar un path único por usuario (por ejemplo `custom/{userId}/{uuid}.{ext}`), con
  error de usuario estable y logging server-side sin secretos.
- **FR-REFINE-17.3 — Cooldown de nickname tras oportunidad de gracia** (corrige
  FR-REFINE-16.5 / FR-REFINE-12.5): el rate limit de 30 días aplica después de que
  el usuario consume **una oportunidad de gracia post-onboarding**, no después de la
  primera asignación. Secuencia esperada: (1) onboarding asigna el primer nickname;
  (2) el primer cambio posterior al onboarding se permite sin esperar 30 días;
  (3) cualquier intento posterior dentro de la ventana devuelve `rate_limited`. La
  implementación debe poder distinguir si la gracia post-onboarding ya fue
  consumida; `nicknameUpdatedAt` por sí solo no basta porque también se escribe en
  la asignación inicial. Implementación: `profiles.nickname_change_count` cuenta la
  asignación inicial como 1, el cambio de gracia como 2 y activa el cooldown desde
  intentos posteriores.
- **FR-REFINE-17.4 — Nickname case-insensitive en disponibilidad, asignación y
  búsqueda**: `Pepe#1234` y `pepe#1234` representan el mismo nickname lógico. La
  disponibilidad, la asignación de discriminator y las búsquedas por nickname deben
  comparar la base sin distinguir mayúsculas/minúsculas. El display puede conservar
  el casing escrito por el usuario.

### NFR / Infra (Unit 17)
- **NFR**: FR-REFINE-17.4 refuerza integridad de identidad y prevención de spoofing
  visual. FR-REFINE-17.2 mantiene errores externos genéricos para no filtrar
  detalles de Supabase Storage.
- **Infra**: FR-REFINE-17.3 añade migración Prisma
  `20260614123000_nickname_grace_count` (`profiles.nickname_change_count` +
  backfill conservador); FR-REFINE-17.4 mantiene la unicidad case-insensitive en
  lógica de aplicación. Si en el futuro se requiere garantía fuerte a nivel DB, se
  evaluará índice funcional `lower(nickname_base), nickname_discriminator`.

---

## FR-REFINE-18: Copy del CTA principal del landing (Post-construcción — Unit 18)

> Refine post-construcción (2026-06-14). Aditivo y documental sobre el landing;
> **no reinicia** ninguna etapa aprobada. Cubre la **Épica 17**.

- **FR-REFINE-18.1 — CTA principal del landing**: el botón principal del landing que
  decía "Crea mi Liga" debe decir **"Entra a Jugar"**. El destino/acción del botón
  no cambia: inicia el flujo de registro/login o entrada al producto según el estado
  de sesión existente. Este ajuste reemplaza cualquier copy equivalente anterior del
  CTA principal del landing, incluido `Crear mi quiniela` en el contrato base.

### NFR / Infra (Unit 18)
- **NFR**: sin nuevos NFR; es un cambio de copy.
- **Infra**: sin cambios de schema, migraciones, servicios ni rutas.

---

## FR-REFINE-19: Confirmación única del cambio de email (Post-construcción — Unit 19)

> Refine post-construcción (2026-06-14). Aditivo sobre el flujo de cambio de email
> del Perfil (Units 12/15); **no reinicia** ninguna etapa aprobada. Cubre la
> **Épica 18**. **Reemplaza** la parte de doble confirmación de FR-REFINE-15.10.

- **FR-REFINE-19.1 — Solo se confirma el correo nuevo**: al cambiar el email en el
  Perfil, el sistema deja de pedir confirmación desde el correo **antiguo** y el
  **nuevo**. Ahora se envía **un único enlace de confirmación, únicamente al correo
  nuevo**, y la **notificación del cambio llega solo al correo nuevo** (el antiguo
  no recibe correo ni debe confirmar). El cambio se aplica cuando se confirma ese
  único enlace. Implementación: `secure_email_change_enabled = false` en Supabase
  (`supabase/config.toml` + toggle del dashboard en prod). Se conserva el flujo
  robusto `token_hash`/`verifyOtp` (`/auth/confirm`) de FR-REFINE-15.10. El copy de
  Perfil (`profile.emailDescription`/`emailSuccess`) se actualiza para describir el
  flujo de confirmación única.

### NFR / Infra (Unit 19)
- **NFR (seguridad)**: desactivar Secure email change reduce la protección contra
  apropiación de cuenta (un atacante con sesión activa podría cambiar el email sin
  confirmar desde la dirección antigua). Tradeoff **aceptado explícitamente por el
  usuario** y registrado como **CF-9**. Security Baseline sigue habilitado; el resto
  de controles no cambia.
- **Infra**: sin schema, migraciones, servicios ni rutas nuevas. Solo un toggle de
  configuración de Supabase Auth (debe replicarse en el dashboard de prod).

---

## FR-REFINE-20: Passkeys con la API nativa de Supabase (Post-construcción — Unit 20)

> Refine post-construcción (2026-06-14). Bug en vivo del onboarding analizado como
> Unit 20; aditivo sobre el registro/login con passkey (Unit 1 Foundation / Unit 2
> Onboarding); **no reinicia** ninguna etapa aprobada. Cubre la **Épica 19**.

- **FR-REFINE-20.1 — Registrar/usar passkeys por la API de Passkeys (beta)**: al
  registrar un passkey en el onboarding, el sistema fallaba con
  **"MFA enroll is disabled for WebAuthn"**. Causa raíz: el código usaba la ruta de
  **factor MFA-WebAuthn** (`supabase.auth.mfa.enroll({ factorType: "webauthn" })` +
  `challenge`/`verify` con `@simplewebauthn/browser`), cuyo flag de enroll está
  deshabilitado, mientras que en el proyecto Supabase lo que está habilitado es
  **Passkeys (beta)** — un sistema **distinto** del factor MFA-WebAuthn. El registro
  y el login de passkeys pasan a usar la **API nativa de Passkeys**:
  `supabase.auth.registerPasskey()` y `supabase.auth.signInWithPasskey()`, habilitada
  con `auth.experimental.passkey = true` en el cliente de navegador. Estos métodos
  ejecutan la ceremonia WebAuthn completa (challenge → `navigator.credentials` →
  verify) contra el Relying Party configurado en el dashboard, eliminando el ciclo
  MFA manual y la dependencia `@simplewebauthn/browser`. El login con passkey usa
  **credenciales descubribles** (no requiere email ni listar factores previos).

### NFR / Infra (Unit 20)
- **NFR (compatibilidad)**: la API de Passkeys requiere `@supabase/supabase-js`
  **≥ 2.105.0** (el proyecto tiene 2.108.1). Es **experimental** (`auth.experimental`),
  por lo que su superficie puede cambiar; el constraint de adopción se registra como
  **CF-10**.
- **NFR (seguridad)**: los passkeys quedan ligados criptográficamente al **Relying
  Party ID**; debe ser el **dominio pelado** del origen (`localhost` en dev, el
  dominio real en prod), no el display name. Cambiar el RP ID invalida los passkeys
  existentes. Security Baseline sigue habilitado.
- **Infra**: sin schema, migraciones ni rutas nuevas. **Pendiente Operations**:
  confirmar en el dashboard de Supabase de prod que **"Enable Passkey authentication"**
  está ON con **RP ID = dominio real** y los **origins** correctos.

---

## FR-REFINE-21: Eliminación real de la cuenta (purga del `auth.users`) (Post-construcción — Unit 21)

> Refine post-construcción (2026-06-14). Bug en `settings/security` analizado como
> Unit 21; **no reinicia** ninguna etapa aprobada. Cubre la **Épica 20**. Es un bug de
> **conformidad**: el diseño ya aprobado de Unit 1 (**WF-11** y **RULE-SEC-03**) ya
> prescribía el comportamiento correcto; la implementación había **divergido**.

- **FR-REFINE-21.1 — Eliminar cuenta debe eliminar de verdad la cuenta**: en
  `settings/security → Eliminar cuenta`, tras confirmar, la cuenta **no se eliminaba
  realmente**: el usuario podía volver a iniciar sesión y el email seguía ocupado.
  Causa raíz: `delete-account.ts` solo transfería los pools (BL-9), hacía el
  **soft-delete** del perfil (`Profile.deleted_at`) y un `signOut()` de la sesión
  local, pero **omitía el paso 2 de WF-11 / RULE-SEC-03**: el *hard-delete* del
  registro de `auth.users` con la **Admin API**. El flujo pasa a llamar
  `createAdminClient().auth.admin.deleteUser(userId)` tras el soft-delete; esto
  invalida todas las sesiones y libera el email. Se **conserva** el modelo híbrido ya
  documentado (soft-delete del `Profile` para retener historial de predicciones/scores;
  no hay FK de `profiles.id` a `auth.users`, así que la purga del auth **no** cascadea
  el perfil). Si la purga falla, la acción devuelve error y **no** redirige.

### NFR / Infra (Unit 21)
- **NFR (seguridad / privacidad)**: la purga del `auth.users` materializa el "derecho
  al borrado" del usuario de autenticación (login imposible, sesiones invalidadas,
  email liberado) que RULE-SEC-03 ya exigía. Usa el `service_role` solo server-side.
- **Infra**: requiere `SUPABASE_SERVICE_ROLE_KEY` (ya presente desde Unit 12 /
  FR-REFINE-12.3). Sin schema, migraciones ni rutas nuevas. **Pendiente Operations**:
  verificar en prod que el usuario desaparece de `auth.users` y que el email puede
  volver a registrarse.

---

## NFR-PERF-REFINE-22: Recomendaciones de performance (Post-construcción — Unit 22)

> Refine post-construcción (2026-06-14). **Análisis / recomendación**, no una
> implementación aprobada. **No reinicia** ninguna etapa aprobada. Cubre la **Épica 21**.
> Solicitud del usuario: *"Quiero saber qué recomendaciones de performance me das para
> esta aplicación, a veces la noto lenta."* La implementación queda **diferida** hasta
> que el usuario priorice. Análisis completo (anclado a `archivo:línea`) en
> `construction/unit-22-performance-recommendations/performance-analysis.md`.

- **NFR-PERF-REFINE-22.1 — Round-trips de auth por navegación (P0)**: `getUser()` hace
  una llamada de red a GoTrue por invocación y se llama **3 veces en secuencia** por
  carga autenticada (middleware `proxy.ts` → `getProfile` del layout `(app)` →
  `getCurrentUserId` de la page). Objetivo: deduplicar con `cache()` de React y migrar
  la validación a `getClaims()` (verificación local del JWT) donde solo se necesita el
  `id`. Reduce el TTFB en cada navegación.
- **NFR-PERF-REFINE-22.2 — Perfil leído dos veces (P1)**: el flag de onboarding se lee
  vía PostgREST (middleware) **y** vía Prisma (layout). Se conserva la defensa en
  profundidad (fail-open del middleware), pero `getProfile()` debe envolverse en
  `cache()` para no duplicar la query Prisma por render.
- **NFR-PERF-REFINE-22.3 — Fixture sin caché (P1)**: `/matches` es `force-dynamic` y
  recarga toda la competición por visita. Cachear la parte estática (fases/partidos/
  equipos) con `unstable_cache` + tag, invalidada por el sync/override de admin; dejar
  dinámicas solo las predicciones del usuario; quitar el `include: { phase: true }`
  redundante.
- **NFR-PERF-REFINE-22.4 — Rankings sin caché (P2)**: `getGlobalRanking` agrega toda la
  tabla `PredictionScore` sin filtro en cada visita. Cachear con tag e invalidar tras
  cada recálculo de puntajes (global y por pool).
- **NFR-PERF-REFINE-22.5 — Pooling en prod (P2)**: confirmar que `DATABASE_URL` usa el
  **transaction pooler** de Supabase (puerto 6543, `pgbouncer=true`) en producción y que
  `DIRECT_URL` (5432) queda solo para migraciones (**Operations**).
- **NFR-PERF-REFINE-22.6 — Menores (P3)**: `cache()` sobre `isFrozen()`; verificar
  `next/image`/`sizes`; oportunidades de `Promise.all` en lecturas independientes.

> **Nota de alcance**: el esquema ya está bien indexado; el cuello de botella es
> round-trips de red por request y recomputación sin caché, no índices faltantes.

---

## FR-REFINE-23: Unirse a una liga en cualquier momento (Post-construcción — Unit 23)

> Refine post-construcción (2026-06-15). Cambio de regla de negocio. **No reinicia**
> ninguna etapa aprobada. Cubre la **Épica 22**. Solicitud del usuario: *"Cuando una
> competencia empezó un usuario no puede unirse ni ser invitado. Quiero remover esa
> regla. Un usuario puede unirse a un pool/liga privada o pública en cualquier momento."*
> Tras aclarar el concepto de "congelamiento", el usuario **amplió el alcance** para
> levantarlo **también** de salir/expulsar/eliminar (*"Así es, implementar"*).

- **FR-REFINE-23.1 — Unirse tras el inicio de la competición**: se **elimina** la regla
  de congelamiento sobre el **ingreso** a una liga. Un usuario puede unirse a una liga
  **privada o pública** en **cualquier momento**, incluso después de que la competición
  haya comenzado. Aplica tanto al ingreso desde el **directorio público** (`joinPublicPool`,
  BL-2) como por **token/link de invitación** (`joinPoolByToken`, BL-3), que es la vía de
  las **invitaciones dirigidas** por nickname/email de Unit 10 (BR-3.30). Deroga la parte
  de "unir" de **BR-3.8** y **BR-3.15**.
- **FR-REFINE-23.2 — Límites que se conservan**: siguen vigentes el tope de **capacidad**
  (BR-3.7: no se puede unir a una liga llena), la **unicidad** de membresía (BR-3.6), la
  regla de **liga privada solo por token** (BR-3.9) y la **autorización** server-side
  (BR-3.28/BR-3.29: solo el owner expulsa/elimina; el owner no "sale"). Un usuario que se
  une tarde simplemente **no puntúa** los partidos cuyo cierre por kickoff ya pasó (las
  predicciones se bloquean por partido en Unit 5); esto es consecuencia natural, no un bloqueo.
- **FR-REFINE-23.3 — Alcance ampliado: toda la membresía**: el congelamiento se **elimina
  también** para **salir** (BR-3.14), **expulsar** (BR-3.13) y **eliminar** la liga
  (BR-3.17/BR-3.18). **Ninguna** mutación de membresía se congela por el inicio del torneo.
  En consecuencia se **deroga BR-3.19** (el pool ya no está obligado a permanecer vivo
  hasta el final: el owner puede eliminarlo en cualquier momento). El servicio `isFrozen`
  se **conserva** como utilidad ("¿empezó la competición?") pero **no gobierna** ninguna
  mutación; el campo `isFrozen` del DTO de pools se elimina.

### NFR / Infra (Unit 23)
- Sin schema, migraciones ni rutas nuevas. Cambio de regla en los cinco Server Actions de
  membresía (`join-public-pool.ts`, `join-pool-by-token.ts`, `leave-pool.ts`,
  `kick-member.ts`, `delete-pool.ts`), el DTO (`types.ts`/`queries.ts`) y la UI
  (`pool-actions.tsx`, `member-list.tsx`, `pool-card.tsx`, `pools/[id]/page.tsx`).
  Security Baseline intacto (capacidad/unicidad/autorización server-side sin cambios).

---

## FR-I18N-24: Internacionalización, selector de idioma y homologación de copy (Post-construcción — Unit 24)

> Refine post-construcción (2026-06-15). Aditivo y transversal; **no reinicia**
> ninguna etapa aprobada. Cubre la **Épica 23**. Solicitud del usuario: la aplicación
> tiene mezcla de copy en español e inglés; debe poder seleccionarse idioma, con
> español preferido y por defecto, y opción de inglés. Además, debe homologarse la
> experiencia sin eliminar préstamos naturales del inglés usados en español.

- **FR-I18N-24.1 — Idiomas soportados**: la aplicación soporta `es` y `en`, con
  `es` como idioma por defecto. La experiencia inicial usa español salvo que exista
  una preferencia persistida del usuario o una cookie válida; la detección de
  `Accept-Language` puede usarse como fallback inicial, pero nunca desplaza la
  preferencia explícita.
- **FR-I18N-24.2 — Sin prefijo de locale en URL**: se conserva la decisión de Unit 2
  **Opción A**: no se introduce segmento `[locale]` ni rutas `/es/*` o `/en/*` en esta
  unidad. Las URLs existentes permanecen intactas (`/matches`, `/pools`, `/rules`,
  `/settings/*`, `/admin/*`). La selección se resuelve por cookie/perfil, no por ruta.
- **FR-I18N-24.3 — Persistencia cookie + perfil**: la preferencia se guarda en una
  cookie `locale` para SSR sin flash y en `profiles.locale` para sincronizarla entre
  dispositivos. La cookie gobierna el render inmediato; el perfil permite restaurar
  la preferencia cuando el usuario inicia sesión desde otro navegador.
- **FR-I18N-24.4 — Selector de idioma**: el usuario puede cambiar idioma desde el
  `UserMenu` del header autenticado y desde `Settings/Profile`. El cambio debe
  actualizar cookie y perfil, refrescar la UI y conservar la ruta actual.
- **FR-I18N-24.5 — Homologación de copy**: toda copy visible de UI debe salir del
  diccionario tipado (`src/i18n/dictionaries/es.ts` / `en.ts`), corrigiendo la mezcla
  actual de textos hardcoded en inglés y español. Esto materializa **BR-2.28** a
  escala de aplicación, no solo en Unit 2.
- **FR-I18N-24.6 — Diccionario inglés completo**: `en.ts` debe tener la misma forma
  que `es.ts` y cubrir la UI completa: auth, onboarding, settings/security, pools,
  predictions, competition, admin, notifications, páginas de app, navegación,
  educación/reglas y estados/errores de dominio.
- **FR-I18N-24.7 — Contenido MDX bilingüe**: el Centro de Reglas debe existir en
  español e inglés. El contenido actual bajo `content/rules/es/*.mdx` se conserva y
  se añade una versión equivalente en `content/rules/en/*.mdx`; el loader debe
  seleccionar el contenido por locale activo.
- **FR-I18N-24.8 — Préstamos del inglés en español**: no se traducen préstamos
  naturales o términos de producto/técnicos ya usados así en español: `email`,
  `passkey`, `nickname`, `Google`, `WebAuthn`, `TOTP`, `push`, `web push`, entre otros
  equivalentes. Se mantiene **CF-5**: en copy visible, `Pool`/`pool` se presenta como
  **Liga**, `Pick` como **Predicción**, `Kickoff` como **Inicio del partido** e
  `Invite` como **Invitación**; `Ranking` se conserva como préstamo aprobado.
- **FR-I18N-24.9 — Rutas y SEO**: no se exige SEO multi-idioma con hreflang en esta
  unidad porque no hay URLs por locale. Metadata visible debe usar el diccionario
  activo cuando aplique; el routing por `[locale]` queda como decisión futura si el
  producto necesita SEO público bilingüe avanzado.

### NFR / Infra (Unit 24)
- **NFR (consistencia / accesibilidad)**: el idioma activo debe aplicarse de forma
  consistente a labels, `aria-label`, metadata, errores, empty states, toasts y
  botones. El selector de idioma debe ser navegable por teclado y tener labels claros.
- **NFR (mantenibilidad)**: `es` sigue siendo la forma fuente del tipo `Dictionary`;
  `en` debe compilar con la misma estructura. No se permiten strings literales de
  cara al usuario en componentes nuevos.
- **Infra**: requiere migración Prisma para `profiles.locale` con default `es` y
  restricción lógica/validación de valores `es | en`. Sin nuevas rutas públicas ni
  cambios de endpoints externos.

---

## NFR-PERF-REFINE-26: Performance Fase 1 — Quick Wins (Post-construcción — Unit 26)

> Refine post-construcción (2026-06-15). **Fase 1** del plan de optimización de
> performance detectado en análisis de latencia (2-3s por request en navegación).
> **No reinicia** ninguna etapa aprobada. Cubre la **Épica 25** (US-25.1). Cambios
> de bajo riesgo, alto impacto (~30min): query select, dedup, paralelización,
> connection pool y FK indexes.

- **FR-PERF-26.1 — `getProfile()` con `select` mínimo**: la query
  `prisma.profile.findUnique` en `getProfile()` (`src/features/profile/queries.ts`)
  debe usar `select` para devolver **solo** las columnas que los consumidores
  necesitan (id, nicknameBase, nicknameDiscriminator, avatarUrl, avatarSource,
  verificationStatus, onboardingCompleted, locale, deletedAt). Actualmente devuelve
  la fila completa (20+ columnas) cada vez que se invoca en layout, AppHeader y
  páginas. Esto reduce tráfico de red y serialización por request.
- **FR-PERF-26.2 — Dedup de `getProfile()` por render**: envolver `getProfile()`
  con `React.cache()` para que llamadas concurrentes dentro del mismo render
  (layout `(app)` + AppHeader + page) compartan una sola query Prisma. Conserva
  el comportamiento actual; solo evita ejecución duplicada.
- **FR-PERF-26.3 — Paralelizar queries de pool detail**: en
  `src/app/(app)/pools/[id]/page.tsx`, `getPoolDetail(id)` y
  `getPoolLeaderboard(id, userId)` se ejecutan secuencialmente. Deben correr en
  `Promise.all()` ya que son independientes (el leaderboard no necesita el detalle
  del pool como entrada).
- **FR-PERF-26.4 — `connection_limit` de 1 → 3**: en `src/lib/prisma.ts`, la
  lógica de pooling hardcodea `connection_limit=1`. Subir a 3 para permitir que
  queries independientes dentro de un mismo request se ejecuten concurrentemente
  a través del pooler de Supabase (pgBouncer modo transacción en :6543).
- **FR-PERF-26.5 — FK indexes en `Match.homeTeamId` y `Match.awayTeamId`**: toda
  query de fixture (`getStaticFixture`, `getAdminMatches`, etc.) hace `include:
  { homeTeam: true, awayTeam: true }`. PostgreSQL ejecuta nested loop joins sobre
  estas columnas sin índice. Agregar `@@index([homeTeamId])` y
  `@@index([awayTeamId])` en el modelo `Match` del schema Prisma **con migración**.

### NFR / Infra (Unit 26)
- **NFR (latencia)**: tras Fase 1, la latencia objetivo es <1s por request en
  páginas principales (`/matches`, `/pools/[id]`, `/rankings`).
- **Schema**: migración Prisma para los dos `@@index` en `Match`. Sin nuevas
  columnas ni tablas. `prisma migrate deploy` requerido en prod.
- **Infra**: sin nuevas dependencias npm ni cambios de runtime. `connection_limit`
  es un parámetro de connection string compatible con `PrismaPg`.

---

## NFR-PERF-REFINE-27: Performance Fase 2 — Estructural (Post-construcción — Unit 27)

> Refine post-construcción (2026-06-15). **Fase 2** del plan de optimización.
> **No reinicia** ninguna etapa aprobada. Cubre la **Épica 26** (US-26.1). Cambios
> estructurales (~1h): caching strategy, índices en Profile/ProviderSyncRun,
> refactor N+1 y caché de queries frecuentes.

- **FR-PERF-27.1 — Reemplazar `force-dynamic` en `/matches`**: la página
  `src/app/(app)/matches/page.tsx` declara `dynamic = "force-dynamic"`, lo que
  inhabilita toda caché RSC/CDN y fuerza cold start de serverless por request.
  Como el fixture ya está cacheado con `unstable_cache` (Unit 22), la página
  puede usar `revalidate` con un TTL razonable (ej. 60s) y revalidar por tag,
  manteniendo las predicciones por-usuario dinámicas vía `cookies()`.
- **FR-PERF-27.2 — Índice en `Profile.deletedAt`**: `getGlobalRankSnapshot()`
  (`src/features/scoring-rankings/services/ranking-events.ts`) ejecuta
  `profile.findMany({ where: { deletedAt: null } })` cada vez que se puntúa un
  partido, causando un seq scan sobre toda la tabla Profile. Agregar un **índice
  parcial** `@@index([deletedAt])` con `WHERE deleted_at IS NULL` en el modelo
  `Profile` del schema Prisma **con migración**.
- **FR-PERF-27.3 — Índice en `ProviderSyncRun` + refactor N+1**: el admin
  dashboard (`src/features/admin/queries.ts`) ejecuta 6 queries secuenciales
  (una por `SYNC_SCOPE`) filtrando por `scope` + `status: "SUCCESS"`. El índice
  existente `@@index([provider, scope, status])` no puede usarse porque
  `provider` es la primera columna y no está en el WHERE. Agregar
  `@@index([scope, status, finishedAt])` en el modelo `ProviderSyncRun` **con
  migración** + refactorizar el N+1 a una sola query con `groupBy` o carga
  agrupada en memoria.
- **FR-PERF-27.4 — Caché de queries frecuentes**: las queries `getMyPools()`,
  `getPoolDetail()` y `getNotificationSettings()` no usan `React.cache()` ni
  `unstable_cache`. Envolver `getMyPools` y `getPoolDetail` con `React.cache()`
  para dedup dentro del render. Evaluar `unstable_cache` con tags para
  `getDefaultAvatars` (ya cacheado 24h), `getPoolDetail` (invalidar en cambios
  de membresía) y lecturas de admin (TTL corto, invalidar en sync).

### NFR / Infra (Unit 27)
- **NFR (latencia)**: tras Fase 2, la latencia objetivo es <300ms por request
  en páginas principales.
- **Schema**: dos migraciones Prisma: `@@index` parcial en `Profile.deletedAt`
  y `@@index([scope, status, finishedAt])` en `ProviderSyncRun`. Sin nuevas
  columnas ni tablas. `prisma migrate deploy` requerido en prod.
- **Infra**: sin nuevas dependencias npm. `force-dynamic` → `revalidate` es un
  cambio de directiva de export en el page file. Compatible con el caché RSC
  existente de Next.js 16.

---

## 6. Dominio del SaaS — Pendiente de Definición

Las respuestas indican que el usuario tiene **funcionalidades principales bastante claras** para la infraestructura transversal (auth, seguridad, integraciones) pero el **dominio específico del SaaS** aún no ha sido descrito en detalle.

Los siguientes pasos de ideación (User Stories, Application Design) deberán profundizar en:
- El dominio de negocio específico del SaaS
- Los flujos principales del producto más allá de auth y gestión de perfiles
- El modelo de datos de negocio específico
- Las pantallas y vistas clave del producto

---

---

## Épica 27 — Unit 28: Persistencia de matches en sync-orchestrator (2026-06-16)

**Refine post-construcción** sobre Unit 25 (FootballDataProvider). No reinicia Units 1–27.

### FR-SYNC-28.1 — Persistencia de matches en el orquestador
`runCompetitionSync()` DEBE persistir los `NormalizedMatch` del provider en la BD además de los teams.

### FR-SYNC-28.2 — BD desde cero: separar seed de estructura vs. matches
Refactorizar `seedWorldCup2026()` en dos funciones:
- `seedCompetitionStructure()`: crea Competition + Phases + Teams (sin matches).
- La lógica de matches pasa a ser opcional (o se elimina del seed default).
- `scripts/seed-competition.ts` usa `seedCompetitionStructure()`.

### FR-SYNC-28.3 — Identificación de matches por `providerMatchId`
Lookup: `prisma.match.findFirst({ where: { providerMatchId } })`. Si existe → UPDATE. Si no → FR-SYNC-28.4.

### FR-SYNC-28.4 — Regla de creación por status
Solo se CREAN matches con status `SCHEDULED` o `LIVE`. Los matches `FINISHED`, `POSTPONED`, `CANCELLED` solo se ACTUALIZAN si ya existen; si no existen, se saltan.

### FR-SYNC-28.5 — Campos a actualizar (todos: Q2-C)
status, homeScore, awayScore, kickoffAt, homeTeamId (via fifaCode), awayTeamId (via fifaCode), homePlaceholder, awayPlaceholder.

### FR-SYNC-28.6 — Resolución de phase
Cargar `Map<phaseName, phaseId>` desde la competición activa (`slug = "world-cup-2026"`). Usar para asociar cada match a su phaseId.

### FR-SYNC-28.7 — Matches no vinculables (Q3-A)
Phase no encontrada o competición inexistente → `console.warn` + continuar. Sync run se marca SUCCESS.

### FR-SYNC-28.8 — Notificaciones de status
Preservar `emitMatchNotificationEvents(previous, saved)` al actualizar matches. Best-effort.

### FR-SYNC-28.9 — itemsUpdated = matches procesados
`ProviderSyncRun.itemsUpdated` cuenta matches creados + actualizados.

### FR-SYNC-28.10 — Sweeper automático suficiente (Q4-default A)
`scoreFinishedUnscoredMatches()` ya corre tras cada sync. Sin cambios en UI.

### NFR-SYNC-28.1 — Idempotencia
Múltiples syncs con los mismos datos no crean duplicados.

### NFR-SYNC-28.2 — Seguridad (Security Baseline)
`providerMatchId` viene del API, sanitizado por Zod. Admin gate existente protege `trigger-sync`.

### Archivos afectados
| Archivo | Cambio |
|---|---|
| `src/features/competition/services/sync-orchestrator.ts` | Agregar loop de sync de matches |
| `src/features/competition/services/upsert-competition-data.ts` | Extraer `seedCompetitionStructure()` |
| `scripts/seed-competition.ts` | Usar `seedCompetitionStructure()` |
| `src/features/competition/services/__tests__/sync-orchestrator.test.ts` | Nuevos tests |

---

## Épica 29 — Refine Unit 30: Filtro de "partidos anteriores" en /matches (2026-06-16)

**Intent del usuario**: "En la sección de matches (/matches) los partidos que ocurrieron el día anterior deben salir solo si se presiona un botón de filtro de mostrar aquellos antiguos. La idea es no hacer que el usuario haga mucho scroll para actualizar la predicción del día actual."

Refine UI/UX aditivo sobre Unit 16 (`groupFixtureByDay`, FR-REFINE-16.2). **No** reinicia etapas aprobadas. Sin cambios de schema, datos ni queries: la data del fixture ya viaja completa al cliente; solo cambia qué días se renderizan por defecto.

### FR-REFINE-30.1 — Colapso de días pasados por defecto
`/matches` muestra por defecto solo los días **>= hoy**. Los días estrictamente **anteriores a hoy** quedan ocultos detrás de un botón "Ver partidos anteriores".
- **Corte por DÍA, no por hora** (decisión del usuario, AskUserQuestion): el día de hoy se muestra **completo**, incluso si algunos de sus partidos ya se jugaron/bloquearon. Solo se colapsan los días con `dayKey < hoy`.
- "Hoy" se determina en **UTC** para alinearse con la agrupación existente (`groupFixtureByDay` usa `timeZone: "UTC"`) y mantener el corte determinista con el SSR cacheado.
- El bucket "Fecha por confirmar" (`dayKey === null`, knockouts sin fecha) se considera **futuro** y permanece visible.

### FR-REFINE-30.2 — Botón de revelado
- Etiqueta "Ver partidos anteriores" con conteo de **partidos** ocultos (externalizada en diccionarios `es`/`en`).
- Ubicado **arriba**, antes del primer día visible, para descubrirse sin scroll.
- Al presionarlo, los días pasados se expanden **en orden cronológico, por encima** del día actual (su lugar natural). Botón alterna a "Ocultar partidos anteriores".
- Si no hay días pasados, el botón **no se renderiza**.

### FR-REFINE-30.3 — Mecanismo client-side
Toggle resuelto en el navegador (decisión del usuario, AskUserQuestion): un componente cliente envuelve la lista y oculta/expande los días pasados con estado local (`useState`), **colapsado por defecto**.
- **Conserva el caching actual**: `export const revalidate = 60` y `unstable_cache` del fixture intactos; no se añaden queries ni se vuelve la página dinámica.
- Al recargar la página, vuelve al estado colapsado (aceptado).

### FR-REFINE-30.4 — Determinación de "pasado" en el servidor
La partición pasado/actual+futuro se calcula en el Server Component (a partir de `dayKey` vs. hoy-UTC) y se pasa al componente cliente ya particionada, para no exponer lógica de fecha duplicada ni recalcular en cada render del cliente.

### NFR-REFINE-30.1 — Sin regresión de performance
No se añaden round-trips ni se desactiva el caché. El coste extra es una partición O(n) de ~104 elementos en el servidor.

### NFR-REFINE-30.2 — Accesibilidad
El botón es un `<button>` real con estado expandido/colapsado comunicado (texto del label cambia); los días ocultos no quedan en el árbol accesible cuando están colapsados.

### Archivos afectados (previsto)
| Archivo | Cambio |
|---|---|
| `src/app/(app)/matches/page.tsx` | Particionar `days` en pasados/actuales-futuros por hoy-UTC; renderizar vía componente cliente |
| `src/features/predictions/components/*` (nuevo) | Componente cliente del toggle de días anteriores |
| `src/i18n/dictionaries/*` | Copy `matchesShowPast` / `matchesHidePast` (es/en) |
| `src/features/predictions/__tests__/*` | Test de partición por día (pasado vs hoy/futuro, corte UTC, bucket TBD) |

### Decisiones registradas (AskUserQuestion, 2026-06-16)
- **Corte**: por día — hoy se muestra completo (no por hora de kickoff).
- **Toggle**: client-side, colapsado por defecto (no URL param), para conservar el caching.
## Épica 30 — Refine Unit 31: "Revertir a la API" también revierte el puntaje de los usuarios (2026-06-16)

**Contexto**: en el admin panel, "Revertir a la API" sobre un partido con override manual limpiaba
solo los flags de override pero conservaba el resultado manual (`homeScore`/`awayScore`/`winnerTeamId`/
`status=FINISHED`); `scoreMatch()` re-puntuaba contra ese mismo resultado, por lo que los usuarios
**mantenían** los puntos del override. El intent: revertir debe **también revertir el puntaje**.

### FR-REFINE-31.1 — Revertir limpia el resultado manual y revierte los puntos
Al revertir un override, además de limpiar los flags (`manualOverride`/`manualOverrideReason`/
`overriddenByUserId`/`overriddenAt`), se limpia el resultado manual: `homeScore`, `awayScore`,
`homePenaltyScore`, `awayPenaltyScore`, `winnerTeamId` → `null` y `status` → `SCHEDULED`. Como el
partido deja de ser *scoreable*, `scoreMatch()` elimina los `PredictionScore` de ese partido
(lógica existente, BR-6.7) → los usuarios pierden los puntos del override. El próximo sync de
football-data.org repuebla el resultado real y vuelve a puntuar. El resultado original de la API
**no** se snapshotea (`force-result` sobrescribe en sitio), por lo que revertir **limpia**, no restaura.

### FR-REFINE-31.2 — Confirmación antes de revertir
Como la acción ahora es destructiva (elimina puntos de usuarios), el botón "Revertir a la API" pide
confirmación mediante un diálogo ("Se eliminará el resultado manual y los puntos que los usuarios
ganaron con él. El próximo sync de la API repondrá el resultado real.") antes de ejecutar.

### NFR / Infraestructura — SKIP
Sin schema, migraciones ni rutas. Reutiliza `scoreMatch()`, el primitivo `Dialog` (base-ui) y los
tags de caché existentes. Security Baseline intacto (gate `getAdminUserId()` sin cambios).

### Archivos afectados
| Archivo | Cambio |
|---|---|
| `src/features/admin/actions/revert-override.ts` | Limpiar resultado (scores/penales/winner→null, status→SCHEDULED) en el update |
| `src/features/admin/components/revert-override-button.tsx` | Diálogo de confirmación (reusa `Dialog`) |
| `src/i18n/dictionaries/{es,en}.ts` | Copy `revertConfirmTitle`/`revertConfirmBody`/`revertConfirm`/`cancel` (admin) |
| `src/features/admin/actions/__tests__/revert-override.test.ts` (nuevo) | Tests del action |

### Decisiones registradas (AskUserQuestion, 2026-06-16)
- **Semántica**: limpiar resultado + quitar puntos; el próximo sync de la API repone el resultado real.
- **Confirmación**: sí, diálogo de confirmación antes de revertir.

## Épica 31 — Refine Unit 32: Seed auto-sanador de identidad de equipos (2026-06-16)

**Contexto**: El commit `a2cfb96` corrigió el `fifaCode` de Uruguay (`URU→URY`) solo en la lista de
estructura (`world-cup-2026.ts`). El partido Saudi Arabia vs Uruguay, sembrado en una corrida previa,
quedó con `awayTeamId=null` (football-data devuelve TLA `URY`; en BD el equipo estaba como `URU`) y se
muestra como "Equipo por Definir". No es un placeholder legítimo de knockout: es un equipo real con
desalineación de código entre el API y la BD. El seed debe **auto-sanar** estas correcciones, no solo
ser aditivo.

**Causa raíz**: `upsertTeam` (`upsert-competition-data.ts`) usa `fifaCode` como clave de upsert. Re-correr
el seed con el código corregido **crea un equipo duplicado** (fila `URY` nueva) y deja la fila `URU`
huérfana, en vez de actualizar en sitio. Los `providerTeamId` del seed están todos en `null`.

### FR-REFINE-32.1 — Reconciliación de equipos por nombre en el seed de estructura
El seed de estructura reconcilia cada equipo canónico por `name` (estable): si existe una fila con el
mismo nombre y `fifaCode` distinto, **actualiza el código (y demás campos) en sitio**, sin crear duplicado.

### FR-REFINE-32.2 — Merge de duplicados huérfanos
Si ya existe un duplicado (fila huérfana con código viejo + fila canónica con código nuevo), el seed los
**fusiona**: re-apunta todas las FKs a `Team` desde la huérfana hacia la canónica
(`Match.homeTeamId`, `Match.awayTeamId`, `Match.winnerTeamId`, `Prediction.penaltyTeamId`) y elimina la
huérfana. Idempotente y **sin script de migración aparte** (decisión Q3).

### FR-REFINE-32.3 — Re-vinculación de partidos existentes en la sync
Al re-correr, la ruta de update de `syncMatchesToDB` re-vincula los partidos existentes cuyo equipo ahora
resuelve por `fifaCode` (Saudi Arabia vs Uruguay → `awayTeamId` = Uruguay). **No** se tocan placeholders
legítimos de knockout: un partido sin equipo real conserva `homePlaceholder`/`awayPlaceholder` y
`teamId=null` (decisión Q2). Esta ruta ya existe; el fix de FR-REFINE-32.1/.2 la habilita.

### Restricciones / SKIP
- **Sin** cambios de schema ni migraciones.
- **No** se altera el keying por `fifaCode` de la ruta de **sync** (`upsertTeam` sigue resolviendo equipos
  del provider por `fifaCode`); la reconciliación por nombre vive **solo** en el seed de estructura para no
  romper el upsert de equipos del provider (cuyos nombres difieren de los nuestros).
- Security Baseline intacto (sin rutas ni superficie nueva).

### Archivos afectados (previsto)
| Archivo | Cambio |
|---|---|
| `src/features/competition/services/upsert-competition-data.ts` | Reconciliación por nombre + merge de huérfanos en el seed de estructura |
| `src/features/competition/services/__tests__/` | Tests de reconciliación/merge (rename en sitio, merge con re-apuntado de FKs, idempotencia) |

### Decisiones registradas (AskUserQuestion, 2026-06-16)
- **Q1 (identidad)**: reconciliar por `name` (recomendado) en vez de poblar `providerTeamId`.
- **Q2 (re-vincular)**: re-vincular el equipo real desalineado; preservar placeholders legítimos de knockout.
- **Q3 (alcance datos)**: seed idempotente, **sin** script aparte.

---

## Épica 32: Extracción de equipos desde API en seed/sync (Unit 33 — añadida vía refine)

> El `FootballDataProvider` devolvía `teams: []`, por lo que el fallback del snapshot tampoco contenía
> datos de equipos. Cuando el seed corría sin API y caía al snapshot, los partidos no podían resolver
> `homeTeamId`/`awayTeamId` por `fifaCode` (ej. Uruguay `URY` vs snapshot con `URU`), mostrando
> "Equipo por definir". La solución es extraer los equipos únicos de los partidos del API y enriquecerlos
> con los datos canónicos de `WORLD_CUP_2026_TEAMS` (isoAlpha2, flagKey, flagPath).

### FR-REFINE-33.1 — Extracción de equipos desde partidos
El `FootballDataProvider.fetch()` extrae los equipos únicos de los partidos (por `tla`/`fifaCode`) y los
devuelve en el array `teams` del payload, enriquecidos con los datos canónicos de `WORLD_CUP_2026_TEAMS`
(`name`, `isoAlpha2`, `flagKey`, `flagPath`). El `providerTeamId` viene del API (`match.homeTeam.id`).

### FR-REFINE-33.2 — Snapshot con datos de equipos
El snapshot commiteado (`world-cup-2026-fixtures.json`) ahora incluye el array `teams` con los 48 equipos
del Mundial 2026. El fallback offline del seed puede resolver `homeTeamId`/`awayTeamId` sin depender de la API.

### FR-REFINE-33.3 — Idempotencia preservada
Si los datos del API cambian (ej. nombre de equipo, `providerTeamId`), el siguiente seed/sync actualiza
la fila `Team` correspondiente (keyed por `fifaCode`). Si los datos son iguales, no hay cambio (idempotente).

### Restricciones / SKIP
- **Sin** cambios de schema ni migraciones.
- **No** se altera la reconciliación por nombre del seed de estructura (Unit 32).
- Security Baseline intacto.

### Archivos afectados
| Archivo | Cambio |
|---|---|
| `src/features/competition/services/providers/football-data.ts` | Extracción de equipos únicos desde partidos + enriquecimiento con datos canónicos |
| `src/features/competition/seed/snapshots/world-cup-2026-fixtures.json` | Snapshot regenerado con 48 equipos |
| `src/features/competition/services/providers/__tests__/football-data.test.ts` | Test actualizado: verifica extracción de equipos |
| `src/features/competition/services/__tests__/seed-matches.test.ts` | Test actualizado: verifica que fallback incluye equipos |

---

## Épica 33: Refine Unit 34 — Códigos FIFA en `/admin/matches` (2026-06-16)

**Intent del usuario**: "En admin/matches los nombres de los equipos tienen que verse con sus 3 letras por ejemplo: BRA vs ARG".

Refine UI-only sobre Unit 7 (Admin and Observability) y dependiente de Unit 4/CF-3: el modelo `Team` ya almacena `fifaCode` como código futbolístico de 3 letras. **No** reinicia etapas aprobadas. Sin cambios de schema, rutas ni reglas de scoring/sync.

### FR-REFINE-34.1 — Etiqueta compacta de equipos en admin/matches
En `/admin/matches`, cada fila y diálogo de administración de resultados debe identificar el partido por códigos `fifaCode` de 3 letras, no por nombres largos de equipos.
- Formato para equipos resueltos: `HOME_CODE vs AWAY_CODE`, por ejemplo `BRA vs ARG`.
- `HOME_CODE` y `AWAY_CODE` vienen de `match.homeTeam.fifaCode` / `match.awayTeam.fifaCode`.
- Los códigos se muestran en mayúsculas y se tratan como identificadores visuales compactos para la operación admin.

### FR-REFINE-34.2 — Fallback para placeholders legítimos
Si un lado del partido aún no tiene equipo resuelto (`homeTeamId`/`awayTeamId` nulo), `/admin/matches` conserva el placeholder existente para ese lado (`homePlaceholder`/`awayPlaceholder`) en vez de inventar un código.
- Ejemplo: `1ro Grupo A vs 2do Grupo B` hasta que la API/sync resuelva los equipos.
- No cambia la regla BR-7.4: los overrides solo se fuerzan cuando ambos equipos están definidos.

### FR-REFINE-34.3 — Alcance limitado a la interfaz admin
El cambio aplica a `/admin/matches` y sus controles de override/reversión. No cambia `/matches` público, predicciones, rankings, scoring, seed ni sync.

### Archivos afectados (previsto)
| Archivo | Cambio |
|---|---|
| `src/features/admin/queries.ts` | Incluir/derivar `homeTeam.fifaCode` y `awayTeam.fifaCode` en el DTO admin si no está disponible. |
| `src/features/admin/components/*` | Renderizar la etiqueta `BRA vs ARG` en filas y diálogos de `/admin/matches`. |
| `src/features/admin/__tests__/*` | Verificar etiqueta por códigos y fallback a placeholders. |

---

## Épica 34: Refine Unit 35 — Invalidación inmediata de caché tras mutaciones admin (2026-06-17)

**Intent del usuario**: "Esto es un bug, cuando ejecuto forzar resultados o revierto el resultado y luego cuando entro como un usuario a /matches tengo que refrescar el navegador dos veces para ver esa página actualizada, pasa lo mismo en el ranking y los pools. No se si es que hay un evento que hace que tarda o un tema de cache".

Refine post-construcción sobre Unit 7 (Admin), Unit 31 (revert override), Unit 22/27 (performance/caché) y Unit 6 (scoring/rankings). **No** reinicia etapas aprobadas. Sin cambios de schema, migraciones ni rutas nuevas.

### FR-REFINE-35.1 — Lectura inmediata tras forzar resultado
Después de `forceMatchResult()`, las vistas de usuario afectadas deben mostrar el nuevo resultado y puntaje en la siguiente navegación/refresco normal, sin requerir dos refreshes del navegador.

### FR-REFINE-35.2 — Lectura inmediata tras revertir resultado
Después de `revertMatchOverride()`, `/matches`, `/rankings` y rankings de ligas deben reflejar la limpieza del resultado y la eliminación de puntos en la siguiente navegación/refresco normal, sin depender del stale-while-revalidate.

### FR-REFINE-35.3 — Lectura inmediata tras sync admin
Después de `triggerSync()`, las mismas vistas afectadas por resultados y scoring deben invalidarse de forma consistente, porque el sync puede modificar fixtures, estados, scores y rankings.

### FR-REFINE-35.4 — Política de invalidación compartida
Las acciones admin que mutan resultados/scoring deben usar una política común de invalidación para evitar divergencias entre `force-result`, `revert-override` y `trigger-sync`.

### NFR-REFINE-35.1 — Consistencia de caché sobre latencia
Para mutaciones admin explícitas se prioriza consistencia inmediata sobre stale-while-revalidate. En Server Actions se debe usar semántica de expiración inmediata para caches tagged de fixture/rankings (Next.js `updateTag`) y revalidar rutas de usuario afectadas (`revalidatePath`).

### Restricciones / SKIP
- **Sin** schema, migraciones, rutas nuevas, cambios de auth ni cambios de scoring matemático.
- No tocar cambios no relacionados del worktree (actualmente `src/features/competition/components/match-card.tsx`).
- Security Baseline intacto: solo admins siguen pudiendo ejecutar mutaciones (`getAdminUserId()` existente).

---

## Épica 35: Refine Unit 36 — Scoring acumulativo por ganador y goles acertados (2026-06-17)

**Intent del usuario**: "Hay un cambio en las reglas del juego. Los puntajes de acertar el ganador y un gol se suman. Por ejemplo BRA vs ARG queda 2 -1 y mi predicción fue BRA 3 y ARG 2 me llevo 3 puntos, 1 punto por gol y 2 puntos por ganador."

Refine post-construcción sobre Unit 2 (educación/calculadora) y Unit 6 (scoring/rankings). **No** reinicia etapas aprobadas ni la Unit 35 en curso. Sin cambios de schema ni rutas nuevas; cambia la matemática de `computeScore` y los desgloses persistidos a partir del próximo recálculo.

### FR-REFINE-36.1 — Puntaje base acumulativo
El puntaje base deja de ser mutuamente excluyente entre resultado y goles. Se calcula como la suma de:
- **5 puntos** si el marcador exacto coincide (local y visitante). En este caso no se suman puntos adicionales por resultado/goles, para conservar el valor máximo histórico de exacto.
- **2 puntos** si el resultado coincide: mismo ganador o mismo empate.
- **1 punto por cada equipo cuyo número de goles coincida** con el resultado real, cuando no haya marcador exacto. Puede otorgar 0, 1 o 2 puntos por goles acertados.

### FR-REFINE-36.2 — Ejemplo canónico
Si el resultado real es `BRA 2 - 1 ARG` y la predicción fue `BRA 3 - 2 ARG`, el usuario recibe **3 puntos**: 2 por ganador correcto (`BRA`) + 1 por acertar un gol de ARG.

### FR-REFINE-36.3 — Bonus de penales se mantiene adicional
El bonus de penales en knockout sigue siendo **+1 adicional** cuando aplica. El total final es `basePoints + penaltyPoints`, donde `basePoints` refleja el nuevo cálculo acumulativo.

### FR-REFINE-36.4 — Desglose visible y persistido
El desglose debe explicar componentes acumulados (resultado correcto, goles local, goles visitante, exacto, penales) en vez de presentar un único caso excluyente `RESULT`/`PARTIAL`. Si el schema actual conserva `matchedCase`, puede mantenerse como clasificación resumida para compatibilidad interna, pero la UI/copy debe mostrar la suma real de componentes.

### Restricciones / SKIP
- **Sin** schema/migraciones salvo que la implementación demuestre que el desglose actual no puede representar la suma de componentes.
- No cambia locks de predicción, rankings, admin override, sync ni reglas de penales.
- Unit 35 sigue pendiente de Functional Design; este refine no la reinicia.

---

## Épica 36: Refine Unit 35 — Penalty winner derivado del marcador de tanda en force-result (2026-06-17)

**Intent del usuario**: "He detectado un bug en admin/matches cuando fuerzo un resultado en penaltis. Al fijar resultado que da ganador a un equipo, puedo escoger a otro equipo como ganador. Un ejemplo: Si POR vs COD seleccióno que el resultado de penaltis fue POR 3 y COD 4, me está dejando seleccionar POR como ganador"

Refine post-construcción sobre Unit 35 (cache invalidation) y Unit 7 (Admin). **No** reinicia etapas aprobadas. Sin cambios de schema, migraciones ni rutas nuevas.

### FR-REFINE-36.5 — Ganador de penales derivado del marcador
En el diálogo de force-result del admin, cuando el partido es knockout y el marcador está empatado, el ganador de penales se deriva automáticamente del marcador de la tanda (`homePenaltyScore` vs `awayPenaltyScore`) usando `derivePenaltyWinner()`. Ya no se permite seleccionar manualmente un ganador que contradiga el marcador.

### FR-REFINE-36.6 — Validación server-side
El server action `forceMatchResult` valida que `penaltyWinnerTeamId` coincida con el ganador derivado de `homePenaltyScore`/`awayPenaltyScore`. Si se recibe un ganador que no coincide con el marcador, se rechaza con error.

### FR-REFINE-36.7 — Tanda empatada inválida
Si el marcador de penales es empate, el diálogo muestra un mensaje de error y deshabilita el botón de envío. Una tanda de penales no puede terminar empatada.

### Restricciones / SKIP
- **Sin** schema, migraciones ni rutas nuevas.
- Reutiliza `derivePenaltyWinner()` de Unit 2 (ya compartido con la calculadora).
- No cambia reglas de scoring ni flujos de predicción.

---

## Épica 37: Performance Fase 3 — Implementación de diferidos de Unit 22 (Post-construcción — Unit 37, 2026-06-17)

**Intent del usuario**: "Esta aplicación se despliega en vercel y la base de datos está en supabase… usa Connection pooler, pero aún así la aplicación está lenta. Revisa si tengo un cuello de botella por la implementación, la forma de conexión, o configuración de Vercel/Supabase."

Refine post-construcción que **implementa** los ítems que **NFR-PERF-REFINE-22** dejó diferidos (22.1 `getClaims`, 22.4 caché del leaderboard de pool, 22.5 pooling) y añade optimizaciones de cold-start y del camino de scoring. **No reinicia** etapas aprobadas. Construye sobre Units 22/26/27/35. Síntoma confirmado por el usuario: lentitud transversal (toda navegación, primera carga, páginas pesadas y mutaciones); región Vercel = Supabase (sin penalización cross-region).

### NFR-PERF-REFINE-37.1 — `getClaims()` en el camino caliente (implementa 22.1, P0)
`src/proxy.ts` y `getAuthUser` (`src/lib/supabase/current-user.ts`) verifican el JWT **localmente** con `auth.getClaims()` (JWT Signing Keys asimétricas + JWKS cacheado), eliminando el round-trip a GoTrue (`getUser()`) por request. El proxy ya **no** consulta `profiles` por PostgREST (elimina 22.2 en el middleware): lee `onboarding_completed` y `email_verified` de claims inyectados por un **Custom Access Token Hook**. Los gates fallan **abierto** ante claim ausente (tokens emitidos antes del hook) para no romper sesiones existentes. `completeOnboarding` llama `refreshSession()` para reflejar el claim al instante. La capa de acciones (`getOnboardedUserId`, Prisma) sigue siendo la defensa autoritativa de mutaciones.

### NFR-PERF-REFINE-37.2 — Caché del leaderboard de pool (implementa 22.4, P2)
`getPoolLeaderboard` (`src/features/scoring-rankings/queries.ts`) se cachea por `poolId` con `unstable_cache` + `RANKINGS_TAG`, separando el `isViewer` por request (mismo patrón que el ranking global). Elimina el over-fetch (`select` de nickname/avatar en vez de `include: { user: true }`). Las mutaciones de membresía (`leavePool`/`kickMember`/`joinPoolByToken`/`joinPublicPool`) invalidan `RANKINGS_TAG`.

### NFR-PERF-REFINE-37.3 — Pooling y cold-start (implementa 22.5, P2/P3)
`connection_limit` configurable por `DB_CONNECTION_LIMIT` (default 5, antes fijo en 3) en `src/lib/prisma.ts`. `serverExternalPackages: ["@prisma/adapter-pg", "pg"]` en `next.config.ts` (bundle más chico, menos cold start). `engines.node >= 24` en `package.json`. Config de dashboard (Operations): Vercel Fluid Compute + región; Supabase signing keys + hook. Nota: con el driver adapter `pg`, `?pgbouncer=true` es **innecesario** (es flag del query-engine clásico).

### NFR-PERF-REFINE-37.4 — Camino de scoring (P3)
`getGlobalRankSnapshot` (`src/features/notifications/services/ranking-events.ts`) suma con `groupBy _sum` en la DB en vez de traer todos los perfiles con todos sus scores y reducir en JS; conserva las posiciones (incluye perfiles con 0 puntos). Abarata las dos llamadas (antes/después) de `score-match.ts` y el sweeper.

### Infraestructura
- **Migración** `prisma/migrations/20260617120000_auth_access_token_hook/` — función `public.custom_access_token_hook` (claims `email_verified` + `onboarding_completed`), grants a `supabase_auth_admin`, policy de lectura sobre `profiles`. Habilitar el hook es paso de dashboard.

### Restricciones / SKIP
- Sin rutas nuevas; sin cambios de modelo de datos (solo la función/policy del hook).
- No cambia reglas de scoring ni de negocio; solo cómo se computan/cachean lecturas y cómo se verifica la sesión.

---

## Épica 38: Refine — Gestión de passkeys desde Perfil → Seguridad (Unit 38, 2026-06-17)

**Intent del usuario**: "Los usuarios pueden hacer el management de su passkey desde la sección de 'Perfil->Seguridad'".

Refine post-construcción aditivo sobre Unit 1 Foundation (WF-13, RULE-SEC-02), Unit 11 App Shell (US-10.3, enlace a `/settings/security`), Unit 4 Competencia (FR-REFINE-4), Unit 20 Passkeys (API nativa), y CF-10 (mecanismo oficial de passkeys). **No reinicia** etapas aprobadas.

El diseño original de Unit 1 (RULE-SEC-02, WF-13, Unit 1 code generation plan Step 24) prescribía que la gestión de passkeys (registro, listado, eliminación) debía estar disponible desde `/settings/security`, además del paso opcional del onboarding. Unit 20 corrigió el registro y login con la API nativa de Supabase, pero **no implementó** la interfaz de gestión desde la sección de Seguridad del Perfil. Actualmente `/settings/security` solo contiene TOTP MFA y eliminación de cuenta; **no tiene sección de passkeys**.

### FR-REFINE-38.1 — Listado de passkeys registrados
En `/settings/security`, el usuario debe ver una lista de sus passkeys registrados (si tiene alguno), usando `supabase.auth.passkey.list()` (API nativa, CF-10). Cada passkey muestra su nombre/etiqueta (`friendlyName`/`displayName`) y un botón para eliminarlo.

### FR-REFINE-38.2 — Eliminación de passkeys
El usuario puede eliminar un passkey desde la lista, con confirmación previa (acción destructiva). Usa `supabase.auth.passkey.delete(id)` (API nativa, CF-10). No debe permitir eliminar el último método de autenticación si deja la cuenta sin acceso.

### FR-REFINE-38.3 — Registro de nuevos passkeys desde Seguridad
El usuario puede registrar un nuevo passkey desde `/settings/security` sin depender del onboarding (que ya pasó). Reutiliza el mismo mecanismo de `supabase.auth.registerPasskey()` que el paso de onboarding (`passkey-step.tsx`).

### FR-REFINE-38.4 — Integración con el menú de navegación
El enlace a "Seguridad" (`/settings/security`) ya existe en el `UserMenu` del App Shell (US-10.3). Sin cambios de navegación requeridos: la sección de passkeys se integra en la página de seguridad existente.

### Restricciones / SKIP
- **Sin** schema, migraciones ni rutas nuevas (la ruta `/settings/security` ya existe).
- Usa exclusivamente la API nativa de Passkeys de Supabase (`auth.passkey.*`), no el factor MFA-WebAuthn (`mfa.listFactors()`), en cumplimiento de **CF-10**.
- No cambia el flujo de onboarding ni el login con passkey (Unit 20 intacto).
- No cambia reglas de scoring, predicciones, sync ni admin.
- Security Baseline intacto: la gestión de passkeys opera en el cliente con sesión activa (Supabase Auth gestiona la autorización de la ceremonia WebAuthn).

---

### Épica 39: Sync — unique constraint conflict en `Team.providerTeamId` (Unit 39 — añadida vía refine)

> Refine post-construcción sobre Unit 25 (sync con football-data.org), Unit 33 (extracción de equipos desde API), Unit 4 (competition data) y Unit 29 (seed de partidos). **No reinicia** etapas aprobadas.

**Causa raíz**: `upsertTeam()` usa `fifaCode` como llave de búsqueda (`where`), pero el modelo `Team` tiene un `@unique` sobre `providerTeamId` (migración inicial `20260609000000_init`). Cuando football-data.org devuelve el mismo `homeTeam.id`/`awayTeam.id` para dos equipos con distinto `fifaCode` (o una sync previa interrumpida dejó datos inconsistentes), el upsert no encuentra la fila por `fifaCode`, intenta un `CREATE` con ese `providerTeamId`, y viola el unique constraint.

`providerTeamId` **nunca** se usa como llave de búsqueda en el código — todos los lookups de equipos (`sync-orchestrator.ts`, `upsert-competition-data.ts`, `seed-matches.ts`) usan `fifaCode`. Es metadata informacional sin propósito funcional en el sistema actual.

### FR-REFINE-39.1 — Remover unique constraint en `Team.providerTeamId`
El `@unique` sobre `providerTeamId` en `prisma/schema.prisma` debe eliminarse. El `fifaCode` es la identidad canónica del equipo; `providerTeamId` es metadata del proveedor externo (football-data.org) y no debe imponer una restricción de unicidad que entra en conflicto con `fifaCode`.

### FR-REFINE-39.2 — Migración de schema
Crear una migración Prisma (`prisma migrate dev`) que ejecute `DROP INDEX IF EXISTS "teams_provider_team_id_key"` en PostgreSQL. Sin cambios en ninguna fila existente: el índice se elimina, los datos se conservan.

### FR-REFINE-39.3 — Verificación post-migración
Tras aplicar la migración, ejecutar una sync completa (scope `FULL`) desde `/admin` debe completarse sin errores de unique constraint en `provider_team_id`. Los tests existentes que referencian `providerTeamId` (sin assert del índice) deben seguir pasando.

### Restricciones / SKIP
- **Sin** cambios de código en `upsertTeam()`, `sync-orchestrator.ts`, `football-data.ts`, `seed-matches.ts` ni `trigger-sync.ts` — la lógica de upsert por `fifaCode` ya es correcta.
- **Sin** nuevas rutas, componentes ni cambios de UI.
- **Sin** migraciones de datos (solo DDL: drop index).
- **Sin** cambios en reglas de scoring, predicciones, pools ni auth.
- Security Baseline intacto: el cambio es de modelo de datos (integridad referencial), no afecta autenticación ni autorización.

---

### Épica 40: Contraste del selector de tipo de sync en `/admin` dark mode (Unit 40 — añadida vía refine)

> Refine UI-only sobre Unit 7 (Admin and Observability) y Unit 8 (Design System/theming). **No reinicia** etapas aprobadas. Bug visual reportado: en el admin panel `/admin`, el select que permite elegir el tipo/scope de sincronización (`FIXTURES`, `LIVE_STATUS`, `RESULTS`, `FULL`) camufla los valores no seleccionados con el background del select cuando la app está en modo oscuro.

### FR-REFINE-40.1 — Opciones del select legibles en dark mode
En `/admin`, el selector de tipo de sincronización debe mantener contraste suficiente en modo oscuro para todas sus opciones, no solo para el valor seleccionado. Las opciones no seleccionadas deben verse claramente al abrir el control.

### FR-REFINE-40.2 — Comportamiento de sync intacto
El cambio no altera los valores permitidos (`FIXTURES`, `LIVE_STATUS`, `RESULTS`, `FULL`), el scope por defecto, el botón de sincronización, el server action `triggerSync()`, los permisos admin ni el logging de `ProviderSyncRun`.

### Restricciones / SKIP
- **Sin** schema, migraciones, rutas nuevas ni cambios de datos.
- **Sin** cambios en `trigger-sync.ts`, `sync-orchestrator.ts`, providers, scoring, predicciones ni pools.
- **Sin** cambios de copy/i18n: los valores visibles del selector siguen siendo los scopes técnicos existentes.
- Security Baseline intacto: el gate admin y `requireAdmin()` no cambian.

---

### Épica 41: Predicciones visibles dentro del pool (Unit 41 — añadida vía refine)

> Refine aditivo sobre Unit 3 (Pools and Membership), Unit 5 (Predictions and Match Locking), y Unit 6 (Scoring and Pool Rankings). **No reinicia** etapas aprobadas. Feature: los participantes de un pool pueden ver las predicciones de otros miembros para partidos que ya hayan comenzado. Las predicciones se agrupan por jornada/día y se accede desde una nueva pestaña "Predicciones" en `/pools/[id]`.

**Base conceptual**: El modelo `Prediction` ya almacena `homeScore`, `awayScore`, `penaltyWinnerTeamId`, y `lockedAt`. El modelo `PredictionScore` ya almacena el desglose de puntos (`matchedCase`, `basePoints`, `totalPoints`). La RLS `prediction_scores_select_pool_peers` ya existe en la migración de constraints pero no es usada por ninguna query Prisma. La visibilidad opera por Prisma con membership gate existente; no se requiere RLS adicional porque todas las queries pasan por el server.

### FR-REFINE-41.1 — Visibilidad desde el kickoff
Las predicciones de un miembro del pool se vuelven visibles para los demás miembros desde el momento en que arranca el partido (`match.kickoffAt <= now`, que coincide con `prediction.lockedAt IS NOT NULL` porque el mecanismo de lock se dispara en el kickoff). Las predicciones de partidos que no han comenzado (`SCHEDULED` con `kickoffAt > now`) permanecen privadas (solo visibles para su autor).

### FR-REFINE-41.2 — Nueva pestaña "Predicciones" en la página del pool
La página `/pools/[id]` gana una tercera pestaña "Predicciones" (junto a "Clasificación" y "Miembros"). Solo los miembros del pool pueden verla (el gate de membresía de `getPoolDetail` aplica). Si el usuario no es miembro, la página retorna `notFound()`.

### FR-REFINE-41.3 — Vista por jornada/día
Las predicciones se agrupan por día calendario (UTC), mismo criterio que `/matches` (FR-REFINE-16.2). Los días se muestran en orden cronológico inverso: las predicciones más recientes primero, las más antiguas después. Cada jornada muestra una tabla donde:
- **Filas**: cada miembro del pool (avatar + nickname)
- **Columnas**: cada partido de esa jornada que ya comenzó (etiqueta `HOME vs AWAY`, scores reales si ya terminó)
- **Celdas**: la predicción del miembro (`golesLocal - golesVisitante`) y los puntos obtenidos (badge con totalPoints). Si el partido aún no terminó (LIVE), los puntos se muestran como "—" (pendientes de scoring).

### FR-REFINE-41.4 — Sin timestamps en la vista de predicciones
La tabla de predicciones muestra solo goles predichos y puntos obtenidos. No muestra `createdAt`, `updatedAt`, ni información de cuándo se hizo la predicción. La única información temporal es la jornada/día que agrupa los partidos.

### FR-REFINE-41.5 — Sin cambios en el modelo de datos
No se crean nuevas tablas, columnas, migraciones ni rutas. La query `getPoolMemberPredictions(poolId)` lee datos existentes de `Prediction`, `PredictionScore`, `Match`, `PoolMembership` y `Profile`. La autorización es server-side: `getCurrentUserId()` verifica membresía en el pool antes de devolver datos.

### Restricciones / SKIP
- **Sin** schema, migraciones ni rutas nuevas.
- **Sin** cambios en `save-prediction.ts`, `score-match.ts`, sync ni admin.
- **Sin** nuevas RLS policies (Prisma opera con rol privilegiado; el gate de membresía es suficiente).
- **Sin** cambios en el leaderboard ni en el ranking global.
- **Sin** exposición de predicciones de partidos futuros.
- Security Baseline intacto: la query es server-authoritative; el membership gate existente en `getPoolDetail` asegura que solo miembros acceden.
