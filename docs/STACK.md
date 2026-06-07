# Stack

## Frontend
- **Framework**: Next.js 16 (App Router)
- **Lenguaje**: TypeScript
- **Package Manager**: pnpm

## Design System
- **Estilos**: Tailwind CSS v4 — configuración CSS-first, sin `tailwind.config.*`
- **UI Components**: shadcn/ui (config en `components.json`, listo para CLI)
- **Dark mode**: clase `.dark` en `<html>` via `@custom-variant`

### Componentes base

Usar shadcn/ui CLI para agregar componentes:

```bash
pnpm dlx shadcn@latest add button
```

## Herramientas de desarrollo

| Herramienta | Propósito |
|-------------|-----------|
| **Biome** | Format + lint (reemplaza Prettier) |
| **ESLint 9** | Lint de reglas Next.js + TypeScript |
| **Lefthook** | Git hooks (pre-commit, commit-msg) |
| **Commitlint + Gitmoji** | Mensajes de commit estandarizados |
| **Playwright** | Tests end-to-end |
| **tsx** | Test runner Node.js nativo |

## Backend / Database
- **Base de datos**: PostgreSQL 18 (via Docker)
- **ORM**: Prisma 7
- **Cliente**: `src/lib/prisma.ts` — singleton con pg adapter y sanitización de connection string

## Infrastructure
- **Container Runtime**: Docker + Docker Compose
- **Desarrollo**: Dev Containers (VS Code)

## Extensiones VS Code recomendadas
- Tailwind CSS IntelliSense
- ESLint
- Biome
- Prisma
- GitLens
