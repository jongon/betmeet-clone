# AGENTS.md

Quiniela SaaS para el FIFA World Cup 2026 — los usuarios se registran, se unen a pools, predicen resultados de partidos y compiten en rankings con puntuación determinística.

## Funcionalidades

| Feature | Descripción |
|---------|-------------|
| **Auth** | Email/password, Google OAuth, MFA (TOTP), passkeys (WebAuthn), account linking automático email+Google |
| **Profile** | Nickname `base#discriminator`, avatar (Google photo / default set / custom upload), verificación |
| **Competition** | Fixture por fases (grupos/knockout), datos desde API-Football, estado de partidos (SCHEDULED→LIVE→FINISHED) |
| **Predictions** | Predicción de resultado exacto, editable hasta kickoff, selector de ganador en penales para knockout |
| **Pools** | Grupos públicos/privados (hasta 100 miembros), token de invitación, directorio público, expulsión pre-partido |
| **Scoring** | Puntaje determinístico: exacto 5pts, resultado 2pts, un equipo 1pt, fallo 0pt; +1 bonus penales |
| **Rankings** | Leaderboards por pool, posiciones empatadas, desempate por orden de predicción |
| **Admin** | Dashboard de sync, override manual de resultados, recálculo de puntajes, visibilidad de errores |
| **Education** | Centro de reglas (MDX via Content Collections), hints contextuales de puntuación |

## Stack técnico

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 16 App Router + TypeScript 6 |
| Estilos | Tailwind CSS v4 (CSS-first) |
| UI | shadcn/ui (base-ui) + lucide-react + sonner |
| Auth | Supabase Auth (email, Google OAuth, MFA, passkeys) |
| DB | PostgreSQL 18 (Supabase) + Prisma 7 ORM |
| Storage | Supabase Storage (avatars, banderas) |
| Forms | react-hook-form + zod |
| Content | Content Collections (MDX) |
| Sync | API-Football (adapter pattern) |

## Herramientas

| Herramienta | Uso |
|-------------|-----|
| Biome | Format + lint estilístico |
| ESLint 9 | Reglas Next.js + TypeScript |
| Vitest | Tests unitarios |
| Playwright | Tests e2e |
| Lefthook | Git hooks (pre-commit, commit-msg) |
| Commitlint + Gitmoji | Convención de commits |

## Convenciones

- **App Router únicamente** — Server Components + Server Actions, nunca Pages Router
- **Feature-based** en `src/features/<name>/` con estructura `actions/`, `components/`, `queries.ts`, `services/`, `types.ts`, `schemas.ts`, `__tests__/`
- **Tailwind v4 CSS-first** — sin `tailwind.config.*`; tokens en `src/app/globals.css`
- **Server Actions** para mutaciones; **Prisma** para DB; **Supabase** para auth/storage
- **Migraciones SQL** en `supabase/migrations/` (no se usa `prisma migrate`)
- **Context7** — consultar documentación antes de usar cualquier librería externa
- **Alias** `@/*` → `src/`

## Setup

### Requisitos previos

```bash
# Variables de entorno (copiar y completar)
cp .env.example .env
```

### Instalación

```bash
pnpm install          # Instala deps + genera MCP configs + opencode-aidlc setup
pnpm prisma:generate  # Genera cliente Prisma en src/generated/prisma
```

### Seed de datos

```bash
pnpm seed:competition                        # World Cup 2026: equipos, fases, partidos
npx tsx scripts/seed-admin.ts <user-id>      # Promover usuario a ADMIN
npx tsx scripts/seed-avatars.ts              # Avatares default en Supabase Storage
pnpm check:flags                             # Verificar banderas SVG
```

### Desarrollo

```bash
pnpm dev      # Next.js dev server en :3000
pnpm build    # Build de producción
pnpm test     # Vitest
```

## Verificaciones

| Comando | Qué valida |
|---------|------------|
| `pnpm lint` | ESLint 9 + flat config |
| `pnpm check` | Biome check (formato + lint) |
| `pnpm format` | Biome format (auto-fix) |
| `pnpm build` | Next build (incluye TypeScript) |

## MCP (AI Tools)

`.agent/config/mcp/source.json` es la fuente de verdad. `scripts/generate-mcp.mjs` genera configs para 8 herramientas:

Claude Code, opencode, Cursor, Kiro, Kilocode, GitHub Copilot, Codex, Antigravity.

```bash
node scripts/generate-mcp.mjs   # Se ejecuta en postinstall
```

Para añadir un MCP server: editar `.agent/config/mcp/source.json` → correr `generate-mcp.mjs`.

## Documentación

| Archivo | Contenido |
|---------|-----------|
| `docs/PROJECT.md` | Funcionalidades, estructura, setup completo |
| `docs/STACK.md` | Stack técnico detallado |
| `docs/ARCHITECTURE.md` | Arquitectura, capas, rutas, RLS, modelo de datos |
| `docs/WORKFLOWS.md` | Comandos, seed, Supabase, migraciones, deploy |
| `README.md` | Descripción del proyecto y quickstart |
