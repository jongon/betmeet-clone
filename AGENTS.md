# AGENTS.md

Template Next.js 16 + TypeScript + Tailwind CSS v4 con tooling de desarrollo completo.

## Setup

`.agent/` es la **fuente de verdad** para configuración MCP de herramientas AI. `scripts/setup-agent.sh` genera los archivos de configuración MCP para cada herramienta:

- `.claude/settings.json` — MCP config para Claude Code
- `.opencode/opencode.json` — MCP config para opencode

Cada herramienta AI (Claude, opencode, Cursor, Kiro) genera sus propios directorios `commands/` y `skills/` automáticamente.

**Ejecutar tras clonar** para generar la configuración MCP:

```bash
bash scripts/setup-agent.sh
```

### Configuración de opencode

opencode busca su configuración en `opencode.json` en la raíz del proyecto. Para usar `.opencode/opencode.json`, configura la variable de entorno:

```bash
export OPENCODE_CONFIG=/var/www/html/.opencode/opencode.json
```

El devcontainer ya tiene esta variable configurada en `remoteEnv`.

### Añadir un MCP server

1. Editar `.agent/config/mcp/source.json` (entrada nueva en `servers`)
2. Si el cliente lo necesita en formato distinto a remote, añadir un case en `to_claude_entry()` dentro del script
3. Correr `bash scripts/setup-agent.sh`

## Documentación

| Archivo | Contenido |
|---------|-----------|
| `docs/PROJECT.md` | Qué es este template, estructura, convenciones |
| `docs/STACK.md` | Stack técnico, herramientas, dependencias |
| `docs/ARCHITECTURE.md` | Arquitectura Docker, servicios, puertos, volúmenes |
| `docs/WORKFLOWS.md` | Comandos para iniciar, detener y operar el entorno |

## Stack

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 16 (App Router) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS v4 |
| UI Components | shadcn/ui (via CLI — `components.json` incluido) |
| Base de datos | PostgreSQL 18 + Prisma |
| Package Manager | pnpm |

## Convenciones

- **App Router únicamente** — nunca Pages Router
- **Tailwind v4 CSS-first** — sin `tailwind.config.*`; tokens en `src/app/globals.css`
- **shadcn/ui CLI** para agregar componentes; iconos via `lucide-react`
- **Context7** — consultar siempre antes de usar cualquier librería externa
- **Server Actions** para lógica de servidor; **Prisma** para DB y migraciones
- Componentes en `src/components`; alias `@/*` apunta a `src/`

## Verificaciones automatizadas

| Script | Qué valida |
|--------|------------|
| `pnpm lint` | ESLint 9 + flat config + tipado |
| `pnpm build` | Next build (TypeScript incluido) |
| `pnpm check` | Biome check (formato + lint) |
| `pnpm format` | Biome format (aplica correcciones) |
