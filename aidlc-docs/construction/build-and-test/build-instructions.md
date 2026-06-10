# Build Instructions

## Prerequisites
- **Build Tool**: pnpm 11.5.2 · Node 24 · Next.js 16.2.6
- **Dependencies**: ver `package.json` (Next, React 19, Prisma 7, @supabase/ssr, base-ui, next-themes, content-collections, zod 4, vitest 4).
- **Environment Variables** (producción / preview):
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - `RESEND_API_KEY` (emails auth)
  - `API_FOOTBALL_KEY` (sync de competición; sin ella el sync queda FAILED y el admin recibe aviso)
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

## Migraciones de base de datos (Supabase)
Aplicar en orden (Prisma define el esquema; estas migraciones añaden RLS/constraints/triggers):
```
20260610000001_create_profiles.sql
20260610000002_create_avatar_assets.sql
20260610000003_create_profile_trigger.sql
20260610000004_storage_rls_policies.sql
20260610000005_create_pools.sql
20260610000006_create_competition_data.sql
20260610000007_create_predictions.sql
20260610000010_create_prediction_scores.sql
```

## Troubleshooting
- **Falla por dependencias**: `pnpm install` limpio (borra `node_modules` si hay store corrupto).
- **Falla de compilación TS**: `pnpm exec tsc --noEmit` para localizar el error.
- **`content-collections` no resuelto**: correr `pnpm exec content-collections build` (genera `.content-collections/generated`).
