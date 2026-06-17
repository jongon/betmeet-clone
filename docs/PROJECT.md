# Project

## Qué es

Plataforma de predicciones deportivas para torneos tipo World Cup. Los usuarios se registran, se unen a ligas, predicen resultados de partidos y compiten por puntos según la precisión de sus predicciones.

## Funcionalidades

| Feature | Descripción |
|---------|-------------|
| **Auth** | Registro/login con email/password, Google OAuth, MFA (TOTP), passkeys (WebAuthn), recuperación de contraseña, cambio de email, eliminación de cuenta |
| **Profile** | Nickname (`base#discriminator`), avatar (Google photo / default set / custom upload), estado de verificación |
| **Ligas** | Grupos públicos/privados con token de invitación, capacidad máxima, membresías |
| **Competition** | Sincronización de datos desde API-Football (equipos, fases, partidos), fixture con fases (grupos/knockout), estado de partidos |
| **Predictions** | Predicción de resultado exacto por partido, selector de ganador en penales para knockout, bloqueo al inicio del partido |
| **Scoring** | Cálculo de puntos (exacto 5pts, resultado +2pts, goles acertados +1pt c/u acumulables, fallo 0pt), rankings por liga, desempate por orden de predicción |
| **Admin** | Panel de administración, overrides manuales de resultados, trigger de sincronización, verificación de usuarios |
| **Education** | Centro de reglas (MDX via Content Collections) que explica el sistema de puntuación |

## Estructura del proyecto

```
├── .agent/                  # Configuración MCP (fuente de verdad)
├── .aidlc/                  # Reglas AI-DLC para desarrollo asistido
├── aidlc-docs/              # Documentación generada por AI-DLC
├── .devcontainer/           # VS Code Dev Container
├── .github/                 # GitHub Actions
├── content/
│   └── rules/es/            # Reglas en MDX (Content Collections)
├── docs/                    # Documentación del proyecto
├── prisma/
│   └── schema.prisma        # Schema de base de datos
├── public/
│   └── flags/               # Banderas SVG de equipos
├── scripts/                 # Scripts (seed, MCP generation, flag check)
├── src/
│   ├── app/                 # App Router (pages, layouts, API routes)
│   │   ├── globals.css      # Tailwind v4 + CSS tokens
│   │   └── api/csp-report/  # CSP violation reporting
│   ├── components/          # Componentes compartidos (providers, ui, theme)
│   ├── features/
│   │   ├── admin/           # Panel admin (acciones, queries, tipos)
│   │   ├── auth/            # Autenticación (sign-in/up, MFA, passkeys)
│   │   ├── competition/     # Competición (fixture, equipos, sync)
│   │   ├── education/       # Centro de reglas y scoring teaser
│   │   ├── pools/           # Ligas (creación, membresía, invitaciones)
│   │   ├── predictions/     # Predicciones (formulario, queries, elegibilidad)
│   │   ├── profile/         # Perfil de usuario
│   │   └── scoring/         # Puntajes y rankings
│   ├── generated/prisma/    # Prisma Client generado
│   ├── i18n/                # Internacionalización
│   ├── lib/                 # Utilidades (prisma, supabase, auth-logger)
│   └── types/               # Tipos globales
├── supabase/
│   ├── functions/           # Edge Functions (competition-sync)
│   └── migrations/          # Migraciones SQL (RLS, triggers, índices)
├── biome.json               # Biome config
├── commitlint.config.mjs    # Commitlint + gitmoji
├── components.json           # shadcn/ui CLI config
├── docker-compose.yml        # Entorno Docker multi-contenedor
├── eslint.config.mjs         # ESLint 9 flat config
├── lefthook.yml              # Git hooks
├── next.config.ts            # Next.js config (CSP, imágenes remotas)
├── package.json              # Dependencias y scripts
├── prisma.config.ts          # Prisma CLI config
├── tsconfig.json             # TypeScript config
└── vitest.config.ts          # Vitest config
```

## Setup inicial

1. Clonar el repositorio
2. Copiar `.env.example` a `.env` y configurar todas las variables
3. Ejecutar `pnpm install` (ejecuta `generate-mcp.mjs` y `opencode-aidlc setup`)
4. Ejecutar migraciones Supabase: `supabase migration up` (o aplicar manualmente en Supabase Dashboard)
5. Ejecutar `pnpm prisma:generate` para generar el cliente Prisma
6. Ejecutar seed de datos: `pnpm seed:competition`
7. Ejecutar seed de admin: `npx tsx scripts/seed-admin.ts <user-id>`
8. Ejecutar seed de avatars: `npx tsx scripts/seed-avatars.ts`
9. Iniciar desarrollo con `pnpm dev`
