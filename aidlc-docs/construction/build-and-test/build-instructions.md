# Build Instructions

## Prerequisites
- **Build Tool**: pnpm 11.5.3 · Node 24 · Next.js 16.2.6
- **Dependencies**: ver `package.json` (Next, React 19, Prisma 7, @supabase/ssr, base-ui, next-themes, content-collections, zod 4, vitest 4).
- **Environment Variables** (producción / preview):
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - `RESEND_API_KEY` (emails auth)
  - `FOOTBALL_DATA_KEY` (sync de competición vía football-data.org; sin ella el sync queda FAILED y el admin recibe aviso)
  - `WORLD_CUP_KICKOFF` (ISO 8601, opcional — congelamiento de pools/Unit 3; null ⇒ no congelado)
- **System**: cualquier OS con Node 24; sin requisitos especiales de memoria.

## Build Steps

### 1. Instalar dependencias
```bash
pnpm install
```

### 2. Generar artefactos previos
```bash
pnpm prisma:generate                 # cliente Prisma (también corre en prebuild)
pnpm exec content-collections build  # compila el MDX de reglas (también lo corre next build)
```

### 3. Build de todas las units
```bash
pnpm build
```

### 4. Verificar éxito
- **Salida esperada**: lista de rutas (○ estáticas / ƒ dinámicas) y "Proxy (Middleware)"; sin errores.
- **Artefactos**: `.next/` (build de Next), `.content-collections/generated/` (contenido compilado, gitignored).
- **Warnings aceptables**: ninguno bloqueante.

## Migraciones de base de datos (Prisma)
El esquema se gestiona con **Prisma Migrate**. Las migraciones viven en `prisma/migrations/` y
el CLI se conecta con **`DIRECT_URL`** (configurado en `prisma.config.ts`; los seeds usan
`DATABASE_URL`). Migraciones actuales:

| Migración | Contenido |
|---|---|
| `20260609000000_init` | esquema base (tablas en `public`) |
| `20260611120000_rls_constraints_triggers` | RLS, constraints y triggers (referencia `auth.*` y `storage.*`) |

> ⚠️ La 2ª migración depende de los schemas `auth` y `storage` de **Supabase**. Debe aplicarse
> contra una BD Supabase (local con `supabase start`, o el proyecto remoto). Contra un Postgres
> "pelado" falla con `schema "auth" does not exist`.

```bash
pnpm prisma:migrate          # prisma migrate deploy — aplica las pendientes
pnpm exec prisma migrate status   # ver qué falta por aplicar
```

## Seed de datos
Tras migrar, sembrar los datos por defecto (ver también `shared-infrastructure.md › Seed Scripts`):

```bash
pnpm prisma:seed:avatars       # sube el set por defecto (scripts/avatars/*.svg) a Storage + avatar_assets
pnpm prisma:seed:competition   # upsert Mundial 2026 (equipos, fases, fixtures)
pnpm prisma:seed:admin <email> # promueve un usuario a ADMIN (requiere email)
```

Atajo de extremo a extremo (migrate + generate + seeds): `pnpm prisma:db:setup`.
- `seed:avatars` es idempotente y hace **skip limpio** si `scripts/avatars/` está vacío; requiere
  `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `DATABASE_URL`.
- `seed:admin` necesita un email como argumento; corrérlo aparte (no dentro de `db:setup`).

## Troubleshooting
- **Falla por dependencias**: `pnpm install` limpio (borra `node_modules` si hay store corrupto).
- **Falla de compilación TS**: `pnpm exec tsc --noEmit` para localizar el error.
- **`content-collections` no resuelto**: correr `pnpm exec content-collections build` (genera `.content-collections/generated`).
- **Migración `P3018` / `schema "auth" does not exist`**: estás migrando contra un Postgres sin Supabase; apunta `DIRECT_URL` a Supabase.
- **Migración `P3009` (failed migration)**: hay una migración marcada como fallida; resolver con `pnpm exec prisma migrate resolve --rolled-back <nombre>` y reintentar.
