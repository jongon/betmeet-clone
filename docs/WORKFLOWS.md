# Workflows

## Desarrollo local

### Iniciar entorno
```bash
# 1. Construir e iniciar todos los servicios
docker compose up -d

# 2. Ver logs de pnpm (esperar a que termine install)
docker compose logs -f pnpm

# 3. Verificar que app está corriendo
docker compose logs app

# 4. Abrir VS Code en devcontainer
#    Command Palette > "Dev Containers: Reopen in Container"
```

### Debug con VS Code
```bash
# 1. En VS Code, F5 o Run > Start Debugging
# 2. Seleccionar "Next.js: debug (attach)"
# 3. El debugger se conecta a app:9229
# 4. Abrir http://localhost:3000
```

### Detener entorno
```bash
docker compose down
```

### Reconstruir imágenes
```bash
docker compose up -d --build
```

### Limpiar volúmenes
```bash
docker compose down -v
```

## Comandos útiles

### Ver estado de servicios
```bash
docker compose ps
```

### Ver logs de un servicio
```bash
docker compose logs -f app
docker compose logs -f postgres
```

### Acceder a PostgreSQL
```bash
docker compose exec postgres psql -U username -d nextjs
```

### Ver redes y volúmenes
```bash
docker network ls | grep nextjs
docker volume ls | grep nextjs
```

## Prisma

### Generar cliente
```bash
docker compose exec app npx prisma generate
```

### Migraciones
```bash
docker compose exec app npx prisma migrate dev
```

### Studio (GUI)
```bash
docker compose exec app npx prisma studio
```

## Build de imágenes individuales

```bash
# Base image
docker build -f .devcontainer/Dockerfile --target base .

# Devcontainer
docker build -f .devcontainer/Dockerfile --target devcontainer .

# App
docker build -f .devcontainer/Dockerfile --target app .

# Pnpm
docker build -f .devcontainer/Dockerfile --target pnpm .
```