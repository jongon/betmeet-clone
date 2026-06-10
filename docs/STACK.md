# Stack

## Frontend
- **Framework**: Next.js 16 (App Router)
- **Lenguaje**: TypeScript 6
- **Package Manager**: pnpm

## Design System
- **Estilos**: Tailwind CSS v4 — configuración CSS-first, sin `tailwind.config.*`
- **UI Components**: shadcn/ui (base-ui/react) + class-variance-authority + tailwind-merge
- **Iconos**: lucide-react
- **Toasts**: sonner
- **Dark mode**: next-themes (clase `.dark` en `<html>` via `@custom-variant`)
- **Formularios**: react-hook-form + @hookform/resolvers + zod

### Agregar componentes shadcn/ui

```bash
pnpm dlx shadcn@latest add button
```

## Backend / Database
- **Base de datos**: PostgreSQL 18 (Supabase cloud + local Docker para desarrollo)
- **ORM**: Prisma 7 con pg adapter
- **Cliente**: `src/lib/prisma.ts` — singleton con sanitización de connection string
- **Migraciones**: SQL en `supabase/migrations/` (RLS, triggers, índices)

## Auth / Storage
- **Autenticación**: Supabase Auth (email/password, Google OAuth, MFA TOTP, passkeys WebAuthn)
- **Sesiones**: @supabase/ssr (cookies, middleware-less)
- **Storage**: Supabase Storage (avatars, banderas)
- **Passkeys**: @simplewebauthn

## Content
- **Content Collections**: MDX para reglas del juego (`content/rules/es/`)
- **Generación**: @content-collections/cli + @content-collections/mdx + @content-collections/next

## Sincronización externa
- **API-Football**: datos de equipos, fases y partidos (via API key)
- **Edge Function**: supabase/functions/competition-sync (scaffold)

## Herramientas de desarrollo

| Herramienta | Propósito |
|-------------|-----------|
| **Biome** | Format + lint (reemplaza Prettier) |
| **ESLint 9** | Lint de reglas Next.js + TypeScript |
| **Lefthook** | Git hooks (pre-commit, commit-msg) |
| **Commitlint + Gitmoji** | Mensajes de commit estandarizados |
| **Vitest** | Tests unitarios |
| **Playwright** | Tests end-to-end |
| **tsx** | Ejecución de scripts TypeScript |

## Infraestructura
- **Container Runtime**: Docker + Docker Compose
- **Desarrollo**: Dev Containers (VS Code)
- **CI/CD**: GitHub Actions (`.github/actions.yml`)

## AI Tooling
- **AI-DLC**: opencode-aidlc (workflow Idea → Proposal → Execute → Verify)
- **MCP**: Configuración generada para 8 herramientas AI (Claude, opencode, Cursor, Kiro, Kilocode, GitHub Copilot, Codex, Antigravity)
- **Chorus**: Plataforma de colaboración AI + humanos
- **Context7**: Documentación contextual para librerías

## Extensiones VS Code recomendadas
- Tailwind CSS IntelliSense
- ESLint
- Biome
- Prisma
