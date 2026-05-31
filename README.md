# Next.js Dev Container

Entorno de desarrollo local para Next.js con Docker multi-contenedor.

## Requisitos

### Opción A: Docker (Recomendado)
- Docker 24+
- Docker Compose v2
- VS Code con extensión "Dev Containers"

### Opción B: Node.js local
- Node.js 24+
- pnpm
- PostgreSQL 18 (o usar DATABASE_URL pointing a PostgreSQL)

---

## Desarrollo con Docker

### 1. Iniciar servicios

```bash
docker compose up -d
```

### 2. Esperar a que pnpm termine de instalar

```bash
docker compose logs -f pnpm
```

Cuando veas `done` o el proceso termine, las dependencias están listas.

### 3. Abrir VS Code en Dev Container

```
View > Command Palette > "Dev Containers: Reopen in Container"
```

### 4. Iniciar debugger

```
F5 > "Next.js: debug (attach)"
```

### 5. Abrir en el navegador

```
http://localhost:3000
```

### Comandos útiles

```bash
# Ver estado de servicios
docker compose ps

# Ver logs
docker compose logs -f app
docker compose logs -f postgres

# Detener
docker compose down

# Reconstruir imágenes
docker compose up -d --build

# Limpiar volúmenes
docker compose down -v
```

---

## Desarrollo con Node.js local

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Configurar variables de entorno

Crea `.env.local` o copia y ajusta `.env`:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/nextjs
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### 3. Iniciar PostgreSQL

```bash
# macOS (brew)
brew services start postgresql@18

# Linux
sudo systemctl start postgresql

# Docker
docker run -d -p 5432:5432 -v postgres_data:/var/lib/postgresql \
  -e POSTGRES_DB=nextjs -e POSTGRES_USER=username \
  -e POSTGRES_PASSWORD=password postgres:18-alpine
```

### 4. Crear base de datos

```bash
psql -h localhost -U username -d postgres -c "CREATE DATABASE nextjs;"
```

### 5. Generar cliente Prisma (si usas Prisma)

```bash
npx prisma generate
```

### 6. Iniciar servidor

```bash
pnpm dev
```

### 7. Abrir en el navegador

```
http://localhost:3000
```

### Debug local con VS Code

```json
{
  "name": "Next.js: debug local",
  "type": "node",
  "request": "launch",
  "program": "${workspaceFolder}/node_modules/.bin/next",
  "runtimeArgs": ["--inspect"],
  "skipFiles": ["<node_internals>/**"],
  "serverReadyAction": {
    "action": "openExternally",
    "pattern": "- Local:.+(https?://.+)",
    "uriFormat": "%s"
  }
}
```

---

## Troubleshooting

### `pnpm install` falla en Docker

```bash
docker compose down -v
docker compose up -d
```

### Puerto 3000 ya está en uso

Cambia el puerto en `.env`:
```env
APP_PORT=3001
```

### No puedo conectar a PostgreSQL

Verificar que PostgreSQL está corriendo y las credenciales son correctas:
```bash
docker compose exec postgres pg_isready -U username
```

### Debugger no se adjunta

1. Verificar que `app` está corriendo: `docker compose ps`
2. Verificar que el debugger escucha en `0.0.0.0:9229`: `docker port nextjs-app`

---

## Más información

- [Architecture](docs/ARCHITECTURE.md)
- [Stack](docs/STACK.md)
- [Workflows](docs/WORKFLOWS.md)