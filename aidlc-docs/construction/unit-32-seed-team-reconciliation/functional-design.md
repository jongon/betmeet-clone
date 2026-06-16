# Functional Design — Unit 32: Seed auto-sanador de identidad de equipos

**Épica 31 / FR-REFINE-32.1 … 32.3** · Refine post-construcción (no reinicia Units 1–31)

## 1. Problema

`upsertTeam` (`src/features/competition/services/upsert-competition-data.ts`) upserta cada equipo con
`where: { fifaCode }`. Cuando el `fifaCode` de un equipo se corrige en la lista de estructura
(`world-cup-2026.ts`) — caso Uruguay `URU→URY` (commit `a2cfb96`) — re-correr el seed **no** actualiza la
fila existente: crea una fila nueva con el código corregido y deja la vieja **huérfana**. El partido
Saudi Arabia vs Uruguay, sembrado en una corrida previa, quedó con `awayTeamId=null` y se muestra como
"Equipo por Definir", porque football-data devuelve el TLA `URY` y en BD el equipo estaba como `URU`.

**No** es un placeholder legítimo de knockout (esos son equipos aún por definir, sin fila en `teams`): es
un equipo **real** con desalineación de código entre el API y la BD.

## 2. Objetivo

El seed de estructura debe ser **auto-sanador e idempotente** ante correcciones de `fifaCode`:
actualizar el equipo en sitio y fusionar cualquier duplicado ya creado, sin script de migración aparte.
Tras un re-seed + sync, Saudi Arabia vs Uruguay debe resolver su `awayTeamId` al único Uruguay correcto.

## 3. Dominio afectado

`Team` (`prisma/schema.prisma`):
- Claves únicas: `fifaCode` (`@unique`), `providerTeamId` (`@unique`, **null** en todo el seed).
- `name` **NO** es único.
- FKs entrantes hacia `Team`:
  - `Match.homeTeamId` (relación `MatchHomeTeam`)
  - `Match.awayTeamId` (relación `MatchAwayTeam`)
  - `Match.winnerTeamId` (relación `MatchWinnerTeam`)
  - `Prediction.penaltyWinnerTeamId` (relación `PredictionPenaltyTeam`)

Un merge de equipos debe re-apuntar **las 4** antes de borrar la fila huérfana.

## 4. Diseño de la lógica

### 4.1 Reconciliación por nombre en el seed de estructura (FR-REFINE-32.1)

La reconciliación vive **solo** en el camino del seed de estructura (`seedCompetitionStructure`), **no** en el
`upsertTeam` compartido que también usa la ruta de **sync** con equipos del provider (cuyos nombres difieren
de los nuestros — cambiar el keying global a `name` crearía duplicados en la sync). Se introduce una función
dedicada `reconcileSeedTeam(team)` que usa la estructura canónica como autoridad:

```
reconcileSeedTeam(team):  // team = entrada canónica de WORLD_CUP_2026_TEAMS
  byCode = Team.findUnique(fifaCode = team.fifaCode)        // fila ya con el código canónico (si existe)
  byName = Team.findMany(name = team.name)                 // filas con ese nombre (puede haber huérfanas)
  canonical = byCode ?? primera de byName ?? null

  if canonical == null:
     create Team(team); return

  // 1) Fusionar cualquier OTRA fila que comparta el nombre canónico (huérfanos por código viejo)
  for orphan in (byName ∪ {byCode}) where orphan.id != canonical.id:
     repointTeamReferences(orphan.id -> canonical.id)
     Team.delete(orphan.id)

  // 2) Actualizar la fila canónica con los valores del seed (incluye fifaCode corregido)
  Team.update(canonical.id, { name, fifaCode, isoAlpha2, flagKey, flagPath, providerTeamId })
```

`repointTeamReferences(from, to)`:
```
Match.updateMany(homeTeamId = from -> to)
Match.updateMany(awayTeamId = from -> to)
Match.updateMany(winnerTeamId = from -> to)
Prediction.updateMany(penaltyWinnerTeamId = from -> to)
```

**Caso Uruguay (sin duplicado aún)**: `byCode(URY)=null`, `byName("Uruguay")=[fila URU]` → canonical = fila URU
→ sin huérfanos que fusionar → update fija `fifaCode=URY` en sitio. La fila se conserva, sin duplicado.

**Caso Uruguay (duplicado ya creado por una sync/seed previo)**: `byCode(URY)=[fila URY]`,
`byName=[fila URU, fila URY]` → canonical = fila URY → fusiona fila URU (re-apunta sus FKs, la borra) →
update sobre URY. Resultado: una sola fila Uruguay con `URY`.

### 4.2 Re-vinculación de partidos en la sync (FR-REFINE-32.3)

No requiere cambio: la ruta de update de `syncMatchesToDB` (`sync-orchestrator.ts`) ya recalcula
`homeTeamId/awayTeamId` resolviendo por `fifaCode` en cada corrida
(`homeTeamId: homeTeam?.id ?? null`). Una vez que 4.1 deja a Uruguay con `fifaCode=URY`, la sync resuelve
`awayFifaCode="URY"` → fila Uruguay y actualiza el partido existente. El seed corre estructura **antes** de la
sync (`seedMatchesFromFootballData` lo exige), así que un único `pnpm prisma:seed:competition` sana todo.

### 4.3 Preservación de placeholders legítimos (FR-REFINE-32.3 / Q2)

Los partidos de knockout sin equipo real **no** tienen fila en `teams`; el provider envía
`homePlaceholder/awayPlaceholder` (texto) y `fifaCode` nulo. La reconciliación solo opera sobre filas
`Team` existentes y la sync solo asigna `teamId` cuando hay equipo resoluble; por construcción, estos
placeholders conservan `teamId=null` + su texto. No se tocan.

## 5. Reglas de negocio

- **RULE-SEED-32.1**: La identidad estable de un equipo del seed de estructura es su `name`. El `fifaCode`
  es un atributo corregible que la reconciliación actualiza en sitio.
- **RULE-SEED-32.2**: Nunca debe coexistir más de una fila `Team` por `name` canónico tras el seed. Los
  duplicados se fusionan hacia la fila canónica re-apuntando todas las FKs (`Match` ×3, `Prediction` ×1).
- **RULE-SEED-32.3**: La ruta de **sync** sigue resolviendo equipos del provider por `fifaCode`; no se altera.
- **RULE-SEED-32.4**: Idempotencia — correr el seed N veces converge al mismo estado (una fila por equipo,
  códigos canónicos, FKs intactas). Sin script de datos aparte.

## 6. Escenarios / edge cases

| Escenario | Resultado esperado |
|---|---|
| Equipo nuevo (no existe) | `create` |
| Equipo existe con código correcto | `update` no-op de campos (idempotente) |
| Equipo existe con código viejo, sin duplicado | `update` corrige `fifaCode` en sitio |
| Duplicado huérfano + canónico | merge: re-apunta FKs del huérfano → borra huérfano → `update` canónico |
| Huérfano referenciado por Match/Prediction | FKs re-apuntadas antes del delete (sin violación de FK) |
| Partido knockout con placeholder | intacto (`teamId=null`, texto conservado) |

## 7. NFR / Infra — SKIP

Sin cambios de schema ni migraciones. Sin rutas nuevas. Security Baseline intacto (el seed es un script
server-side sin superficie nueva). Reutiliza Prisma client existente.

## 8. Archivos afectados (previsto)

| Archivo | Cambio |
|---|---|
| `src/features/competition/services/upsert-competition-data.ts` | `reconcileSeedTeam` + `repointTeamReferences`; `seedCompetitionStructure` usa reconcile en vez de `upsertTeam` para los equipos canónicos. `upsertTeam` (por `fifaCode`) se conserva para la sync. |
| `src/features/competition/services/__tests__/upsert-competition-data.test.ts` | Tests: rename en sitio, merge con re-apuntado de las 4 FKs, idempotencia, equipo nuevo, preservación de placeholders. |

## 9. Verificación

`pnpm prisma:generate` · `tsc --noEmit` · `pnpm check` (Biome) · `pnpm lint` · `pnpm test` (vitest, suite
nueva verde + sin regresión) · `pnpm build`.
