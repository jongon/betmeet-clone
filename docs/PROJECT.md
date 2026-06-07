# PROJECT.md

## Qué es

Template para proyectos Next.js 16 con App Router, TypeScript, Tailwind CSS v4 y tooling de desarrollo completo preconfigurado.

## Qué incluye

- **Next.js 16** con App Router y TypeScript
- **Tailwind CSS v4** con configuración CSS-first
- **shadcn/ui** listo para usar (`components.json` incluido)
- **Biome** para format y lint (reemplaza Prettier + ESLint estilístico)
- **ESLint 9** con flat config y reglas de Next.js
- **Lefthook** para git hooks (pre-commit con Biome, commit-msg con commitlint)
- **Commitlint + Gitmoji** para mensajes de commit estandarizados
- **Dev Containers** con VS Code — todo listo en Docker
- **Playwright** para tests end-to-end
- **tsx** como test runner nativo de Node.js
- **PostgreSQL 18 + Prisma 7** con singleton preconfigurado y migraciones

## Estructura del proyecto

```
├── .agent/                  # Configuración MCP (fuente de verdad)
├── .devcontainer/           # VS Code Dev Container
├── .github/                 # GitHub Actions
├── .vscode/                 # VS Code debug config
├── docs/                    # Documentación
├── scripts/                 # Scripts de setup
├── src/
│   ├── app/
│   │   ├── globals.css      # Tailwind v4 + CSS tokens
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Página principal
│   ├── components/          # Componentes React
│   └── lib/
│       ├── utils.ts         # Utilidad cn() para clases
│       └── prisma.ts        # Prisma client singleton
├── prisma/
│   ├── schema.prisma        # Schema de base de datos
│   ├── seed.ts              # Seed de datos iniciales
│   └── migrations/          # Historial de migraciones
├── prisma.config.ts          # Prisma CLI config
├── biome.json               # Biome config
├── commitlint.config.mjs    # Commitlint + gitmoji
├── components.json           # shadcn/ui CLI config
├── docker-compose.yml        # Entorno Docker multi-contenedor
├── eslint.config.mjs         # ESLint 9 flat config
├── lefthook.yml              # Git hooks
├── next.config.ts            # Next.js config
├── package.json              # Dependencias y scripts
├── pnpm-lock.yaml            # Lockfile
├── pnpm-workspace.yaml       # pnpm workspace
├── postcss.config.mjs        # PostCSS + Tailwind
└── tsconfig.json             # TypeScript config
```

## Cómo usar este template

1. Clonar el repositorio
2. Copiar `.env.example` a `.env` y configurar `DATABASE_URL`
3. Ejecutar `pnpm install` (ejecuta `node scripts/generate-mcp.mjs` y `lefthook install` automáticamente)
4. Ejecutar `pnpm prisma:generate` para generar el cliente Prisma
5. Ejecutar `pnpm prisma migrate dev` para crear la base de datos
6. Iniciar desarrollo con `pnpm dev`
