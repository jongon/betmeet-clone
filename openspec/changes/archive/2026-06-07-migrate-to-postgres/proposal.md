## Why

Toda la persistencia actual usa archivos JSON estáticos en `/data/` (sessions, qr-tokens, repeateds, missing, exchange-settings). Esto hace frágil la concurrencia, impide queries relacionales, y no escala. El stack ya tiene PostgreSQL 18 corriendo en Docker con `prisma` declarado como ORM en los docs, pero sin implementar. Es el momento de conectar la app a la base de datos real.

## What Changes

- Instalar Prisma CLI y `@prisma/client` como dependencias del proyecto
- Definir schema Prisma con tablas normalizadas para las 5 entidades actuales
- **BREAKING**: Reemplazar los 5 store modules (`sessions-store`, `qr-store`, `repeateds-store`, `missing-store`, `exchange-settings-store`) por operaciones Prisma en lugar de `fs.readFile`/`fs.writeFile`
- Migrar las propuestas de sesión (`SessionProposal`) a tablas relacionales (SessionProposal, ProposalBlock, Counteroffer, BlockRule) en vez de un blob JSON anidado
- Crear script de seed (`prisma/seed.ts`) a partir de los `.seed.json` actuales
- Actualizar 6 archivos de test para que usen Prisma (con base de datos de test o mock)
- Eliminar dependencia de `fs` para lectura/escritura de datos en runtime

## Capabilities

### New Capabilities

- `postgres-schema`: Schema de base de datos PostgreSQL via Prisma con modelos para Session, SessionProposal, ProposalBlock, Counteroffer, BlockRule, QRToken, RepeatedInventory, MissingInventory, ExchangeSettings, y StickerOverride
- `postgres-persistence`: Capa de persistencia que reemplaza los 5 JSON file stores con queries Prisma tipadas, manteniendo exactamente la misma interfaz pública de cada store

### Modified Capabilities

<!-- Ninguna — los requisitos de comportamiento de cada spec existente no cambian, solo la capa de persistencia (detalle de implementación) -->

## Impact

- **Dependencias nuevas**: `prisma` (dev), `@prisma/client` (prod)
- **Archivos afectados**: Los 5 store modules en `src/lib/`, sus 6 tests, `package.json`, `docker-compose.yml` (opcional: comando `prisma migrate deploy` en startup)
- **Archivos nuevos**: `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts`
- **Riesgo**: Migración `BREAKING` — los archivos JSON existentes en `/data/` dejan de ser la fuente de verdad. En desarrollo, los datos existentes se pierden salvo que se escriba un script de migración único
- **Sin cambios**: Schemas Zod de validación se mantienen; Server Actions y Server Components no cambian su lógica de negocio; Supabase Auth sigue igual
