# CLAUDE.md

## Instrucciones para Claude
- Siempre usar Context7 para consultar documentación actualizada antes de usar cualquier librería.

## Stack
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase (PostgreSQL)
- Prisma ORM

## Entorno
- Node.js 24+
- Package manager: pnpm
- PostgreSQL 18 (via Docker)
- Docker Compose (multi-contenedor)

## Desarrollo

### Requisitos
- Docker y Docker Compose instalados
- VS Code con extensión "Dev Containers"

### Arquitectura de contenedores

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Network (nextjs)               │
│                                                         │
│  ┌─────────────────┐  ┌─────────────────────────────┐  │
│  │   devcontainer  │  │            app              │  │
│  │                 │  │                             │  │
│  │  VS Code + IDE  │◄─│  pnpm dev --inspect=0.0.0.0│  │
│  │  + Debugger     │  │  :9229                     │  │
│  │                 │  │                             │  │
│  │  Conecta via    │  │  Puerto 3000 (HTTP)         │  │
│  │  attach a app   │  │  Puerto 9229 (Debugger)     │  │
│  └─────────────────┘  └──────────────┬─────────────┘  │
│                                        │                │
│  ┌─────────────────┐  ┌───────────────▼─────────────┐  │
│  │      pnpm       │  │          postgres            │  │
│  │                 │  │                             │  │
│  │  Instala deps   │  │  Puerto 5432 (PostgreSQL)   │  │
│  │  en volumen     │  │  Data: /var/lib/postgresql  │  │
│  └─────────────────┘  └─────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Iniciar entorno de desarrollo

```bash
# 1. Construir e iniciar todos los servicios
docker compose up -d

# 2. Esperar a que pnpm termine de instalar dependencias
#    (verificar con: docker compose logs pnpm)
docker compose logs -f pnpm

# 3. Abrir VS Code en el devcontainer
#    Menú: View > Command Palette > "Dev Containers: Reopen in Container"

# 4. En VS Code, adjuntar debugger
#    F5 > "Next.js: debug (attach)"
```

### Debug con VS Code

1. **Adjuntar al proceso en `app`**:
   - F5 > seleccionar "Next.js: debug (attach)"
   - El debugger se conecta a `nextjs-app:9229`

2. **Abrir navegador**:
   - http://localhost:3000

3. **Compounds disponibles** (opcional):
   - "Next.js: full stack (attach + Chrome)" - adjunta debugger y abre Chrome

### Variables de entorno

Ver `.env` para configuración. Las variables de Supabase se agregan cuando crees tu cuenta.

### Detener entorno

```bash
docker compose down
```

## Estructura de archivos

```
claude-test/
├── .devcontainer/
│   ├── Dockerfile          # Multi-stage: base, devcontainer, app, pnpm
│   └── devcontainer.json   # Configuración VS Code Dev Container
├── .vscode/
│   └── launch.json         # Configuración debugger (attach mode)
├── docker-compose.yml       # 4 servicios: devcontainer, app, postgres, pnpm
├── docs/
│   ├── ARCHITECTURE.md
│   ├── STACK.md
│   └── WORKFLOWS.md
├── src/
│   └── app/
│       ├── favicon.ico
│       ├── globals.css
│       ├── layout.tsx
│       └── page.tsx
├── public/
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── .env                    # Variables de entorno locales
├── CLAUDE.md
├── components.json
├── eslint.config.mjs
├── next.config.ts
├── next-env.d.ts
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── postcss.config.mjs
└── tsconfig.json
```

## Convenciones
- Usar App Router, nunca Pages Router
- Componentes en `src/components`
- Server Actions para lógica de servidor
- Prisma para ORM y migraciones de base de datos