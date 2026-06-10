# Architecture

## Overview

Aplicación full-stack Next.js 16 con Supabase como backend (auth, base de datos, storage). El frontend usa Server Components + Server Actions. La base de datos se accede via Prisma ORM con migraciones gestionadas en Supabase.

```
┌──────────────────────────────────────────────────────────────────┐
│                        Cliente (Browser)                         │
│  React 19 + Tailwind CSS v4 + shadcn/ui + Supabase JS Client    │
└──────────────────────────────┬───────────────────────────────────┘
                               │ HTTPS
┌──────────────────────────────▼───────────────────────────────────┐
│                     Next.js 16 (App Router)                       │
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Server Actions  │  │   API Routes    │  │  Server         │  │
│  │  (mutaciones)    │  │  (CSP report,   │  │  Components     │  │
│  │                  │  │   callbacks)    │  │  (lectura)      │  │
│  └────────┬─────────┘  └────────┬────────┘  └────────┬────────┘  │
│           │                     │                     │           │
│           └─────────────────────┼─────────────────────┘           │
│                                 │                                 │
└─────────────────────────────────┼─────────────────────────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
    ┌─────────▼──────┐  ┌────────▼────────┐  ┌───────▼──────────┐
    │  Supabase Auth  │  │  Supabase DB    │  │  Supabase        │
    │  (usuarios,     │  │  (PostgreSQL    │  │  Storage         │
    │   MFA, OAuth,   │  │   18)           │  │  (avatars,       │
    │   passkeys)     │  │                 │  │   flags)         │
    └─────────────────┘  └────────▲────────┘  └──────────────────┘
                                  │
                        ┌─────────▼──────────┐
                        │  Prisma 7 ORM      │
                        │  (schema + client) │
                        └────────────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
    ┌─────────▼──────┐  ┌────────▼────────┐  ┌───────▼──────────┐
    │  API-Football   │  │  Content         │  │  Edge Functions  │
    │  (datos de      │  │  Collections     │  │  (competition-   │
    │   partidos)     │  │  (MDX rules)     │  │   sync scaffold) │
    └─────────────────┘  └─────────────────┘  └──────────────────┘
```

## Capa de datos

### Modelos principales (Prisma)

| Modelo | Propósito |
|--------|-----------|
| `Profile` | Identidad pública del usuario (extiende Supabase `auth.users`) |
| `AvatarAsset` | Avatares por defecto (seeded) |
| `Pool` | Grupo de competición (público/privado, token de invitación) |
| `PoolMembership` | Membresía de usuario en un pool |
| `Competition` | Torneo (slug único, temporada, proveedor) |
| `CompetitionPhase` | Fase del torneo (grupos, knockout, liga) |
| `Team` | Selección nacional (fifaCode único, bandera) |
| `Match` | Partido individual (equipos, resultado, penales, overrides) |
| `Prediction` | Predicción de usuario para un partido |
| `PredictionScore` | Puntaje calculado de una predicción |
| `ProviderSyncRun` | Auditoría de sincronización con API externa |

### Autenticación

- **Proveedor**: Supabase Auth
- **Métodos**: email/password, Google OAuth
- **MFA**: TOTP (authenticator app)
- **Passkeys**: WebAuthn via `@simplewebauthn`
- **Sesión**: cookies gestionadas por `@supabase/ssr`
- **Perfil**: trigger SQL en Supabase crea `profiles` row al registrarse
- **Admin**: verificación via `verificationStatus = "ADMIN"` en profile

### Seguridad (Row Level Security)

Todas las tablas tienen RLS policies definidas en `supabase/migrations/`. Los usuarios solo acceden a sus propios datos. Pools públicos son legibles; pools privados requieren membresía.

## Capa de presentación

### Rutas

| Ruta | Descripción | Auth requerida |
|------|-------------|----------------|
| `/` | Landing page | No |
| `/auth/sign-in` | Inicio de sesión | No |
| `/auth/sign-up` | Registro | No |
| `/auth/callback` | OAuth callback | No |
| `/auth/forgot-password` | Recuperar contraseña | No |
| `/auth/reset-password` | Resetear contraseña | No |
| `/pools` | Lista de pools del usuario | Sí |
| `/pools/[id]` | Detalle de un pool | Sí (miembro) |
| `/predictions` | Fixture con predicciones | Sí |
| `/profile` | Perfil de usuario | Sí |
| `/rules` | Centro de reglas (MDX) | No |
| `/admin` | Panel de administración | Sí (ADMIN) |

### Feature-based architecture

Cada feature en `src/features/<name>/` sigue la misma estructura interna:

```
feature/
├── actions/       # Server Actions (mutaciones)
├── components/    # Componentes React (server + client)
├── queries.ts     # Queries a base de datos
├── schemas.ts     # Validación Zod
├── services/      # Lógica de negocio
├── types.ts       # Tipos TypeScript
└── __tests__/     # Tests unitarios
```

## Desarrollo local

### Docker Compose

`docker-compose.yml` define un entorno multi-contenedor:

| Servicio | Imagen | Puerto | Descripción |
|----------|--------|--------|-------------|
| `devcontainer` | `nextjs/code` | — | VS Code + herramientas |
| `app` | `nextjs/app` | 3000, 9229 | Next.js dev server + debugger |
| `postgres` | `postgres:18-alpine` | 5432 | Base de datos local |
| `pnpm` | `nextjs/pnpm` | — | Instalador de dependencias |

> **Nota**: El entorno de producción usa Supabase cloud. El postgres local de Docker es solo para desarrollo sin conexión a Supabase.

### Variables de entorno

Ver `.env.example` para la lista completa. Variables clave:

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Connection string de PostgreSQL (Supabase o local) |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service_role (solo server/scripts) |
| `API_FOOTBALL_KEY` | API key para sincronización de datos |
| `NEXT_PUBLIC_SITE_URL` | URL base de la aplicación |
| `WORLD_CUP_KICKOFF` | Fecha de inicio del torneo (ISO 8601) |
