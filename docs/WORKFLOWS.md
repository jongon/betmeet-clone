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

> El seed de partidos hace **1 llamada** a football-data.org (scope `FULL`, toda la
> competición) y cae a un snapshot commiteado (`src/features/competition/seed/snapshots/`)
> si la API no está disponible. El sync incremental usa scopes acotados por estado del
> proveedor: `FIXTURES` pide `SCHEDULED,TIMED` (los partidos próximos con fecha confirmada
> llegan como `TIMED`), `LIVE_STATUS` pide `IN_PLAY,PAUSED` y `RESULTS` pide `FINISHED`.
>
> **Catch-up de eliminatorias:** solo `FIXTURES` resuelve los equipos de la siguiente ronda,
> y su cron corre 1×/día (`0 6 * * *`). Como el proveedor puede tardar horas en poblar un
> cruce tras terminar los partidos que lo alimentan (una tanda de penales conflictiva llegó a
> demorar >10h), el cron de `RESULTS` (cada 5 min) encadena una pasada de `FIXTURES` mientras
> `isKnockoutResolutionWindow()` sea verdadero (hay un partido de knockout terminado en las
> últimas 24h y otro posterior aún sin equipos). Así el emparejamiento recién resuelto aparece
> en minutos. Fuera del knockout no se activa (cero llamadas extra), es best-effort (no tumba
> la corrida de `RESULTS`) y no entra en bucle (`FIXTURES` nunca marca partidos `FINISHED`).

### Scripts de reparación puntuales

Correcciones de datos one-off (sin cambio de schema) para arreglar estado heredado de seeds o
syncs antiguos. Conviven en `scripts/repair-unit-*.ts`, son **dry-run por defecto** y escriben
solo con `--apply`:

```bash
# Previsualizar (no escribe)
npx tsx scripts/repair-unit-74-phantom-knockout-matches.ts
# Aplicar
npx tsx scripts/repair-unit-74-phantom-knockout-matches.ts --apply
```

- `repair-unit-60-duplicates-uruguay.ts` — consolida la bandera duplicada de Uruguay y
  de-duplica los partidos del 27/28 jun.
- `repair-unit-74-phantom-knockout-matches.ts` — borra los partidos fantasma de eliminatoria
  (filas con `providerMatchId = null` heredadas del bracket hardcodeado del seed original, que el
  sync por `providerMatchId` nunca limpiaba); aborta si alguna tuviera predicciones asociadas.

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

### Migraciones (CF-6)

El schema se gestiona con **migraciones Prisma versionadas** en `prisma/migrations/`:

- `20260609000000_init/` — baseline (tablas/enums/índices/FKs desde `schema.prisma`).
- `20260611120000_rls_constraints_triggers/` — RLS, policies, CHECK, índices
  parciales/compuestos, triggers y policies de Storage (requiere los schemas
  `auth`/`storage` de Supabase y el bucket `avatars`).
- `20260617120000_auth_access_token_hook/` — función `public.custom_access_token_hook`
  que inyecta los claims `email_verified` y `onboarding_completed` en el JWT, con
  grants para `supabase_auth_admin` y policy de lectura sobre `profiles`. Habilitar
  el hook es un paso de dashboard (Authentication → Hooks), no expresable en SQL.
- `20260619140000_auth_token_hook_account_deleted/` — extiende el hook anterior
  (`CREATE OR REPLACE`, idempotente) para inyectar también el claim `account_deleted`
  (`profiles.deleted_at IS NOT NULL`), usado por el proxy para bloquear cuentas
  eliminadas. No requiere paso de dashboard adicional.

```bash
npx prisma migrate deploy   # aplica migraciones pendientes (usar direct connection :5432, no el pooler :6543)
npx prisma migrate status   # estado del historial
# Generar baseline tras cambiar schema.prisma:
#   npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script > .../migration.sql
```

> **Nota**: Las antiguas migraciones SQL de `supabase/migrations/` se portaron a Prisma
> y se eliminaron del repo (su historial queda en git). El runbook de
> inicialización completo está en `aidlc-docs/operations/operations-runbook.md`.

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
DATABASE_URL="postgresql://..."          # PostgreSQL runtime connection string (pooler en prod)
DIRECT_URL="postgresql://..."            # PostgreSQL direct connection para Prisma CLI/migraciones
DB_CONNECTION_LIMIT="5"                  # Conexiones por instancia serverless (opcional; default 5)
NEXT_PUBLIC_SUPABASE_URL="https://..."   # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."      # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY="..."          # Supabase service role (solo server)
FOOTBALL_DATA_KEY="..."                  # football-data.org key (opcional)
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
WORLD_CUP_KICKOFF="2026-06-11T18:00:00Z"
NODE_ENV="development"
```

## Despliegue (Vercel + Supabase)

La app se despliega en **Vercel** (serverless) contra **Supabase** en la **misma región**
(us-east-1 / iad1). Tras un cambio de schema o de configuración de auth:

### Supabase (una vez por entorno)

1. **JWT Signing Keys asimétricas** — Authentication → JWT Keys: la clave activa debe ser
   asimétrica (ECC/ES256), no la legacy HS256. Habilita que `getClaims()` verifique el JWT
   localmente. Ver `docs/ARCHITECTURE.md` → Autenticación.
2. **Custom Access Token Hook** — Authentication → Hooks → "Customize Access Token (JWT)
   Claims": Enabled, apuntando a `public.custom_access_token_hook` (creada por la migración
   `20260617120000_auth_access_token_hook`; aplicar con `prisma migrate deploy`).
3. **Migraciones** — `npx prisma migrate deploy` (usa `DIRECT_URL` :5432, no el pooler).

> Orden: aplica la migración/hook **antes o junto** con el deploy del código, o los claims
> `email_verified`/`onboarding_completed`/`account_deleted` faltarán hasta el refresh del token.

### Vercel

| Ajuste | Dónde | Valor |
|--------|-------|-------|
| Fluid Compute | Settings → Functions | Enabled (reduce cold starts; reutiliza el pool `pg`) |
| `DB_CONNECTION_LIMIT` | Settings → Environment Variables | 5 (≤ Pool Size del pooler) |
| Node.js Version | Settings → General | 24.x (coincide con `engines.node`) |
| Región | Settings → Functions | iad1 (misma que Supabase) |

> Los cambios de env/Fluid/Node requieren un **redeploy** para aplicar.
