# AGENTS.md

Plataforma web para intercambio de cromos del Mundial 2026. Coleccionistas gestionan su álbum y generan un QR; los cambiadores escanean el QR y ofrecen sus cromos.

## Setup

Después de clonar, generar los adaptadores de herramientas AI:

```bash
bash scripts/setup-agent.sh
```

Esto crea `.claude/` localmente con symlinks a `.agent/` (fuente de verdad). Ver `.agent/` para skills, workflows y config.

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
