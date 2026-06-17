# Unit 39 Functional Design — Unique constraint conflict en `Team.providerTeamId`

**Stage**: Functional Design (light) — refine post-construcción
**Scope**: Schema fix (DDL-only)
**Affected artifacts**: `prisma/schema.prisma` + nueva migración
**No reinicia**: Units 1–38

---

## 1. Trazabilidad

| Requisito | Historia | Descripción |
|-----------|----------|-------------|
| FR-REFINE-39.1 | US-39.1 | Remover `@unique` de `Team.providerTeamId` |
| FR-REFINE-39.2 | US-39.1 | Migración `DROP INDEX "teams_provider_team_id_key"` |
| FR-REFINE-39.3 | US-39.1 | Verificación post-migración (sync FULL sin errores) |

---

## 2. Causa Raíz

### 2.1 El problema

Al sincronizar desde `/admin`, el sync falla con:

```
Invalid `prisma.team.upsert()` invocation:
Unique constraint failed on the fields: (`provider_team_id`)
```

### 2.2 Mecanismo del fallo

1. `upsertTeam(team)` en `upsert-competition-data.ts:80` usa `where: { fifaCode }` como llave de búsqueda.
2. El modelo `Team` en `prisma/schema.prisma:236` declara `providerTeamId String? @unique`.
3. El índice único se creó en la migración inicial `20260609000000_init`: `CREATE UNIQUE INDEX "teams_provider_team_id_key" ON "teams"("provider_team_id")`.
4. `football-data.ts:113` asigna `providerTeamId = String(match.homeTeam.id)` (ID numérico del API de football-data.org).
5. Cuando el API devuelve el mismo `id` para dos equipos con distinto `fifaCode` (o tras una sync previa interrumpida que dejó `providerTeamId` asignado a un equipo y el siguiente intento de CREATE asigna el mismo ID a otro equipo), Prisma intenta un `CREATE` (porque no encuentra fila por `fifaCode`) que incluye ese `providerTeamId` ya existente → violación del unique constraint.

### 2.3 Por qué `@unique` en `providerTeamId` es innecesario

- **Cero** usos de `providerTeamId` como llave de búsqueda en todo el código (`grep findUnique.*providerTeamId` = 0).
- Todos los lookups de equipos usan `fifaCode`:
  - `sync-orchestrator.ts:35` → `prisma.team.findUnique({ where: { fifaCode: match.homeFifaCode } })`
  - `sync-orchestrator.ts:38` → `prisma.team.findUnique({ where: { fifaCode: match.awayFifaCode } })`
  - `upsert-competition-data.ts:115` → `prisma.team.findUnique({ where: { fifaCode: team.fifaCode } })`
- `providerTeamId` es metadata informacional del proveedor externo. Su valor se persiste para referencia futura pero nunca condiciona lógica de negocio.

---

## 3. Solución

### 3.1 Schema change

**Archivo**: `prisma/schema.prisma:236`

```diff
-  providerTeamId String?  @unique @map("provider_team_id") @db.VarChar(80)
+  providerTeamId String?  @map("provider_team_id") @db.VarChar(80)
```

### 3.2 Migración

La migración generada por Prisma ejecutará:

```sql
DROP INDEX IF EXISTS "teams_provider_team_id_key";
```

Sin impacto en datos existentes: el índice se elimina, las filas y sus valores se conservan intactos.

### 3.3 Sin cambios de código

| Archivo | ¿Cambia? | Motivo |
|---------|----------|--------|
| `upsert-competition-data.ts` | No | `upsertTeam` ya usa `fifaCode` como llave; la semántica no cambia |
| `sync-orchestrator.ts` | No | Los lookups de equipo son por `fifaCode` |
| `football-data.ts` | No | La extracción y enriquecimiento de equipos no depende del constraint |
| `seed-matches.ts` | No | El seed usa el mismo pipeline de sync |
| `trigger-sync.ts` | No | La acción admin solo orquesta, no toca `providerTeamId` |
| `world-cup-2026.ts` | No | El canonical data ya tiene `providerTeamId: null` |

---

## 4. NFR / Security Baseline

- **NFR**: SKIP formal. Sin impacto en performance (eliminar un índice no degrada consultas; `providerTeamId` no se consulta).
- **Security Baseline**: intacto. Cambio de modelo de datos (integridad referencial), no afecta autenticación ni autorización. Reglas SECURITY aplicables: ninguna es relevante para este cambio (sin nuevas superficies de ataque, sin cambios en gates de autorización).

---

## 5. Verificación

### 5.1 Comandos

```bash
pnpm prisma:generate          # Regenerar cliente sin @unique en providerTeamId
pnpm prisma migrate dev --name drop_provider_team_id_unique  # Crear migración
pnpm exec tsc --noEmit        # TypeScript sin errores
pnpm test                     # Suite completa de Vitest (tests existentes no asertan el índice)
pnpm build                    # Next.js build
```

### 5.2 Smoke funcional

1. Ejecutar sync scope `FULL` desde `/admin` → debe completarse sin errores.
2. Verificar que `ProviderSyncRun` registra `status: "SUCCESS"`.
3. Verificar que los partidos en `/matches` muestran equipos resueltos (sin "Equipo por definir").

### 5.3 Tests esperados

Los tests existentes que referencian `providerTeamId` (ej. `football-data.test.ts:81` → `expect(mexico?.providerTeamId).toBe("700")`, `seed-matches.test.ts:33` → `providerTeamId: "700"`) no asertan la existencia del índice único — solo validan que el valor se persiste. Deben seguir pasando sin cambios.

---

## 6. Archivos afectados

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `prisma/schema.prisma:236` | Schema | Remover `@unique` de `providerTeamId` |
| `prisma/migrations/<timestamp>_drop_provider_team_id_unique/migration.sql` | Migración (nueva) | `DROP INDEX IF EXISTS "teams_provider_team_id_key"` |
| `aidlc-docs/inception/requirements/requirements.md` | Docs | Épica 39 + FR-REFINE-39.1…39.3 |
| `aidlc-docs/inception/user-stories/stories.md` | Docs | Épica 39 + US-39.1 |
| `aidlc-docs/inception/application-design/unit-of-work.md` | Docs | Unit 39 + secuencia #25 |
| `aidlc-docs/aidlc-state.md` | Docs | Current Stage + bloque Unit 39 |
| `aidlc-docs/audit.md` | Docs | Entrada del cambio |
