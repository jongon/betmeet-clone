# Workflows

## Desarrollo local

### Con Docker (entorno completo)

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

### Sin Docker (desarrollo directo)

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar .env con conexión a Supabase
cp .env.example .env
# Editar .env con tus credenciales

# 3. Generar cliente Prisma
pnpm prisma:generate

# 4. Iniciar desarrollo
pnpm dev
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
docker compose down      # Detener conservando volúmenes
docker compose down -v   # Detener y eliminar volúmenes
```

### Reconstruir imágenes
```bash
docker compose up -d --build
```

## Seed de datos

```bash
# Seed de competición (World Cup 2026 — equipos, fases, grupos, partidos)
pnpm seed:competition

# Verificar que las banderas SVG existen para todos los equipos
pnpm check:flags

# Promover un usuario a ADMIN
npx tsx scripts/seed-admin.ts <user-id>

# Subir avatares default a Supabase Storage y seedear AvatarAsset
npx tsx scripts/seed-avatars.ts
```

## Comandos del proyecto

```bash
pnpm dev              # Iniciar servidor de desarrollo
pnpm build            # Build de producción
pnpm start            # Iniciar servidor de producción
pnpm lint             # ESLint
pnpm check            # Biome check (formato + lint)
pnpm format           # Biome format (aplica correcciones)
pnpm test             # Ejecutar tests con Vitest
pnpm commit           # Commit con gitmoji
```

## Prisma

```bash
pnpm prisma:generate   # Regenerar cliente Prisma en src/generated/prisma
pnpm prisma:studio     # Abrir Prisma Studio (GUI)
pnpm prisma db seed    # Ejecutar seed via prisma/seed.ts
```

> **Nota**: Las migraciones de schema se gestionan en Supabase (`supabase/migrations/`). No se usa `prisma migrate dev`. El schema de Prisma (`prisma/schema.prisma`) es la fuente de verdad para el modelo de datos pero las migraciones se aplican via Supabase CLI o dashboard.

## Supabase

### Acceder a PostgreSQL (local Docker)
```bash
docker compose exec postgres psql -U username -d nextjs
```

### Aplicar migraciones Supabase
```bash
supabase migration up          # Aplicar migraciones pendientes
supabase migration list        # Listar estado de migraciones
```

### Desplegar Edge Functions
```bash
supabase functions deploy competition-sync
```

## Variables de entorno requeridas

Copiar `.env.example` y completar:

```env
DATABASE_URL="postgresql://..."          # PostgreSQL connection string
NEXT_PUBLIC_SUPABASE_URL="https://..."   # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."      # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY="..."          # Supabase service role (solo server)
API_FOOTBALL_KEY="..."                   # API-Football key (opcional)
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
WORLD_CUP_KICKOFF="2026-06-11T18:00:00Z"
NODE_ENV="development"
```
