# Architecture

## Overview

Multi-container Docker setup para desarrollo local con Next.js.

## Nota Next.js 16

- Next.js 16 depreca la convención `middleware.ts`.
- Este proyecto usa `src/proxy.ts` con export `proxy` y `config.matcher`.
- El helper de Supabase para cookies de request/response permanece en `src/lib/supabase/middleware.ts` (nombre de helper interno), pero el punto de entrada del framework es `src/proxy.ts`.

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Network (nextjs)               │
│                                                         │
│  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │   devcontainer  │  │            app              │  │
│  │     :9229       │◄─┼── Debugger (attach)         │  │
│  │                 │  │                             │  │
│  │  VS Code + IDE  │  │  pnpm dev --inspect         │  │
│  │  Features       │  │  Puerto 3000 + 9229        │  │
│  └─────────────────┘  └──────────────┬─────────────┘  │
│                                        │                │
│  ┌─────────────────┐  ┌───────────────▼─────────────┐  │
│  │      pnpm       │  │          postgres            │  │
│  │  :3001 (http)    │  │                             │  │
│  │                  │  │  Puerto 5432                │  │
│  │  pnpm install    │  │  Data: /var/lib/postgresql  │  │
│  └─────────────────┘  └─────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Servicios

### devcontainer
- **Imagen**: `nextjs/code` (target: devcontainer)
- **Rol**: IDE + Debugger client
- **Puertos**: Ninguno expuesto directamente
- **Volúmenes**: Código fuente + pnpm store
- **Conexión debug**: Se adjunta a `app:9229`

### app
- **Imagen**: `nextjs/app` (target: app)
- **Rol**: Servidor de desarrollo Next.js
- **Puertos**:
  - 3000: HTTP (Next.js)
  - 9229: Debugger inspector
- **Dependencias**: postgres (healthy), pnpm (completed)
- **Variables entorno**: DATABASE_URL, NODE_ENV

### postgres
- **Imagen**: `postgres:18-alpine`
- **Rol**: Base de datos PostgreSQL
- **Puerto**: 5432
- **Volúmenes**: `nextjs-postgres:/var/lib/postgresql`
- **Healthcheck**: pg_isready

### pnpm
- **Imagen**: `nextjs/pnpm` (target: pnpm)
- **Rol**: Instalador de dependencias
- **Comportamiento**: Ejecuta `pnpm install` y termina
- **Volúmenes**: Código + pnpm store compartido

## Variables de entorno

### app service
```env
NODE_ENV=development
DATABASE_URL=postgresql://username:password@postgres:5432/nextjs
```

### postgres service
```env
POSTGRES_DB=nextjs
POSTGRES_USER=username
POSTGRES_PASSWORD=password
```

### Locales (.env)
```env
APP_PORT=3000
DEBUG_PORT=9229
FORWARD_DB_PORT=5432
DB_DATABASE=nextjs
DB_USERNAME=username
DB_PASSWORD=password
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Debugging

### Configuración VS Code

```json
{
  "name": "Next.js: debug (attach)",
  "type": "node",
  "request": "attach",
  "address": "nextjs-app",
  "port": 9229,
  "localRoot": "${workspaceFolder}",
  "remoteRoot": "/var/www/html"
}
```

### Flujo de debug
1. `docker compose up -d app postgres pnpm`
2. Esperar a que pnpm termine
3. VS Code > F5 > "Next.js: debug (attach)"
4. Navegador a http://localhost:3000

## Volúmenes

| Volumen | Descripción |
|---------|-------------|
| `nextjs-postgres` | Datos persistentes de PostgreSQL |
| `nextjs-pnpm-store` | Cache de paquetes pnpm |
| `.:/var/www/html` | Código fuente (compartido) |

## Estructura de src/

```
src/
├── app/
│   ├── globals.css             # Design system: tokens oklch, fuentes, .label-stadium
│   ├── layout.tsx              # Root layout: fuentes, ThemeProvider, Toaster
│   ├── page.tsx                # Página raíz
│   └── design-system/
│       └── page.tsx            # Galería de componentes y tokens (dev only)
├── components/
│   ├── theme-provider.tsx      # Wrapper next-themes
│   ├── theme-toggle.tsx        # Toggle light / dark / system
│   └── ui/                     # Componentes shadcn/ui instalados
└── lib/
    └── utils.ts                # Helper cn() (clsx + tailwind-merge)
```
