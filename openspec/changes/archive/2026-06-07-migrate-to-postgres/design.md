## Context

La app usa actualmente 5 archivos JSON en `/data/` como única fuente de persistencia:
`sessions.json`, `qr-tokens.json`, `repeateds.json`, `missing.json`, `exchange-settings.json`.
Cada uno se lee y escribe completo en cada operación via `fs.readFile`/`fs.writeFile` con
validación Zod, usando archivos `.seed.json` como estado inicial vacío.

El stack declara PostgreSQL 18 + Prisma como ORM. Docker Compose ya levanta `postgres:18-alpine`
con healthcheck, y el servicio `app` recibe `DATABASE_URL`. Pero Prisma no está instalado ni
configurado — la app nunca se conecta a la base de datos.

Los 5 módulos store (`sessions-store`, `qr-store`, `repeateds-store`, `missing-store`,
`exchange-settings-store`) exponen una API síncrona de lectura/escritura usada por Server
Actions y Server Components. Los tests usan `tsx --test` (Node test runner nativo) con
variables de entorno para aislar archivos.

El esquema Zod se mantiene como capa de validación en runtime; Prisma se usará solo para
persistencia y queries.

## Goals / Non-Goals

**Goals:**
- Reemplazar toda lectura/escritura de archivos JSON por queries Prisma sobre PostgreSQL
- Definir schema Prisma con modelos para las 5 entidades actuales
- Normalizar la propuesta de sesión (SessionProposal) en tablas relacionales con
  JSONB para sub-estructuras siempre leídas/escritas como unidad
- Mantener exactamente la misma API pública de cada store module (mismos parámetros,
  mismos retornos)
- Todos los tests existentes deben pasar sin cambios en su lógica de assertions
- Seed script que reproduzca el comportamiento de los `.seed.json` actuales

**Non-Goals:**
- No cambiar schemas Zod ni lógica de validación
- No migrar datos existentes de JSON a PostgreSQL (los `.seed.json` parten vacíos)
- No cambiar Server Actions, Server Components ni UI en esta etapa
- No implementar autenticación via base de datos (Supabase Auth sigue independiente)
- No añadir índices de búsqueda avanzada ni queries de analytics

## Decisions

### D1: Instalar Prisma como dependencia de proyecto

**Decisión**: Añadir `prisma` como devDependency y `@prisma/client` como dependency.

**Alternativas consideradas**:
- Usar `pg` (node-postgres) directamente → requiere escribir SQL manual y mappers;
  Prisma da type-safety, migraciones y queries tipadas out of the box.
- Usar Drizzle → buena opción pero el stack documentado dice Prisma; mantener
  consistencia con lo declarado en `docs/STACK.md`.

**Rationale**: Prisma ya está documentado como ORM del proyecto. Ofrece type-safety
para queries, migraciones declarativas, soporte nativo de JSONB, y `prisma migrate dev`
para desarrollo local.

### D2: Normalización parcial de SessionProposal

**Decisión**: Dividir la propuesta en tablas relacionales para entidades de primer nivel
y usar JSONB para sub-estructuras que siempre se leen/escriben juntas.

Modelos:
- `Session` — columnas planas (`id`, `cambiadorName`, `cambiadorId`, `offeredCount`,
  `requestedCount`, `createdAt`, `status`, `token`, `archivedAt`)
- `SessionProposal` — 1:1 con Session; columnas planas (`status`, `currentStep`,
  `flowVersion`, `updatedAt`, `submittedAt`) + JSONB para `selectedStickerCodes: string[]`
- `ProposalBlock` — 1:N con SessionProposal; columnas planas (`requestedStickerCode`,
  `requestedStickerLabel`, `requestedStickerType`, `mode`, `modeLabel`) + JSONB para
  `rule`, `fulfillRequirements`, `counteroffer`
- `RequestedRepeated` — 1:N con SessionProposal; columnas `stickerCode` y `quantity`

**Alternativas consideradas**:
- Todo JSONB (un solo campo `proposal` en Session) → simple pero pierde capacidad de
  query relacional sobre bloques y requestedRepeateds.
- Normalización completa sin JSONB (tablas separadas para FulfillRequirement,
  Counteroffer, BlockRule) → sobre-ingeniería; estas sub-estructuras nunca se
  consultan independientemente del bloque.

**Rationale**: Las queries más comunes son "obtener sesión completa con propuesta" y
"obtener sesión por token+cambiadorId". Prisma `include` resuelve ambas con una query
relacional. `fulfillRequirements`, `rule` y `counteroffer` se leen siempre con el
bloque que las contiene — JSONB evita joins innecesarios sin perder estructura.

### D3: Modelos para inventarios y configuración

**Decisión**: Usar un modelo por entidad con JSONB para la carga variable:

- `QrToken` — `token` (PK string), `ownerEmail`, `createdAt`, `revokedAt`
- `RepeatedInventory` — `ownerEmail` (unique), `updatedAt`, `items` (JSONB:
  `Record<string, number>`)
- `MissingInventory` — `ownerEmail` (unique), `updatedAt`, `items` (JSONB:
  `Record<string, true>`)
- `ExchangeSettings` — `ownerEmail` (unique), `updatedAt`, `global` (JSONB:
  ExchangeSettings), `overrides` (JSONB: `Record<string, StickerOverride>`)

**Rationale**: `items`, `global` y `overrides` son objetos de tamaño variable que
siempre se leen/escriben completos. Una tabla por entidad con el payload en JSONB
es más simple que normalizar cada clave-valor del record.

### D4: Prisma Client como singleton

**Decisión**: Crear `src/lib/prisma.ts` con un singleton `PrismaClient` siguiendo
el patrón recomendado para Next.js (evitar múltiples instancias en hot reload).

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### D5: Estrategia de testing

**Decisión**: Tests usan una base de datos PostgreSQL separada (`nextjs_test`)
con migraciones aplicadas antes de cada suite. Las variables de entorno que antes
apuntaban a archivos JSON ahora son ignoradas (los stores leen de `prisma` directamente).

**Alternativas consideradas**:
- Mock de PrismaClient → frágil, no valida queries reales ni constraints de DB.
- SQLite en memoria para tests → Prisma no soporta SQLite con JSONB, y los tipos
  de datos difieren de PostgreSQL.

**Rationale**: Usar PostgreSQL real para tests garantiza que las queries, constraints
(e.g. unique en `ownerEmail`) y tipos JSONB funcionan igual que en producción.
`docker-compose` ya tiene postgres disponible.

### D6: Variables de entorno y conexión

**Decisión**: Usar `DATABASE_URL` del `docker-compose.yml`:
`postgresql://username:password@postgres:5432/nextjs`

Para tests, `DATABASE_URL` apunta a `nextjs_test` con las mismas credenciales.

El script `prisma migrate deploy` se ejecutará como parte del entrypoint del
servicio `app` en docker-compose para aplicar migraciones pendientes al iniciar.

## Risks / Trade-offs

**[R1] Pérdida de datos en desarrollo** → Los archivos JSON existentes en `/data/`
dejan de leerse. En desarrollo, los datos actuales desaparecen. **Mitigación**: los
`.seed.json` parten vacíos por diseño; no hay datos de producción que migrar. Si se
necesita preservar datos de prueba, se puede escribir un script one-shot de migración.

**[R2] JSONB no tiene type-safety en queries** → Prisma tipa las columnas JSONB como
`JsonValue`, requiriendo casts manuales. **Mitigación**: los stores validan con Zod
después de leer de Prisma, igual que validaban después de `JSON.parse`. La capa de
type-safety está en los schemas Zod, no en Prisma.

**[R3] Conexión a BD requerida en build time** → Next.js puede ejecutar Server
Components en build time. Si la BD no está disponible, el build falla.
**Mitigación**: En Vercel, usar `@vercel/postgres` o configurar `DATABASE_URL` en
el proyecto. Para build local, docker-compose asegura que postgres esté healthy.

**[R4] Migraciones en deploy** → `prisma migrate deploy` debe correr antes de que
la app acepte tráfico. **Mitigación**: Incluir en entrypoint del contenedor `app`;
en Vercel, usar build step o webhook post-deploy.

## Open Questions

- ¿Estrategia exacta para Vercel deploy? Depende de si usamos Supabase (via
  `DATABASE_URL` de Supabase con pooler) o Vercel Postgres. Resolver al momento
  del deploy.
- ¿Seed en CI? Por ahora solo `prisma migrate dev` en local; el seed script se
  ejecuta manualmente con `prisma db seed`.
