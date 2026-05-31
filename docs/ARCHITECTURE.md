# Architecture

## Overview

Multi-container Docker setup para desarrollo local con Next.js.

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