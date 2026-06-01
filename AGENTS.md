# AGENTS.md

Plataforma web para intercambio de cromos del Mundial 2026. Coleccionistas gestionan su álbum y generan un QR; los cambiadores escanean el QR y ofrecen sus cromos.

## Setup

`.agent/` es la **fuente de verdad** para configuración de herramientas AI (skills, workflows, MCP servers). `scripts/setup-agent.sh` la traduce a los archivos consumidos por cada cliente:

- `.claude/settings.json` (Claude Code) — commiteado, funciona out-of-the-box
- `opencode.json` (opencode) — commiteado en la raíz del proyecto
- `.claude/commands/`, `.claude/skills/` — symlinks a `.agent/`
- `.opencode/commands/`, `.opencode/skills/` — symlinks a `.agent/`

**No se requiere ejecutar el script tras clonar**: los archivos generados están commiteados y `lefthook pre-commit` aborta el commit si la fuente y los generados divergen. Re-ejecutar manualmente solo si editas `.agent/`:

```bash
bash scripts/setup-agent.sh
```

### Añadir un MCP server

1. Editar `.agent/config/mcp/source.json` (entrada nueva en `servers`)
2. Si el cliente lo necesita en formato distinto a remote, añadir un case en `to_claude_entry()` dentro del script
3. Correr `bash scripts/setup-agent.sh`
4. Hacer commit de los cambios en `.claude/settings.json` y `opencode.json`

## Documentación

| Archivo | Contenido |
|---------|-----------|
| `docs/PROJECT.md` | Qué construimos, por qué, estado actual, rutas planeadas |
| `docs/STACK.md` | Stack técnico, design system, tokens, tipografía |
| `docs/ARCHITECTURE.md` | Arquitectura Docker, servicios, puertos, volúmenes, debug |
| `docs/WORKFLOWS.md` | Comandos para iniciar, detener y operar el entorno |

## Stack

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS v4 |
| UI Components | shadcn/ui |
| Base de datos | PostgreSQL 18 + Prisma |
| Deploy | Vercel + Supabase |

## Rutas actuales

| Ruta | Descripción |
|------|-------------|
| `/` | Página raíz |
| `/design-system` | Galería de componentes y tokens (dev only) |

## Convenciones

- **App Router únicamente** — nunca Pages Router
- **Tailwind v4 CSS-first** — sin `tailwind.config.*`; tokens en `src/app/globals.css`
- **Colores semánticos** — `bg-primary`, `text-brand`, etc.; nunca valores literales en componentes
- **shadcn/ui CLI** para agregar componentes; iconos via `lucide-react`
- **Context7** — consultar siempre antes de usar cualquier librería externa
- **Server Actions** para lógica de servidor; **Prisma** para DB y migraciones
- Componentes en `src/components`; alias `@/*` apunta a `src/`

## Verificaciones automatizadas

| Script | Qué valida |
|--------|------------|
| `pnpm lint` | ESLint 9 + flat config + tipado |
| `pnpm build` | Next build (TypeScript incluido) |
| `pnpm contrast` | WCAG 2.1 AA sobre tokens light/dark (`scripts/contrast-check.mjs`) |
| `pnpm check:toggle` | SSR del toggle + tokens en CSS (`scripts/check-theme-toggle.mjs`) |
| `pnpm check:toggle:browser` | Click real con Playwright, FOUC, capturas (`scripts/check-theme-toggle-browser.mjs`) |
